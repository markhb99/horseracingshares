export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';

export async function POST(
  _req: NextRequest,
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

  const db = createServiceClient();

  const { data: horse } = await db
    .from('horse')
    .select('id, status, pds_url, syndicator_id')
    .eq('id', id)
    .single();

  if (!horse) return NextResponse.json({ error: 'Horse not found' }, { status: 404 });

  if (horse.status !== 'pending_review') {
    return NextResponse.json({ error: 'Horse is not pending review' }, { status: 400 });
  }

  if (!horse.pds_url) {
    return NextResponse.json({ error: 'PDS URL is required before approval' }, { status: 400 });
  }

  const { data: syndicator } = await db
    .from('syndicator')
    .select('afsl_status')
    .eq('id', horse.syndicator_id)
    .single();

  if (syndicator?.afsl_status !== 'verified') {
    return NextResponse.json(
      { error: 'Syndicator AFSL must be verified before approval' },
      { status: 400 },
    );
  }

  const { error } = await db
    .from('horse')
    .update({
      status: 'active',
      approved_at: new Date().toISOString(),
      approved_by: user.id,
      rejection_reason: null,
    })
    .eq('id', id);

  if (error) {
    console.error('Approve error:', error);
    return NextResponse.json({ error: 'Failed to approve' }, { status: 500 });
  }

  // The horse_enqueue trigger fires on status → active and inserts into search_outbox automatically.
  return NextResponse.json({ ok: true });
}
