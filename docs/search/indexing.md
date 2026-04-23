# Search indexing strategy

> **Status:** v1 (2026-04-23). Phase 3 architect spec.
> **Audience:** the builder implementing the indexer worker + the Postgres triggers that feed it.
> **Scope:** how Postgres row changes propagate to Typesense. Collection schema is in `docs/search/typesense-schema.md`. Saved-search alerts are in `docs/search/saved-search.md`.

---

## 1. The decision

**Hybrid: outbox table + Fly.io worker (near-real-time) + nightly full-rebuild safety net.**

- Triggers on `horse`, `share_tier`, `horse_image`, `syndicator`, `trainer` enqueue work items in a `search_outbox` table.
- A long-running Fly.io worker (`@horseracingshares/indexer`) polls the outbox every 2s, claims a batch, applies each op against Typesense, marks rows processed.
- Nightly at 03:30 Australia/Melbourne (30 min after the scoring cron at 03:00 to avoid GIL-style contention), a full rebuild job re-derives every active horse's document and upserts it. Safety net for drift if the worker misses an event.

Why not the alternatives:

- **Direct pg_net / supabase_functions HTTP** from Postgres: couples the DB tier to the search tier (a Typesense outage breaks writes). Also hard to observe — the HTTP call is a black box inside a trigger.
- **Supabase database webhooks** (HTTP firehose from Postgres row changes): a reasonable fallback but retries are Supabase's job and observability is thin. Good for simple pub/sub; thin for the audit trail we want.
- **Nightly-only rebuild**: fine for content sites, wrong for a marketplace where a buyer reacts to a listing appearing within minutes. Rhownership syndicators would correctly flag "stale listings" as a dealbreaker.
- **Realtime-only (no outbox)**: loses durability — if the worker is down when an event fires, we've lost it. We already know listings and price changes matter commercially; belt-and-braces is cheap here.

The outbox is the durable source of truth. The nightly rebuild closes any remaining gap.

---

## 2. `search_outbox` table

```sql
CREATE TYPE search_op AS ENUM ('upsert', 'delete');

CREATE TABLE search_outbox (
  id             BIGSERIAL PRIMARY KEY,
  collection     TEXT NOT NULL DEFAULT 'horses' CHECK (collection = 'horses'),  -- future-proof, but one collection in v1
  document_id    UUID NOT NULL,          -- the horse.id we're pointing at
  op             search_op NOT NULL,
  reason         TEXT NOT NULL,          -- e.g. 'horse:update:status', 'share_tier:insert', 'syndicator:rename'
  enqueued_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  claimed_at     TIMESTAMPTZ,            -- worker sets this when it begins processing
  processed_at   TIMESTAMPTZ,            -- worker sets this on success
  failed_at      TIMESTAMPTZ,
  error_message  TEXT,
  attempt_count  INT NOT NULL DEFAULT 0
);

CREATE INDEX search_outbox_pending_idx
  ON search_outbox (enqueued_at)
  WHERE processed_at IS NULL AND failed_at IS NULL;

CREATE INDEX search_outbox_document_idx
  ON search_outbox (document_id, enqueued_at DESC);
```

A row is **pending** when both `processed_at` and `failed_at` are null. The partial index keeps the poll query fast.

---

## 3. Enqueue triggers

One trigger function handles all cases by inspecting `TG_TABLE_NAME` and the row's relationship to `horse`:

