-- Migration: 20260422120300_triggers_and_functions
-- Phase 2. updated_at maintenance, audit_log population, counter maintenance,
-- share-tier → horse.total_shares_remaining recomputation, consent helpers.
-- See docs/db/schema.md §6, §7.
-- AFSL/PDS gate triggers live in 20260422120500_afsl_gate.sql.

-- ─── updated_at bumper ───────────────────────────────────────
CREATE OR REPLACE FUNCTION bump_updated_at() RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER bump_user_profile_updated_at  BEFORE UPDATE ON user_profile  FOR EACH ROW EXECUTE FUNCTION bump_updated_at();
CREATE TRIGGER bump_syndicator_updated_at    BEFORE UPDATE ON syndicator    FOR EACH ROW EXECUTE FUNCTION bump_updated_at();
CREATE TRIGGER bump_trainer_updated_at       BEFORE UPDATE ON trainer       FOR EACH ROW EXECUTE FUNCTION bump_updated_at();
CREATE TRIGGER bump_horse_updated_at         BEFORE UPDATE ON horse         FOR EACH ROW EXECUTE FUNCTION bump_updated_at();
CREATE TRIGGER bump_saved_search_updated_at  BEFORE UPDATE ON saved_search  FOR EACH ROW EXECUTE FUNCTION bump_updated_at();
CREATE TRIGGER bump_subscription_updated_at  BEFORE UPDATE ON subscription  FOR EACH ROW EXECUTE FUNCTION bump_updated_at();

-- ─── audit_log population (compliance-critical tables) ───────
CREATE OR REPLACE FUNCTION write_audit() RETURNS trigger AS $$
DECLARE
  reason TEXT;
BEGIN
  reason := current_setting('app.change_reason', true);   -- optional; set by caller via SET LOCAL

  IF TG_OP = 'DELETE' THEN
    INSERT INTO audit_log (table_name, row_id, action, changed_by, change_reason, old_row, new_row)
    VALUES (TG_TABLE_NAME, OLD.id, 'DELETE', auth.uid(), reason, to_jsonb(OLD), NULL);
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO audit_log (table_name, row_id, action, changed_by, change_reason, old_row, new_row)
    VALUES (TG_TABLE_NAME, NEW.id, 'UPDATE', auth.uid(), reason, to_jsonb(OLD), to_jsonb(NEW));
    RETURN NEW;
  ELSE
    INSERT INTO audit_log (table_name, row_id, action, changed_by, change_reason, old_row, new_row)
    VALUES (TG_TABLE_NAME, NEW.id, 'INSERT', auth.uid(), reason, NULL, to_jsonb(NEW));
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER audit_syndicator AFTER INSERT OR UPDATE OR DELETE ON syndicator FOR EACH ROW EXECUTE FUNCTION write_audit();
CREATE TRIGGER audit_horse      AFTER INSERT OR UPDATE OR DELETE ON horse      FOR EACH ROW EXECUTE FUNCTION write_audit();
CREATE TRIGGER audit_enquiry    AFTER INSERT OR UPDATE OR DELETE ON enquiry    FOR EACH ROW EXECUTE FUNCTION write_audit();

-- ─── horse.total_shares_remaining maintenance ────────────────
CREATE OR REPLACE FUNCTION recompute_horse_shares_remaining() RETURNS trigger AS $$
DECLARE
  target_horse UUID;
  sold_pct NUMERIC(5,2);
  total_pct NUMERIC(5,2);
BEGIN
  target_horse := COALESCE(NEW.horse_id, OLD.horse_id);

  SELECT COALESCE(SUM(share_pct), 0)
    INTO sold_pct
    FROM share_tier
   WHERE horse_id = target_horse
     AND available = false;

  SELECT total_shares_available INTO total_pct FROM horse WHERE id = target_horse;

  UPDATE horse
     SET total_shares_remaining = GREATEST(0, total_pct - sold_pct)
   WHERE id = target_horse;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER share_tier_remaining AFTER INSERT OR UPDATE OR DELETE ON share_tier
  FOR EACH ROW EXECUTE FUNCTION recompute_horse_shares_remaining();

-- ─── horse counter maintenance (enquiry_count, wishlist_count, view_count) ───
CREATE OR REPLACE FUNCTION bump_horse_enquiry_count() RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE horse SET enquiry_count = enquiry_count + 1 WHERE id = NEW.horse_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE horse SET enquiry_count = GREATEST(0, enquiry_count - 1) WHERE id = OLD.horse_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER horse_enquiry_count AFTER INSERT OR DELETE ON enquiry
  FOR EACH ROW EXECUTE FUNCTION bump_horse_enquiry_count();

-- view_event → horse.view_count + lead_score.last_view_at touch
CREATE OR REPLACE FUNCTION bump_horse_view_count() RETURNS trigger AS $$
BEGIN
  IF NEW.event_type = 'view' AND NEW.horse_id IS NOT NULL THEN
    UPDATE horse SET view_count = view_count + 1 WHERE id = NEW.horse_id;
  END IF;
  IF NEW.event_type = 'save' AND NEW.horse_id IS NOT NULL THEN
    UPDATE horse SET wishlist_count = wishlist_count + 1 WHERE id = NEW.horse_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER horse_view_count AFTER INSERT ON view_event
  FOR EACH ROW EXECUTE FUNCTION bump_horse_view_count();

-- ─── consent helpers ─────────────────────────────────────────
CREATE OR REPLACE FUNCTION current_consent(p_user_id UUID)
RETURNS TABLE(consent_type TEXT, granted BOOLEAN, granted_at TIMESTAMPTZ)
LANGUAGE sql STABLE AS $$
  SELECT DISTINCT ON (consent_type) consent_type, granted, created_at
    FROM consent_ledger
   WHERE user_id = p_user_id
   ORDER BY consent_type, created_at DESC;
$$;

CREATE OR REPLACE FUNCTION record_consent(
  p_user_id      UUID,
  p_consent_type TEXT,
  p_granted      BOOLEAN,
  p_source       TEXT,
  p_ip           INET DEFAULT NULL,
  p_user_agent   TEXT DEFAULT NULL
) RETURNS UUID
LANGUAGE plpgsql AS $$
DECLARE new_id UUID;
BEGIN
  INSERT INTO consent_ledger (user_id, consent_type, granted, source, ip_address, user_agent)
  VALUES (p_user_id, p_consent_type, p_granted, p_source, p_ip, p_user_agent)
  RETURNING id INTO new_id;
  RETURN new_id;
END;
$$;
