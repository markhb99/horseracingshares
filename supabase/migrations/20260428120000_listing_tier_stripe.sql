-- Migration: 20260428120000_listing_tier_stripe
-- Adds stripe_price_id column to listing_tier for per-listing checkout.
-- Also resets tier codes/prices to the Phase 6 checkout spec:
--   basic ($14900), premium ($29900), elite ($49900), partner ($0).
-- Idempotent: uses IF NOT EXISTS and ON CONFLICT DO UPDATE.

ALTER TABLE listing_tier
  ADD COLUMN IF NOT EXISTS stripe_price_id TEXT;

-- Upsert the four checkout tiers.
-- ON CONFLICT (code) DO UPDATE so repeated runs are safe.
INSERT INTO listing_tier (code, name, price_cents_per_month, price_cents_per_listing, max_active_horses, features_json, is_active)
VALUES
  (
    'basic',
    'Basic',
    0,
    14900,
    NULL,
    jsonb_build_object(
      'photos_max',           1,
      'placement',            'standard',
      'featured_badge',       false,
      'homepage_feature',     false,
      'buyer_email_campaign', false,
      'duration_days',        90
    ),
    true
  ),
  (
    'premium',
    'Premium',
    0,
    29900,
    NULL,
    jsonb_build_object(
      'photos_max',           10,
      'placement',            'priority',
      'featured_badge',       true,
      'homepage_feature',     false,
      'buyer_email_campaign', false,
      'duration_days',        90
    ),
    true
  ),
  (
    'elite',
    'Elite',
    0,
    49900,
    NULL,
    jsonb_build_object(
      'photos_max',           null,
      'placement',            'homepage',
      'featured_badge',       true,
      'homepage_feature',     true,
      'buyer_email_campaign', true,
      'duration_days',        90
    ),
    true
  ),
  (
    'partner',
    'Partner',
    0,
    0,
    NULL,
    jsonb_build_object(
      'photos_max',           null,
      'placement',            'homepage',
      'featured_badge',       true,
      'homepage_feature',     true,
      'buyer_email_campaign', true,
      'regal_owned',          true,
      'duration_days',        90
    ),
    true
  )
ON CONFLICT (code) DO UPDATE SET
  name                  = EXCLUDED.name,
  price_cents_per_month = EXCLUDED.price_cents_per_month,
  price_cents_per_listing = EXCLUDED.price_cents_per_listing,
  features_json         = EXCLUDED.features_json,
  is_active             = EXCLUDED.is_active;

-- RLS: listing_tier is read-only for authenticated users; operators can write.
-- The table likely has no RLS policy yet — add a permissive SELECT policy.
ALTER TABLE listing_tier ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'listing_tier' AND policyname = 'listing_tier_public_select'
  ) THEN
    EXECUTE $pol$
      CREATE POLICY listing_tier_public_select ON listing_tier
        FOR SELECT USING (is_active = true)
    $pol$;
  END IF;
END;
$$;
