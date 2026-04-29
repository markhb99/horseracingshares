-- Migration: 20260425120100_enquiry_dedup_trigger
-- Prevents duplicate enquiries from the same user for the same horse
-- within a 7-day window.

CREATE OR REPLACE FUNCTION enforce_enquiry_dedup() RETURNS trigger AS $$
DECLARE existing_id UUID;
BEGIN
  IF NEW.user_id IS NULL THEN RETURN NEW; END IF;
  SELECT id INTO existing_id FROM enquiry
   WHERE user_id = NEW.user_id AND horse_id = NEW.horse_id
     AND deleted_at IS NULL AND created_at > now() - interval '7 days'
   LIMIT 1;
  IF existing_id IS NOT NULL THEN
    RAISE EXCEPTION 'duplicate enquiry (existing_id=%)', existing_id
      USING ERRCODE = 'unique_violation', HINT = existing_id::text;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS enquiry_dedup_trigger ON enquiry;
CREATE TRIGGER enquiry_dedup_trigger
  BEFORE INSERT ON enquiry
  FOR EACH ROW EXECUTE FUNCTION enforce_enquiry_dedup();