```sql
CREATE OR REPLACE FUNCTION enqueue_search_outbox() RETURNS trigger AS $$
DECLARE
  v_horse_id UUID;
  v_op       search_op;
  v_reason   TEXT;
BEGIN
  IF TG_TABLE_NAME = 'horse' THEN
    v_horse_id := COALESCE(NEW.id, OLD.id);
    IF TG_OP = 'INSERT' THEN
      IF NEW.status = 'active' THEN v_op := 'upsert'; v_reason := 'horse:insert:active';
      ELSE RETURN NULL;  -- drafts don't hit the index
      END IF;
    ELSIF TG_OP = 'UPDATE' THEN
      IF NEW.deleted_at IS NOT NULL OR NEW.status IN ('draft', 'pending_review', 'withdrawn') THEN
        v_op := 'delete'; v_reason := 'horse:update:' || COALESCE(NEW.status::text, 'deleted');
      ELSE
        v_op := 'upsert'; v_reason := 'horse:update:' || NEW.status::text;
      END IF;
    ELSE  -- DELETE
      v_op := 'delete'; v_reason := 'horse:delete';
    END IF;

  ELSIF TG_TABLE_NAME = 'share_tier' THEN
    v_horse_id := COALESCE(NEW.horse_id, OLD.horse_id);
    v_op := 'upsert'; v_reason := 'share_tier:' || TG_OP;

  ELSIF TG_TABLE_NAME = 'horse_image' THEN
    -- Only the hero image is in the index; ignore non-hero writes.
    IF TG_OP = 'DELETE' THEN
      IF NOT OLD.is_hero THEN RETURN NULL; END IF;
      v_horse_id := OLD.horse_id;
    ELSE
      IF NOT NEW.is_hero AND (OLD IS NULL OR NOT OLD.is_hero) THEN RETURN NULL; END IF;
      v_horse_id := NEW.horse_id;
    END IF;
    v_op := 'upsert'; v_reason := 'horse_image:' || TG_OP;

  ELSIF TG_TABLE_NAME = 'syndicator' THEN
    -- Fan out: every active horse owned by this syndicator needs a reindex.
    INSERT INTO search_outbox (document_id, op, reason)
    SELECT id, 'upsert'::search_op, 'syndicator:update'
      FROM horse
     WHERE syndicator_id = COALESCE(NEW.id, OLD.id)
       AND status = 'active'
       AND deleted_at IS NULL;
    RETURN NULL;

  ELSIF TG_TABLE_NAME = 'trainer' THEN
    INSERT INTO search_outbox (document_id, op, reason)
    SELECT id, 'upsert'::search_op, 'trainer:update'
      FROM horse
     WHERE primary_trainer_id = COALESCE(NEW.id, OLD.id)
       AND status = 'active'
       AND deleted_at IS NULL;
    RETURN NULL;

  ELSE
    RETURN NULL;
  END IF;

  INSERT INTO search_outbox (document_id, op, reason)
  VALUES (v_horse_id, v_op, v_reason);

  RETURN NULL;  -- AFTER trigger, return value ignored
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER horse_enqueue
  AFTER INSERT OR UPDATE OF status, deleted_at, pds_url, syndicator_id, primary_trainer_id, name,
                            sire, dam, dam_sire, sex, colour, foal_date,
                            location_state, location_postcode,
                            bonus_schemes, vet_xray_clear, vet_scope_clear,
                            total_shares_available, total_shares_remaining,
                            ongoing_cost_cents_per_pct_per_week, description
            OR DELETE
  ON horse
  FOR EACH ROW EXECUTE FUNCTION enqueue_search_outbox();

CREATE TRIGGER share_tier_enqueue
  AFTER INSERT OR UPDATE OR DELETE ON share_tier
  FOR EACH ROW EXECUTE FUNCTION enqueue_search_outbox();

CREATE TRIGGER horse_image_enqueue
  AFTER INSERT OR UPDATE OR DELETE ON horse_image
  FOR EACH ROW EXECUTE FUNCTION enqueue_search_outbox();

CREATE TRIGGER syndicator_enqueue
  AFTER UPDATE OF name, slug, tier ON syndicator
  FOR EACH ROW EXECUTE FUNCTION enqueue_search_outbox();

CREATE TRIGGER trainer_enqueue
  AFTER UPDATE OF name, slug ON trainer
  FOR EACH ROW EXECUTE FUNCTION enqueue_search_outbox();
```

Column list on the horse trigger is intentionally curated. Updating a horse's `view_count` doesn't need to bounce the outbox — writes to that column fire hundreds of times per browse session. It still needs to reach Typesense eventually (for sort-by-popularity) but the nightly rebuild handles it. Keeping view/enquiry counter bumps out of the hot write path matters.

---

## 4. Worker algorithm

### 4.1 Lifecycle

- Single Fly.io machine, region `syd`, size shared-cpu-1x / 256MB (cheap).
- Node runtime. Entry file: `apps/indexer/index.ts` (until the monorepo split lands, live in `/workers/indexer/` under the main repo).
- Reads `SUPABASE_SERVICE_ROLE_KEY`, `TYPESENSE_ADMIN_KEY`, `NEXT_PUBLIC_TYPESENSE_*` from Fly secrets.
- On startup: health-check Typesense; if down, exit with non-zero so Fly restarts. If the collection is missing, bail loudly — provisioning is `scripts/typesense-provision.ts`'s job, not the indexer's.

### 4.2 Poll loop

Every 2 seconds:

1. `BEGIN`; `SELECT ... FROM search_outbox WHERE processed_at IS NULL AND failed_at IS NULL ORDER BY enqueued_at ASC LIMIT 100 FOR UPDATE SKIP LOCKED;` — claim up to 100 rows.
2. If empty, sleep 2s and loop.
3. **De-duplicate** within the batch: multiple pending ops for the same `document_id` collapse to the last one (by enqueued_at). Group upserts into a single Typesense `import` call, deletes into a single `delete` with a filter query.
4. For each batched op, hit Typesense. On success, mark every contributing row `processed_at = now()`. On failure, increment `attempt_count`, set `error_message`, and if `attempt_count >= 5` set `failed_at = now()` (dead letter). Otherwise leave for retry.
5. `COMMIT`.

