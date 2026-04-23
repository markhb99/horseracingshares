-- Migration: 20260423120000_search_outbox
-- Phase 3. Search outbox table + enqueue trigger function + five triggers.
-- See docs/search/indexing.md §2–3.

-- ─── Enum ────────────────────────────────────────────────────────
CREATE TYPE search_op AS ENUM ('upsert', 'delete');

-- ─── Outbox table ────────────────────────────────────────────────
CREATE TABLE search_outbox (
  id             BIGSERIAL PRIMARY KEY,
  collection     TEXT NOT NULL DEFAULT 'horses'
                   CHECK (collection = 'horses'),
  document_id    UUID NOT NULL,
  op             search_op NOT NULL,
  reason         TEXT NOT NULL,
  enqueued_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  claimed_at     TIMESTAMPTZ,
  processed_at   TIMESTAMPTZ,
  failed_at      TIMESTAMPTZ,
  error_message  TEXT,
  attempt_count  INT NOT NULL DEFAULT 0
);

-- Partial index keeps the poll query fast: only pending rows are scanned.
CREATE INDEX search_outbox_pending_idx
  ON search_outbox (enqueued_at)
  WHERE processed_at IS NULL AND failed_at IS NULL;

-- Document-centric index for de-dup and history queries.
CREATE INDEX search_outbox_document_idx
  ON search_outbox (document_id, enqueued_at DESC);

-- ─── RLS ─────────────────────────────────────────────────────────
ALTER TABLE search_outbox ENABLE ROW LEVEL SECURITY;

-- Operators can inspect the outbox; writes come from service role only.
CREATE POLICY outbox_operator_read ON search_outbox
  FOR SELECT USING (is_operator());

-- ─── Enqueue function ────────────────────────────────────────────
CREATE OR REPLACE FUNCTION enqueue_search_outbox() RETURNS trigger AS $$
DECLARE
  v_horse_id UUID;
  v_op       search_op;
  v_reason   TEXT;
BEGIN
  IF TG_TABLE_NAME = 'horse' THEN
    v_horse_id := COALESCE(NEW.id, OLD.id);

    IF TG_OP = 'INSERT' THEN
      IF NEW.status = 'active' THEN
        v_op     := 'upsert';
        v_reason := 'horse:insert:active';
      ELSE
        RETURN NULL;  -- drafts do not hit the index
      END IF;

    ELSIF TG_OP = 'UPDATE' THEN
      IF NEW.deleted_at IS NOT NULL
         OR NEW.status IN ('draft', 'pending_review', 'withdrawn') THEN
        v_op     := 'delete';
        v_reason := 'horse:update:' || COALESCE(NEW.status::text, 'deleted');
      ELSE
        v_op     := 'upsert';
        v_reason := 'horse:update:' || NEW.status::text;
      END IF;

    ELSE  -- DELETE
      v_op     := 'delete';
      v_reason := 'horse:delete';
    END IF;

  ELSIF TG_TABLE_NAME = 'share_tier' THEN
    v_horse_id := COALESCE(NEW.horse_id, OLD.horse_id);
    v_op       := 'upsert';
    v_reason   := 'share_tier:' || TG_OP;

  ELSIF TG_TABLE_NAME = 'horse_image' THEN
    -- Only the hero image is projected into the index; ignore non-hero writes.
    IF TG_OP = 'DELETE' THEN
      IF NOT OLD.is_hero THEN RETURN NULL; END IF;
      v_horse_id := OLD.horse_id;
    ELSE
      IF NOT NEW.is_hero AND (OLD IS NULL OR NOT OLD.is_hero) THEN
        RETURN NULL;
      END IF;
      v_horse_id := NEW.horse_id;
    END IF;
    v_op     := 'upsert';
    v_reason := 'horse_image:' || TG_OP;

  ELSIF TG_TABLE_NAME = 'syndicator' THEN
    -- Fan-out: every active horse owned by this syndicator needs a reindex.
    INSERT INTO search_outbox (document_id, op, reason)
    SELECT id, 'upsert'::search_op, 'syndicator:update'
      FROM horse
     WHERE syndicator_id = COALESCE(NEW.id, OLD.id)
       AND status = 'active'
       AND deleted_at IS NULL;
    RETURN NULL;

  ELSIF TG_TABLE_NAME = 'trainer' THEN
    -- Fan-out: every active horse with this primary trainer needs a reindex.
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

  RETURN NULL;  -- AFTER trigger; return value is ignored
END;
$$ LANGUAGE plpgsql;

-- ─── Triggers ────────────────────────────────────────────────────

-- Horse: column list is intentionally curated.
-- view_count / enquiry_count / wishlist_count are excluded — counter bumps
-- are high-frequency writes; the nightly rebuild keeps Typesense in sync.
CREATE TRIGGER horse_enqueue
  AFTER INSERT OR UPDATE OF
    status, deleted_at, pds_url, syndicator_id, primary_trainer_id,
    name, sire, dam, dam_sire, sex, colour, foal_date,
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
