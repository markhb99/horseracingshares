export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { Client as TypesenseClient } from 'typesense';
import { createServerClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';

function getTypesenseClient() {
  return new TypesenseClient({
    nodes: [{
      host: process.env.TYPESENSE_HOST ?? '159.13.51.164',
      port: Number(process.env.TYPESENSE_PORT ?? 8108),
      protocol: process.env.TYPESENSE_PROTOCOL ?? 'http',
    }],
    apiKey: process.env.TYPESENSE_API_KEY ?? '',
    connectionTimeoutSeconds: 5,
  });
}

const bodySchema = z.object({
  reason: z.string().trim().max(500).optional(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });

  const { data: profile } = await supabase
    .from('user_profile')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'operator') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  let body: z.infer<typeof bodySchema> = {};
  try {
    body = bodySchema.parse(await req.json());
  } catch {
    // body is optional — proceed with empty reason
  }

  const db = createServiceClient();

  const { data: horse } = await db
    .from('horse')
    .select('id, status')
    .eq('id', id)
    .is('deleted_at', null)
    .single();

  if (!horse) return NextResponse.json({ error: 'Horse not found' }, { status: 404 });

  if (horse.status === 'withdrawn') {
    return NextResponse.json({ error: 'Already withdrawn' }, { status: 400 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (db as any)
    .from('horse')
    .update({
      status: 'withdrawn',
      withdrawn_at: new Date().toISOString(),
      withdrawal_reason: body.reason || null,
    })
    .eq('id', id);

  if (error) {
    console.error('Withdraw error:', error);
    return NextResponse.json({ error: 'Failed to withdraw' }, { status: 500 });
  }

  // Immediately remove from Typesense so the horse disappears from browse without
  // waiting for the cron to process the search_outbox delete entry.
  try {
    await getTypesenseClient().collections('horses').documents(id).delete();
  } catch {
    // Not in index yet, or Typesense unreachable — outbox will clean up.
  }

  return NextResponse.json({ ok: true });
}
