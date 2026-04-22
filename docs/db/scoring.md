# Lead scoring — horseracingshares

> **Status:** v1 (2026-04-22). Phase 2 architect spec.
> **Audience:** the builder implementing the scoring worker.
> **Scope:** how we compute `lead_score.score`, what bands mean, who sees them.

The score is a **0–100 integer** that estimates the probability a user will make a share purchase in the next 90 days. It's used to:
- Prioritise which users Regal reaches out to (band = `fire` triggers an alert in the operator console).
- Decide which users see the Regal partner-match email (only `hot` and `fire`, and only if `share_with_regal_partner_matches = true`).
- Rank enquiries in the syndicator dashboard so the highest-intent buyers surface first.

The score is **never displayed to the user**. It is visible to operators and, in aggregate form, to syndicators.

---

## 1. Inputs

All inputs are computed per user over configurable time windows.

| Signal                     | Source                            | Window  | Weight |
|---|---|---|---|
| Declared budget            | `user_profile.budget_max_cents`   | current | 15     |
| Enquiries submitted        | `enquiry` count                   | 90 days | 25     |
| Saved horses               | `view_event WHERE event_type='save'` | 30 days | 10     |
| PDS downloads              | `view_event WHERE event_type='pds_download'` | 30 days | 15     |
| Cost calculator usage      | `view_event WHERE event_type='cost_calc'`    | 30 days | 10     |
| Horse detail dwell depth   | `view_event WHERE event_type='view'` with `dwell_ms` tiered | 30 days | 15     |
| Return visit frequency     | distinct session_id count         | 30 days | 10     |
| Recency                    | days since `last_view_at`         | — | decay multiplier |

Weights sum to 100 for the base score. Recency applies a multiplier afterwards (§3).

---

## 2. Per-signal scoring

Each signal is normalised to a 0–1 value, then multiplied by its weight.

### 2.1 Declared budget

```
score_budget = clamp(budget_max_cents / 5_000_000, 0, 1)   -- $50,000 = 1.0
```

A buyer declaring $50k+ in preferences is in the top intent bracket. Lower budgets still score proportionally.

### 2.2 Enquiries submitted (90d)

```
score_enq = clamp(enquiry_count_90d / 3, 0, 1)   -- 3 enquiries = 1.0
```

### 2.3 Saved horses (30d)

```
score_save = clamp(save_count_30d / 5, 0, 1)
```

### 2.4 PDS downloads (30d)

PDS download is the single strongest product-side intent signal — reading the document is how a buyer moves from curious to serious.

```
score_pds = clamp(pds_download_count_30d / 2, 0, 1)
```

### 2.5 Cost calculator

```
score_calc = clamp(calc_count_30d / 3, 0, 1)
```

### 2.6 Horse detail dwell depth

We bucket dwell time per view event:

```
dwell_points(ms) =
  0     if ms < 10_000
  0.5   if 10_000 <= ms < 60_000
  1.0   if ms >= 60_000
```

```
score_dwell = clamp(sum(dwell_points) / 10, 0, 1)
```

### 2.7 Return visit frequency

```
distinct_sessions_30d  = count distinct session_id in view_event for user over 30d
score_return = clamp(distinct_sessions_30d / 5, 0, 1)
```

---

## 3. Final score

```
base = 15·score_budget + 25·score_enq + 10·score_save + 15·score_pds
     + 10·score_calc + 15·score_dwell + 10·score_return

recency_multiplier =
  1.0      if days_since_last_view <= 3
  0.8      if days_since_last_view <= 14
  0.5      if days_since_last_view <= 30
  0.2      otherwise

score = round(base * recency_multiplier)
```

Range: `[0, 100]`. Stored as integer.

---

## 4. Bands

| Band   | Score range | Trigger                                                                 |
|---|---|---|
| cold   | 0–24        | No active outreach. Still receives newsletter if opted in.             |
| warm   | 25–54       | Eligible for saved-search alerts and the Shortlist.                    |
| hot    | 55–79       | Eligible for Regal partner-match emails (if consented).                |
| fire   | 80–100      | Operator console shows a flag. Regal rep contacts within 48h (consent).|

Bands are computed from `score` and persisted to `lead_score.band` so queries don't have to recompute.

---

## 5. Worker cadence

Two execution paths:

### 5.1 Incremental

Triggered after each `view_event` insert (already hot path for counter maintenance — we piggyback). Updates `lead_score.last_view_at` and, if `event_type IN ('enquiry_submit','pds_download','save')`, recomputes the full score for that user. Cheap because one user's recompute is a small SQL block.

### 5.2 Nightly full rebuild

Cron at 03:00 Australia/Melbourne:
```sql
SELECT recompute_lead_score(u.id) FROM user_profile u WHERE u.deleted_at IS NULL;
```

This catches recency-multiplier decay (a user who stopped visiting moves from `1.0` to `0.8` to `0.5` to `0.2` over 30 days without any new event to trigger the incremental path).

Runs as a Supabase Edge Function on pg_cron, OR as a Fly.io worker. Decision in Phase 2 build: pg_cron if the job finishes in <60s at expected data volumes (likely for <100k users); else Fly.io.

---

## 6. `recompute_lead_score(uuid)` outline

Implemented as a single SQL function that aggregates all signals and UPSERTs `lead_score`:

```sql
CREATE OR REPLACE FUNCTION recompute_lead_score(p_user_id UUID)
RETURNS lead_score
LANGUAGE plpgsql
AS $$
DECLARE
  ...signal vars...
  new_score INTEGER;
  new_band  TEXT;
BEGIN
  -- Gather each signal window with a single CTE or per-signal query.
  -- Apply formula from §3.
  -- Compute band from §4 thresholds.
  -- UPSERT lead_score(user_id) ...
  RETURN ...;
END; $$;
```

Full implementation lands in migration `20260422120700_lead_score_function.sql` when the Phase 2 `[SONNET]` worker task ships (currently blocked on Supabase project provisioning).

---

## 7. Backtest & calibration (Phase 7+)

Once we have ≥50 share purchases attributable to Regal outreach, the weights in §1 get a pass with actual conversion data:

- Fit a logistic regression on `(signals) → purchased_within_90d`.
- Compare feature importance to the hand-picked weights.
- Adjust weights and re-baseline bands against the new distribution.

Until then, the hand-picked weights are deliberately simple — the cost of a sub-optimal score is missed outreach prioritisation, not user-visible behaviour, and we'd rather ship and iterate than over-engineer.

---

## 8. Privacy / consent interaction

- The score is computed for every user regardless of consent — it's an internal operational metric.
- Consent gates **downstream use**, not computation:
  - `marketing_email = false` → no newsletter, no Shortlist, regardless of band.
  - `share_with_regal_partner_matches = false` → `hot`/`fire` users do not enter Regal's outreach queue.
- On account deletion the `lead_score` row cascades away with `user_profile` (FK `ON DELETE CASCADE`).

---

*— architect (v1, 2026-04-22)*
