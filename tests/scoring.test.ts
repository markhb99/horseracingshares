/**
 * Lead-score unit tests.
 * All tests are pure — no DB, no network.
 * Formula source of truth: docs/db/scoring.md §§2–3.
 */

import { describe, it, expect } from 'vitest';
import { computeLeadScore, type LeadScoreSignals } from '@/lib/scoring/compute';

// Convenience: all-zero signals with a fresh recency (daysSinceLastView=0)
const ZERO_SIGNALS: LeadScoreSignals = {
  budgetMaxCents: null,
  enquiryCount90d: 0,
  saveCount30d: 0,
  pdsDownloadCount30d: 0,
  costCalcCount30d: 0,
  dwellEvents30d: [],
  distinctSessions30d: 0,
  daysSinceLastView: 0,
};

// Max-out fresh signals (every signal at its 1.0 normalisation threshold)
const MAX_FRESH_SIGNALS: LeadScoreSignals = {
  budgetMaxCents: 5_000_000, // $50 000
  enquiryCount90d: 3,
  saveCount30d: 5,
  pdsDownloadCount30d: 2,
  costCalcCount30d: 3,
  dwellEvents30d: Array.from({ length: 10 }, () => ({ dwellMs: 60_000 })), // 10 × 1.0 = 10 / 10 = 1.0
  distinctSessions30d: 5,
  daysSinceLastView: 0, // recency = 1.0
};

