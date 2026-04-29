export const runtime = 'nodejs';
export const maxDuration = 300;

import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import { recomputeLeadScoreFor } from '@/lib/scoring/recompute';

function isAuthorised(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return request.headers.get('authorization') === `Bearer ${secret}`;
}

export async function GET(request: NextRequest) {
  if (!isAuthorised(request)) {
    return new Response('Unauthorized', { status: 401 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createServiceClient() as any;

  // Target users who have had any activity in the last 60 days:
  // - submitted an enquiry, OR
  // - have a view_event, OR
  // - have a saved search
  // We union the sets to get a deduplicated list of user_ids.
  const sixtyDaysAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString();

  const [enquiryRes, viewRes, searchRes] = await Promise.all([
    supabase
      .from('enquiry')
      .select('user_id')
      .gte('created_at', sixtyDaysAgo)
      .is('deleted_at', null)
      .not('user_id', 'is', null),
    supabase
      .from('view_event')
      .select('user_id')
      .gte('occurred_at', sixtyDaysAgo)
      .not('user_id', 'is', null),
    supabase
      .from('saved_search')
      .select('user_id')
      .is('deleted_at', null),
  ]);

  const userIds = new Set<string>();
  for (const row of enquiryRes.data ?? []) if (row.user_id) userIds.add(row.user_id);
  for (const row of viewRes.data ?? []) if (row.user_id) userIds.add(row.user_id);
  for (const row of searchRes.data ?? []) if (row.user_id) userIds.add(row.user_id);

  if (userIds.size === 0) {
    return NextResponse.json({ processed: 0, errors: 0, skipped: 0 });
  }

  let processed = 0;
  let errors = 0;

  // Process sequentially to avoid hammering Supabase with parallel queries
  for (const userId of userIds) {
    try {
      await recomputeLeadScoreFor(userId);
      processed++;
    } catch (err) {
      errors++;
      console.error(`[recompute-scores] failed for ${userId}:`, err);
    }
  }

  console.log(`[recompute-scores] done — processed: ${processed}, errors: ${errors}, total: ${userIds.size}`);

  return NextResponse.json({ processed, errors, total: userIds.size });
}
