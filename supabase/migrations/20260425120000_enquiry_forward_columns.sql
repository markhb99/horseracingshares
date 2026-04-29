-- Migration: 20260425120000_enquiry_forward_columns
-- Adds forward-status tracking columns to the enquiry table.

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enquiry_status') THEN
    CREATE TYPE enquiry_status AS ENUM ('received', 'forwarded', 'failed');
  END IF;
END $$;

ALTER TABLE enquiry
  ADD COLUMN IF NOT EXISTS status             enquiry_status NOT NULL DEFAULT 'received',
  ADD COLUMN IF NOT EXISTS forward_failed_at  TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS forward_error      TEXT;

UPDATE enquiry SET status = 'forwarded' WHERE forwarded_to_syndicator_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS enquiry_status_idx ON enquiry(status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS enquiry_failed_idx ON enquiry(forward_failed_at DESC)
  WHERE forward_failed_at IS NOT NULL AND deleted_at IS NULL;
