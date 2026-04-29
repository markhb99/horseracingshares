export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createServerClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';

const bodySchema = z.object({
  afsl_number: z.string().trim().min(1, 'AFSL number is required').max(20),
  afsl_verified_at: z.string().datetime({ offset: true }).optional(),
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

  let body: z.infer<typeof bodySchema>;
  try {
    body = bodySchema.parse(await req.json());
  } catch (err) {
    return NextResponse.json({ error: 'Invalid request', details: err }, { status: 422 });
  }

  const db = createServiceClient();

  const { data: syndicator } = await db
    .from('syndicator')
    .select('id, name')
    .eq('id', id)
    .is('deleted_at', null)
    .single();

  if (!syndicator) {
    return NextResponse.json({ error: 'Syndicator not found' }, { status: 404 });
  }

  const verifiedAt = body.afsl_verified_at ?? new Date().toISOString();

  const { error } = await db
    .from('syndicator')
    .update({
      afsl_number: body.afsl_number,
      afsl_status: 'verified',
      afsl_verified_at: verifiedAt,
      afsl_verified_by: user.id,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);

  if (error) {
    console.error('AFSL verify error:', error);
    return NextResponse.json({ error: 'Failed to verify AFSL' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