### 4.3 Building the document

The `upsert` path needs to materialise the full denormalised document per `docs/search/typesense-schema.md`. A single SQL projection view keeps this clean:

```sql
CREATE OR REPLACE VIEW horse_search_doc AS
SELECT
  h.id,
  h.slug,
  h.name,
  h.status::text                  AS status,
  h.sire,
  h.dam,
  h.dam_sire,
  h.sex::text                     AS sex,
  h.colour::text                  AS colour,
  to_char(h.foal_date, 'YYYY-MM-DD') AS foal_date,
  EXTRACT(YEAR FROM h.foal_date)::int AS foal_year,
  CASE
    WHEN h.foal_date IS NULL                                    THEN 'unknown'
    WHEN age(now(), h.foal_date) < interval '1 year 8 months'   THEN 'weanling'
    WHEN age(now(), h.foal_date) < interval '2 years 8 months'  THEN 'yearling'
    WHEN age(now(), h.foal_date) < interval '3 years 8 months'  THEN '2yo'
    WHEN age(now(), h.foal_date) < interval '4 years 8 months'  THEN '3yo'
    ELSE 'older'
  END                             AS age_category,
  h.location_state,
  h.location_postcode,
  h.syndicator_id::text,
  s.slug                          AS syndicator_slug,
  s.name                          AS syndicator_name,
  s.tier::text                    AS syndicator_tier,
  s.is_regal_owned,
  h.primary_trainer_id::text,
  t.name                          AS primary_trainer_name,
  COALESCE(
    (SELECT MIN(price_cents) FROM share_tier st WHERE st.horse_id = h.id AND st.available), 0
  )                               AS price_min_cents,
  COALESCE(
    (SELECT MAX(price_cents) FROM share_tier st WHERE st.horse_id = h.id AND st.available), 0
  )                               AS price_max_cents,
  -- 1% valuation: (price_cents / share_pct) for the smallest available tier
  (SELECT MIN(ROUND(price_cents / share_pct)::bigint)
     FROM share_tier st WHERE st.horse_id = h.id AND st.available)      AS price_per_pct_cents,
  CASE
    WHEN (SELECT MIN(price_cents / share_pct) FROM share_tier st WHERE st.horse_id = h.id AND st.available) < 100000  THEN 'under_1k'
    WHEN (SELECT MIN(price_cents / share_pct) FROM share_tier st WHERE st.horse_id = h.id AND st.available) < 250000  THEN '1k_2_5k'
    WHEN (SELECT MIN(price_cents / share_pct) FROM share_tier st WHERE st.horse_id = h.id AND st.available) < 500000  THEN '2_5k_5k'
    WHEN (SELECT MIN(price_cents / share_pct) FROM share_tier st WHERE st.horse_id = h.id AND st.available) < 1000000 THEN '5k_10k'
    ELSE '10k_plus'
  END                             AS price_bucket,
  (SELECT array_agg(share_pct ORDER BY share_pct)
     FROM share_tier st WHERE st.horse_id = h.id AND st.available)    AS share_pcts_available,
  h.ongoing_cost_cents_per_pct_per_week,
  h.total_shares_remaining,
  (h.total_shares_remaining <= 2.0)                                   AS has_final_shares,
  h.bonus_schemes,
  h.vet_xray_clear,
  h.vet_scope_clear,
  EXTRACT(EPOCH FROM h.created_at)::bigint   AS created_at_unix,
  EXTRACT(EPOCH FROM h.submitted_at)::bigint AS submitted_at_unix,
  h.view_count,
  h.enquiry_count,
  (SELECT storage_path FROM horse_image hi WHERE hi.horse_id = h.id AND hi.is_hero LIMIT 1) AS hero_image_path,
  h.description
FROM horse h
JOIN syndicator s ON s.id = h.syndicator_id
LEFT JOIN trainer t ON t.id = h.primary_trainer_id
WHERE h.deleted_at IS NULL;
```

The worker SELECTs from this view by id-batch. One SQL round-trip per 100 docs, which beats N+1. Typesense's import API accepts a JSONL body; the worker streams rows straight through.

### 4.4 Idempotency

Both Typesense's `import(action=upsert)` and our outbox are idempotent. Re-running a batch after a crash mid-commit produces the same result.

### 4.5 Backpressure

If the worker falls behind (`pending_count > 1000`), log a warning and page the operator via Loops (once per 5 min). The worker doesn't automatically scale — we address it by vertical resize OR by finding the offending bulk operation. A backlog > 10 000 is a code smell, not a scaling problem.

