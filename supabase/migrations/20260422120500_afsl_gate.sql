-- Migration: 20260422120500_afsl_gate
-- Phase 2. THE compliance-critical gate.
--
-- Invariant (CLAUDE.md, non-negotiable):
--   A horse row may have status = 'active' only if
--     - its syndicator has afsl_status = 'verified'
--         AND afsl_number IS NOT NULL
--         AND afsl_verified_at IS NOT NULL,
--     - the horse itself has pds_url IS NOT NULL.
--
-- Postgres CHECK constraints cannot cross tables, so this enforcement
-- lives in triggers. This is belt #1 of three (see docs/db/schema.md §4):
--   belt #1 — these triggers (DB-level, cannot be bypassed)
--   belt #2 — the API route (zod validation + service guard, clean 422)
--   belt #3 — the submission form (disable submit until prerequisites met)
-- See docs/db/schema.md §4 for the full enforcement story.

-- ─── horse active-status gate ────────────────────────────────
CREATE OR REPLACE FUNCTION enforce_horse_active_gate() RETURNS trigger AS $$
DECLARE
  s syndicator%ROWTYPE;
BEGIN
  IF NEW.status = 'active' THEN
    IF NEW.pds_url IS NULL THEN
      RAISE EXCEPTION 'horse.status=active requires pds_url'
        USING ERRCODE = 'check_violation',
              HINT = 'Upload a Product Disclosure Statement before activating.';
    END IF;

    SELECT * INTO s
      FROM syndicator
     WHERE id = NEW.syndicator_id
       AND deleted_at IS NULL;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'horse.syndicator_id % not found or soft-deleted', NEW.syndicator_id
        USING ERRCODE = 'foreign_key_violation';
    END IF;

    IF s.afsl_number IS NULL
       OR s.afsl_status <> 'verified'
       OR s.afsl_verified_at IS NULL THEN
      RAISE EXCEPTION
        'horse.status=active requires syndicator % to be AFSL-verified (afsl_number, afsl_verified_at, afsl_status=verified)',
        NEW.syndicator_id
        USING ERRCODE = 'check_violation',
              HINT = 'Operator must verify the syndicator''s AFSL before any of their horses can go active.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Guard every path that could land a row at status='active'.
CREATE TRIGGER horse_active_gate_insert
  BEFORE INSERT ON horse
  FOR EACH ROW
  WHEN (NEW.status = 'active')
  EXECUTE FUNCTION enforce_horse_active_gate();

CREATE TRIGGER horse_active_gate_update
  BEFORE UPDATE OF status, pds_url, syndicator_id ON horse
  FOR EACH ROW
  WHEN (NEW.status = 'active')
  EXECUTE FUNCTION enforce_horse_active_gate();

-- ─── cascade: syndicator leaves 'verified' → demote active horses ───
CREATE OR REPLACE FUNCTION syndicator_afsl_cascade() RETURNS trigger AS $$
BEGIN
  IF OLD.afsl_status = 'verified' AND NEW.afsl_status <> 'verified' THEN
    UPDATE horse
       SET status = 'pending_review',
           updated_at = now()
     WHERE syndicator_id = NEW.id
       AND status = 'active';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER syndicator_afsl_cascade_t
  AFTER UPDATE OF afsl_status ON syndicator
  FOR EACH ROW
  EXECUTE FUNCTION syndicator_afsl_cascade();

-- ─── re-verify AFSL on material change ──────────────────────
-- An admin who edits afsl_number or afsl_verified_at forces the
-- syndicator back to 'pending' — an operator must re-verify before
-- any horses can go active again. The cascade trigger above then
-- demotes any currently-active horses to pending_review.
CREATE OR REPLACE FUNCTION syndicator_afsl_reverify_on_change() RETURNS trigger AS $$
BEGIN
  IF auth.uid() IS NOT NULL
     AND (SELECT role FROM user_profile WHERE id = auth.uid()) <> 'operator' THEN
    IF NEW.afsl_number      IS DISTINCT FROM OLD.afsl_number
    OR NEW.afsl_verified_at IS DISTINCT FROM OLD.afsl_verified_at THEN
      NEW.afsl_status := 'pending';
      NEW.afsl_verified_at := NULL;
      NEW.afsl_verified_by := NULL;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER syndicator_afsl_reverify
  BEFORE UPDATE OF afsl_number, afsl_verified_at ON syndicator
  FOR EACH ROW EXECUTE FUNCTION syndicator_afsl_reverify_on_change();

-- ─── guard: consent_ledger is append-only ────────────────────
CREATE OR REPLACE FUNCTION consent_ledger_append_only() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'consent_ledger is append-only; % not allowed', TG_OP
    USING ERRCODE = 'insufficient_privilege';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER consent_ledger_no_update
  BEFORE UPDATE ON consent_ledger
  FOR EACH ROW EXECUTE FUNCTION consent_ledger_append_only();

CREATE TRIGGER consent_ledger_no_delete
  BEFORE DELETE ON consent_ledger
  FOR EACH ROW EXECUTE FUNCTION consent_ledger_append_only();
