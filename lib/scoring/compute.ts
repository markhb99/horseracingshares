/**
 * Lead-score computation — pure TypeScript implementation.
 *
 * Source of truth: docs/db/scoring.md
 * The production SQL function recompute_lead_score() in
 * supabase/migrations/20260422120700_lead_score_function.sql (Phase 2,
 * pending Supabase project provisioning) must implement the identical
 * formula. When that migration ships, keep it in sync with this file.
 *
 * This module has zero runtime dependencies and no side effects — safe
 * to import in any server or worker context.
 */

export interface LeadScoreSignals {
  /** user_profile.budget_max_cents — current value, may be null */
  budgetMaxCents: number | null;
  /** COUNT of enquiry rows submitted in the last 90 days */
  enquiryCount90d: number;
  /** COUNT of view_event WHERE event_type='save' in last 30 days */
  saveCount30d: number;
  /** COUNT of view_event WHERE event_type='pds_download' in last 30 days */
  pdsDownloadCount30d: number;
  /** COUNT of view_event WHERE event_type='cost_calc' in last 30 days */
  costCalcCount30d: number;
  /** view_event WHERE event_type='view' rows in last 30 days, each with dwell_ms (may be null) */
  dwellEvents30d: Array<{ dwellMs: number | null }>;
  /** COUNT distinct session_id in view_event for user over last 30 days */
  distinctSessions30d: number;
  /** Days since last view_event.occurred_at — used for recency decay */
  daysSinceLastView: number;
}

export type LeadBand = 'cold' | 'warm' | 'hot' | 'fire';

export interface LeadScoreResult {
  score: number;
  band: LeadBand;
}

// ─── helpers ─────────────────────────────────────────────────────────────────

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/**
 * Per-event dwell bucketing.
 * <10 000 ms → 0
 * 10 000–59 999 ms → 0.5
 * ≥60 000 ms → 1.0
 * See docs/db/scoring.md §2.6.
 */
function dwellPoints(dwellMs: number | null): number {
  if (dwellMs === null || dwellMs < 10_000) return 0;
  if (dwellMs < 60_000) return 0.5;
  return 1.0;
}

// ─── main export ─────────────────────────────────────────────────────────────

/**
 * Compute a 0–100 lead score plus band from the provided signals.
 *
 * Formula per docs/db/scoring.md §§2–3:
 *   base = 15·score_budget + 25·score_enq + 10·score_save + 15·score_pds
 *        + 10·score_calc + 15·score_dwell + 10·score_return
 *   score = round(base × recency_multiplier), clamped 0..100
 */
export function computeLeadScore(signals: LeadScoreSignals): LeadScoreResult {
  // ── per-signal normalised values (each clamped 0..1) ──────────────────────

  // §2.1 Declared budget: $50 000 = 1.0
  const scoreBudget = clamp(
    (signals.budgetMaxCents ?? 0) / 5_000_000,
    0,
    1,
  );

  // §2.2 Enquiries submitted (90d): 3 = 1.0
  const scoreEnq = clamp(signals.enquiryCount90d / 3, 0, 1);

  // §2.3 Saved horses (30d): 5 = 1.0
  const scoreSave = clamp(signals.saveCount30d / 5, 0, 1);

  // §2.4 PDS downloads (30d): 2 = 1.0
  const scorePds = clamp(signals.pdsDownloadCount30d / 2, 0, 1);

  // §2.5 Cost calculator (30d): 3 = 1.0
  const scoreCalc = clamp(signals.costCalcCount30d / 3, 0, 1);

  // §2.6 Horse detail dwell depth
  const dwellSum = signals.dwellEvents30d.reduce(
    (acc, ev) => acc + dwellPoints(ev.dwellMs),
    0,
  );
  const scoreDwell = clamp(dwellSum / 10, 0, 1);

  // §2.7 Return visit frequency: 5 sessions = 1.0
  const scoreReturn = clamp(signals.distinctSessions30d / 5, 0, 1);

  // ── base score (weights sum to 100) ───────────────────────────────────────
  const base =
    15 * scoreBudget +
    25 * scoreEnq +
    10 * scoreSave +
    15 * scorePds +
    10 * scoreCalc +
    15 * scoreDwell +
    10 * scoreReturn;

  // ── recency multiplier §3 ─────────────────────────────────────────────────
  const d = signals.daysSinceLastView;
  let recency: number;
  if (d <= 3) recency = 1.0;
  else if (d <= 14) recency = 0.8;
  else if (d <= 30) recency = 0.5;
  else recency = 0.2;

  // ── final score (rounded integer, 0..100) ─────────────────────────────────
  const score = clamp(Math.round(base * recency), 0, 100);

  // ── band §4 ───────────────────────────────────────────────────────────────
  let band: LeadBand;
  if (score >= 80) band = 'fire';
  else if (score >= 55) band = 'hot';
  else if (score >= 25) band = 'warm';
  else band = 'cold';

  return { score, band };
}