### 4.6 Observability

- `/healthz` endpoint reports: pending count, last processed id, last error timestamp, Typesense connectivity.
- Structured logs (JSON lines) piped to Fly.io logs. Include `document_id`, `reason`, `op`, `duration_ms`.
- PostHog event on each batch: `indexer.batch.processed { count, duration_ms, failures }`.

---

## 5. Nightly full rebuild

**Cron:** 03:30 Australia/Melbourne, pg_cron (if supabase-extended) OR Fly scheduled machine.

```sql
-- Single statement: enqueue every active, non-deleted horse for reindex
INSERT INTO search_outbox (document_id, op, reason)
SELECT id, 'upsert', 'nightly_rebuild'
  FROM horse
 WHERE status = 'active' AND deleted_at IS NULL;
```

The worker then drains the resulting ~N rows at its normal rate. At 30 horses this is instant; at 10 000 it's a ~5-minute drain at 100/batch.

Also nightly: **prune processed outbox rows older than 30 days**. The audit trail lives in `audit_log` for compliance; the outbox is operational.

```sql
DELETE FROM search_outbox
 WHERE processed_at < now() - interval '30 days';
```

Dead-lettered rows (`failed_at IS NOT NULL`) are kept forever and inspected manually — they indicate real bugs.

---

## 6. Initial population

First deploy: run `scripts/typesense-provision.ts` to create the collection + synonyms, then trigger the nightly rebuild SQL manually. Worker drains the outbox, Typesense lands at steady state.

Idempotent — re-running the provision script validates schema against Typesense and alters non-destructively where possible (adding a field is safe; changing a field type requires a drop-and-rebuild, which is why the script refuses silently and prompts for `--force`).

---

## 7. Failure modes

| Failure | Behaviour |
|---|---|
| Typesense 5xx | Row retry-loop up to 5 attempts (2s, 4s, 8s, 16s, 32s backoff). After 5 → dead letter. Operator alerts on dead-letter growth. |
| Typesense 4xx on a specific doc (e.g. schema mismatch) | Immediate dead letter (retry won't help). Alert. |
| Postgres down | Worker sleeps + retries indefinitely. Fly machine health check keeps it running. |
| Fly worker dies mid-batch | `FOR UPDATE SKIP LOCKED` means another replica (if any) picks up the rows. Single-replica deployments: restart reclaims the batch because `claimed_at` was never set to non-null in a committed transaction — the SELECT + mark-processed happen in the same transaction. |
| Outbox bloat (worker offline for a day) | Backlog alert + catch-up drain. Buyer-visible staleness is the cost; nightly rebuild caps total drift at 24h. |
| Migration applied live but worker not redeployed | New doc fields won't populate until the worker ships the updated view/projection. Mitigation: deploy schema + worker together; the outbox is the buffer. |

---

## 8. Security

- Only the worker (with service role) writes to Typesense. App code reads with the `NEXT_PUBLIC_TYPESENSE_SEARCH_KEY` (scope-locked to `horses` collection, `search`-only action).
- `TYPESENSE_ADMIN_KEY` lives in Fly secrets only. Never in `.env.local` of the web app.
- The scope-locked search key is generated by `scripts/typesense-provision.ts` via Typesense's "Generate scoped API key" endpoint and printed once — operator captures it into Vercel env vars.

---

## 9. Migration files to ship

1. `supabase/migrations/YYYYMMDDHHMMSS_search_outbox.sql`:
   - `CREATE TYPE search_op`.
   - `CREATE TABLE search_outbox`.
   - Partial indexes.
   - RLS enabled, policy: operator only for SELECT (`is_operator()`); service-role writes as always.
2. `supabase/migrations/YYYYMMDDHHMMSS_search_triggers.sql`:
   - `enqueue_search_outbox()` function.
   - The five triggers (horse, share_tier, horse_image, syndicator, trainer).
3. `supabase/migrations/YYYYMMDDHHMMSS_horse_search_doc_view.sql`:
   - `CREATE OR REPLACE VIEW horse_search_doc`.
   - `GRANT SELECT ON horse_search_doc TO service_role;`.

Builder generates these as numbered files next to the existing migrations.

---

## 10. Open items

- **`listen`/`notify` for sub-second latency**: not v1. 2-second poll is fine at our write rates. Revisit if p95 indexing lag becomes visible to buyers.
- **Multi-region Typesense**: not v1. Single node in `syd` matches the user base.
- **Schema evolution** (adding a field): documented in the provision script. Drop-and-rebuild (field type change) needs a runbook — add when first encountered.
- **Exactly-once delivery**: we have at-least-once via idempotent Typesense upserts. Exactly-once is theoretical overhead for the value gained.

---

*— architect (v1, 2026-04-23)*
