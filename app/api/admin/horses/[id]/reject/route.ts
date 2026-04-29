export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createServerClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import { resend, FROM } from '@/lib/email/resend';

const bodySchema = z.object({
  reason: z.string().trim().min(1).max(500),
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
  } catch {
    return NextResponse.json({ error: 'reason is required (max 500 chars)' }, { status: 422 });
  }

  const db = createServiceClient();

  const { data: horse } = await db
    .from('horse')
    .select('id, status, sire, dam, name, syndicator_id')
    .eq('id', id)
    .single();

  if (!horse) return NextResponse.json({ error: 'Horse not found' }, { status: 404 });

  if (horse.status !== 'pending_review') {
    return NextResponse.json({ error: 'Horse is not pending review' }, { status: 400 });
  }

  const { error } = await db
    .from('horse')
    .update({ status: 'draft', rejection_reason: body.reason })
    .eq('id', id);

  if (error) {
    console.error('Reject error:', error);
    return NextResponse.json({ error: 'Failed to reject' }, { status: 500 });
  }

  const { data: syndicator } = await db
    .from('syndicator')
    .select('contact_email, name')
    .eq('id', horse.syndicator_id)
    .single();

  if (syndicator?.contact_email) {
    const horseName = horse.name ?? `${horse.sire} × ${horse.dam}`;
    try {
      await resend.emails.send({
        from: FROM,
        to: syndicator.contact_email,
        subject: `Your listing "${horseName}" was not approved`,
        text: [
          `Hi ${syndicator.name},`,
          '',
          `Your listing for ${horseName} was not approved by our moderation team.`,
          '',
          `Reason: ${body.reason}`,
          '',
          `Please update your listing and resubmit: ${process.env.NEXT_PUBLIC_SITE_URL}/list/submit`,
          '',
          `If you have any questions, contact us at listings@horseracingshares.com`,
        ].join('\n'),
      });
    } catch (emailErr) {
      console.error('Rejection email failed:', emailErr);
    }
  }

  return NextResponse.json({ ok: true });
}
