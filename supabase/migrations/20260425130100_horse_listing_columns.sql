-- supabase/migrations/20260425130100_horse_listing_columns.sql
-- Add listing management columns to horse table for Phase 6.

ALTER TABLE horse
  ADD COLUMN IF NOT EXISTS listing_tier_code  TEXT DEFAULT 'listed',
  ADD COLUMN IF NOT EXISTS stripe_payment_id  TEXT,
  ADD COLUMN IF NOT EXISTS submitted_at       TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS approved_at        TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS approved_by        UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS rejection_reason   TEXT,
  ADD COLUMN IF NOT EXISTS share_listings     JSONB DEFAULT '[]';
-- share_listings: [{pct: 2.5, price_cents: 650000, available: true}, ...]
-- Stored denormalised on the horse row for v1 simplicity.