describe('computeLeadScore', () => {
  // ── zero-base cases ─────────────────────────────────────────────────────

  it('all-zero signals → score 0, band cold', () => {
    const result = computeLeadScore(ZERO_SIGNALS);
    expect(result.score).toBe(0);
    expect(result.band).toBe('cold');
  });

  // ── max-out fresh ────────────────────────────────────────────────────────

  it('max-out fresh user → score 100, band fire', () => {
    const result = computeLeadScore(MAX_FRESH_SIGNALS);
    expect(result.score).toBe(100);
    expect(result.band).toBe('fire');
  });

  // ── single-signal isolation ──────────────────────────────────────────────

  it('only budgetMaxCents=5_000_000, daysSinceLastView=0 → score 15, band cold', () => {
    // base = 15×1.0 = 15, recency = 1.0, score = 15
    const result = computeLeadScore({
      ...ZERO_SIGNALS,
      budgetMaxCents: 5_000_000,
      daysSinceLastView: 0,
    });
    expect(result.score).toBe(15);
    expect(result.band).toBe('cold');
  });

  // ── recency decay ────────────────────────────────────────────────────────

  it('max-out fresh but daysSinceLastView=31 → score 20, band cold', () => {
    // base = 100, recency = 0.2 (>30d), score = round(100 * 0.2) = 20
    const result = computeLeadScore({
      ...MAX_FRESH_SIGNALS,
      daysSinceLastView: 31,
    });
    expect(result.score).toBe(20);
    expect(result.band).toBe('cold');
  });

  // ── budget signal clamp ──────────────────────────────────────────────────

  it('budgetMaxCents=10_000_000 caps at 1.0 on budget signal', () => {
    // Score with 10M should equal score with 5M (both clamp to 1.0)
    const resultAt10M = computeLeadScore({
      ...ZERO_SIGNALS,
      budgetMaxCents: 10_000_000,
    });
    const resultAt5M = computeLeadScore({
      ...ZERO_SIGNALS,
      budgetMaxCents: 5_000_000,
    });
    expect(resultAt10M.score).toBe(resultAt5M.score);
    expect(resultAt10M.score).toBe(15); // 15 × 1.0 × 1.0 recency = 15
  });

  // ── dwell bucketing ──────────────────────────────────────────────────────

  it('dwell events [5s, 30s, 120s] contribute 15 × (1.5/10) = 2.25 → 2 after round', () => {
    // dwell_points: 5 000ms → 0, 30 000ms → 0.5, 120 000ms → 1.0  → sum=1.5
    // score_dwell = clamp(1.5/10, 0, 1) = 0.15
    // base = 15 × 0.15 = 2.25
    // recency = 1.0 (daysSinceLastView=0)
    // score = round(2.25) = 2
    const result = computeLeadScore({
      ...ZERO_SIGNALS,
      dwellEvents30d: [
        { dwellMs: 5_000 },   // 0 points
        { dwellMs: 30_000 },  // 0.5 points
        { dwellMs: 120_000 }, // 1.0 points
      ],
      daysSinceLastView: 0,
    });
    expect(result.score).toBe(2);
    expect(result.band).toBe('cold');
  });

  it('dwell event with null dwellMs counts as 0 points', () => {
    const result = computeLeadScore({
      ...ZERO_SIGNALS,
      dwellEvents30d: [{ dwellMs: null }],
    });
    expect(result.score).toBe(0);
  });

  // ── band boundary cases ──────────────────────────────────────────────────

  it('score 24 → band cold', () => {
    // Need base that rounds to 24 with recency 1.0.
    // enquiryCount90d=0, budget = 24/15 * 5_000_000 = 8_000_000 → clamped to 5_000_000 = 15
    // Use pds: 2×download → 15pts, budget → 15pts = 30... need 24 exactly.
    // Simplest: manually verified — use enquiry signal only.
    // score_enq = clamp(n/3, 0, 1). We want base = 24.
    // 25 × (n/3) = 24 → n = 2.88 (not integer).
    // Try: budget=5_000_000 → 15, plus some partial signals.
    // 15 (budget) + 9 = 24. score_enq contribution: 25×(1/3) = 8.33...
    // Let's try budget+dwell: 15 + 9 (dwell = clamp(6/10,0,1) = 0.6 → 15×0.6=9) → 24.
    // dwell sum 6 = 6 events at ≥60s each.
    const result = computeLeadScore({
      ...ZERO_SIGNALS,
      budgetMaxCents: 5_000_000,
      dwellEvents30d: Array.from({ length: 6 }, () => ({ dwellMs: 60_000 })),
      daysSinceLastView: 0,
    });
    expect(result.score).toBe(24);
    expect(result.band).toBe('cold');
  });

  it('score 25 → band warm', () => {
    // 15 (budget) + 10 (dwell=10/10×15=15... wait: 15×1.0=15 not 10)
    // Try: budget=5_000_000 → 15, enq=1 → 25*(1/3)=8.33 → 23.33 not enough.
    // budget=5_000_000 → 15pts, save=5 → 10pts = 25. Recency 1.0.
    const result = computeLeadScore({
      ...ZERO_SIGNALS,
      budgetMaxCents: 5_000_000,
      saveCount30d: 5,
      daysSinceLastView: 0,
    });
    expect(result.score).toBe(25);
    expect(result.band).toBe('warm');
  });

  it('score 54 → band warm', () => {
    // Need base=54 with recency 1.0.
    // budget=5M → 15, enq=3 → 25, save=5 → 10 = 50. Need 4 more.
    // calc=3 → 10pts. 50+10=60, too many.
    // budget=5M(15) + enq=3(25) + pds=0.93×15=14 = 54? pds = 54-40=14, score_pds=14/15=0.933 → count=1.87 → 2 downloads is 15pts.
    // budget(15)+enq(25)+save(14/10=1.4→clamped to1.0→10)+pds(0) = 50. Still need 4.
    // pds=1 download → clamp(1/2,0,1)=0.5 → 0.5×15=7.5 → 50+7.5=57.5 too much.
    // budget(15)+enq(25)+save(3/5=0.6→6)+pds(1→7.5)=53.5→round=54. Yes.
    const result = computeLeadScore({
      ...ZERO_SIGNALS,
      budgetMaxCents: 5_000_000,
      enquiryCount90d: 3,
      saveCount30d: 3,
      pdsDownloadCount30d: 1,
      daysSinceLastView: 0,
    });
    expect(result.score).toBe(54);
    expect(result.band).toBe('warm');
  });

  it('score 55 → band hot', () => {
    // budget(15)+enq(25)+save(3→6)+pds(1→7.5)+calc(1→10/3×10=3.33)=56.83→57? Let me compute.
    // budget(15)+enq(25)+save(10)+pds(7.5)=57.5 → round=58. Overshoot.
    // budget(15)+enq(25)+save(1→2)+pds(1→7.5)+calc(1→3.33)=52.83→53. Undershoot.
    // budget(15)+enq(25)+save(3→6)+pds(1→7.5)+calc(0)+dwell([]→0)+return(0) = 53.5 → 54.
    // budget(15)+enq(25)+save(5→10)+pds(0)+calc(1→3.33) = 53.33 → 53.
    // budget(15)+enq(25)+save(5→10)+pds(0)+calc(1→3.33)+dwell([60s]→1.5) = 54.83 → 55. YES.
    const result = computeLeadScore({
      ...ZERO_SIGNALS,
      budgetMaxCents: 5_000_000,
      enquiryCount90d: 3,
      saveCount30d: 5,
      costCalcCount30d: 1,
      dwellEvents30d: [{ dwellMs: 60_000 }],
      daysSinceLastView: 0,
    });
    expect(result.score).toBe(55);
    expect(result.band).toBe('hot');
  });

  it('score 79 → band hot', () => {
    // budget(15)+enq(25)+save(10)+pds(15)+calc(10)+dwell(0)+return(0) = 75. recency 1.0 → 75.
    // Need 79. Add dwell: score_dwell = (75→79 needs 4 more via dwell).
    // 15*score_dwell = 4 → score_dwell = 0.267 → sum = 2.67 events?
    // Easier: budget(15)+enq(25)+save(10)+pds(15)+calc(10)+return(10/5×10=4)=79. return signal: return=2 → 2/5=0.4 → 0.4×10=4. 15+25+10+15+10+4=79. Yes!
    const result = computeLeadScore({
      ...ZERO_SIGNALS,
      budgetMaxCents: 5_000_000,
      enquiryCount90d: 3,
      saveCount30d: 5,
      pdsDownloadCount30d: 2,
      costCalcCount30d: 3,
      distinctSessions30d: 2,
      daysSinceLastView: 0,
    });
    expect(result.score).toBe(79);
    expect(result.band).toBe('hot');
  });

  it('score 80 → band fire', () => {
    // 15+25+10+15+10+4+15×score_dwell = 79 + 15×score_dwell.
    // Need 79 + x = 80 → x = 1. 15×score_dwell = 1 → score_dwell = 0.0667 → dwell_sum = 0.667.
    // Not achievable with integers (0.5 per event). Let's try different combination.
    // budget(15)+enq(25)+save(10)+pds(15)+calc(10)+return(5/5×10=10)+dwell(1event×0.5=0.5/10=0.05→0.75) = 85.75.
    // Simpler: just use distinctSessions=3 and no dwell.
    // 15+25+10+15+10+0+3/5×10 = 75+6 = 81→ too much.
    // budget(15)+enq(25)+save(5→10)+pds(15)+calc(10)+return(1→2)+dwell([50ms,50ms,50ms → 0 each]) = 77. Still not 80.
    // Let me do it cleanly:
    // budget(15)+enq(25)+save(10)+pds(15)+calc(10)+return(0)+dwell(10events×0.5=5→5/10=0.5→0.5×15=7.5)=82.5→83. Too much.
    // budget(15)+enq(25)+save(10)+pds(15)+calc(10)+return(1→2)+dwell(0)=77.
    // Need exactly 80. budget(15)+enq(25)+save(10)+pds(15)+return(5→10)+calc(0)+dwell([60s→1/10=0.1→1.5])=76.5→77.
    // How about daysSinceLastView=14 (recency 0.8)?
    // budget(15)+enq(25)+save(10)+pds(15)+calc(10)+return(10)+dwell(15) = 100, ×0.8=80. Yes!
    const result = computeLeadScore({
      ...MAX_FRESH_SIGNALS,
      daysSinceLastView: 14,
    });
    expect(result.score).toBe(80);
    expect(result.band).toBe('fire');
  });

  // ── recency boundary checks ──────────────────────────────────────────────

  it('daysSinceLastView=3 uses multiplier 1.0', () => {
    const result = computeLeadScore({
      ...ZERO_SIGNALS,
      budgetMaxCents: 5_000_000,
      daysSinceLastView: 3,
    });
    expect(result.score).toBe(15); // 15 × 1.0
  });

  it('daysSinceLastView=4 uses multiplier 0.8', () => {
    const result = computeLeadScore({
      ...ZERO_SIGNALS,
      budgetMaxCents: 5_000_000,
      daysSinceLastView: 4,
    });
    expect(result.score).toBe(12); // round(15 × 0.8) = 12
  });

  it('daysSinceLastView=14 uses multiplier 0.8', () => {
    const result = computeLeadScore({
      ...ZERO_SIGNALS,
      budgetMaxCents: 5_000_000,
      daysSinceLastView: 14,
    });
    expect(result.score).toBe(12); // round(15 × 0.8) = 12
  });

  it('daysSinceLastView=15 uses multiplier 0.5', () => {
    const result = computeLeadScore({
      ...ZERO_SIGNALS,
      budgetMaxCents: 5_000_000,
      daysSinceLastView: 15,
    });
    expect(result.score).toBe(8); // round(15 × 0.5) = 8 (7.5 rounds to 8)
  });

  it('daysSinceLastView=30 uses multiplier 0.5', () => {
    const result = computeLeadScore({
      ...ZERO_SIGNALS,
      budgetMaxCents: 5_000_000,
      daysSinceLastView: 30,
    });
    expect(result.score).toBe(8); // round(15 × 0.5) = 8
  });

  it('daysSinceLastView=31 uses multiplier 0.2', () => {
    const result = computeLeadScore({
      ...ZERO_SIGNALS,
      budgetMaxCents: 5_000_000,
      daysSinceLastView: 31,
    });
    expect(result.score).toBe(3); // round(15 × 0.2) = 3
  });
});
