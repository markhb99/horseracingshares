/**
 * Recomputes and persists the lead score for a given user.
 * Called from API route after-hooks (next/server `after()`).
 * Queries are defensive: if a table/function doesn't exist yet
 * (non-production env), fallback values are used rather than throwing.
 */

import { createServiceClient } from '@/lib/supabase/service';
import { computeLeadScore } from '@/lib/scoring/compute';

export async function recomputeLeadScoreFor(userId: string): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createServiceClient() as any;

  // ── 1. User profile (budget) ─────────────────────────────────────────────
  let budgetMaxCents: number | null = null;
  try {
    const { data: profile } = await supabase
      .from('user_profile')
      .select('budget_max_cents')
      .eq('id', userId)
      .single();
    budgetMaxCents = profile?.budget_max_cents ?? null;
  } catch {
    // Non-fatal
  }

  // ── 2. Enquiry count last 90 days ────────────────────────────────────────
  let enquiryCount90d = 0;
  try {
    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
    const { count } = await supabase
      .from('enquiry')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('created_at', ninetyDaysAgo)
      .is('deleted_at', null);
    enquiryCount90d = count ?? 0;
  } catch {
    // Non-fatal
  }

  // ── 3. View events (last 30 days) ────────────────────────────────────────
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  let saveCount30d = 0;
  let pdsDownloadCount30d = 0;
  let costCalcCount30d = 0;
  let dwellEvents30d: Array<{ dwellMs: number | null }> = [];
  let daysSinceLastView = 999;

  try {
    const { data: viewEvents } = await supabase
      .from('view_event')
      .select('event_type, dwell_ms, occurred_at')
      .eq('user_id', userId)
      .gte('occurred_at', thirtyDaysAgo);

    if (viewEvents) {
      const rows = viewEvents as Array<{
        event_type: string;
        dwell_ms: number | null;
        occurred_at: string;
      }>;

      for (const row of rows) {
        if (row.event_type === 'save') saveCount30d++;
        if (row.event_type === 'pds_download') pdsDownloadCount30d++;
        if (row.event_type === 'cost_calc') costCalcCount30d++;
        if (row.event_type === 'view') {
          dwellEvents30d.push({ dwellMs: row.dwell_ms ?? null });
        }
      }

      // Recency: find most recent occurred_at across all event types
      const sorted = [...rows].sort(
        (a, b) =>
          new Date(b.occurred_at).getTime() - new Date(a.occurred_at).getTime(),
      );
      if (sorted.length > 0) {
        const lastMs = new Date(sorted[0].occurred_at).getTime();
        daysSinceLastView = Math.floor(
          (Date.now() - lastMs) / (24 * 60 * 60 * 1000),
        );
      }
    }
  } catch {
    // view_event table may not exist in this env — use defaults
  }

  // ── 4. Distinct sessions RPC ─────────────────────────────────────────────
  let distinctSessions30d = 0;
  try {
    const { data: sessionsData } = await supabase.rpc(
      'distinct_sessions_30d',
      { p_user_id: userId },
    );
    if (typeof sessionsData === 'number') {
      distinctSessions30d = sessionsData;
    }
  } catch {
    // Function not yet deployed in this env
  }

  // ── 5. Compute score ─────────────────────────────────────────────────────
  const { score, band } = computeLeadScore({
    budgetMaxCents,
    enquiryCount90d,
    saveCount30d,
    pdsDownloadCount30d,
    costCalcCount30d,
    dwellEvents30d,
    distinctSessions30d,
    daysSinceLastView,
  });

  // ── 6. Upsert lead_score row ─────────────────────────────────────────────
  // The lead_score table is defined in schema §3.12 (may or may not exist in
  // early envs). Wrap in try/catch so a missing table doesn't crash the route.
  try {
    await supabase
      .from('lead_score')
      .upsert(
        {
          user_id: userId,
          score,
          band,
          computed_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' },
      );
  } catch {
    // lead_score table not yet available — silently skip
  }
}
