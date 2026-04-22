-- Migration: 20260422120600_seed_listing_tiers
-- Phase 2. Seed the listing-fee catalog. Prices are PLACEHOLDERS
-- pending operator commercial decisions; listings stay idempotent
-- via ON CONFLICT (code) DO NOTHING so a real pricing migration
-- later can UPDATE these rows without clashing.

INSERT INTO listing_tier (code, name, price_cents_per_month, price_cents_per_listing, max_active_horses, features_json)
VALUES
  (
    'basic',
    'Basic',
    4900,                 -- $49.00/mo  (placeholder)
    NULL,
    2,
    jsonb_build_object(
      'hero_image',        true,
      'gallery_max',       6,
      'video',             false,
      'featured_placement', false,
      'saved_search_priority', false
    )
  ),
  (
    'premium',
    'Premium',
    9900,                 -- $99.00/mo  (placeholder)
    NULL,
    8,
    jsonb_build_object(
      'hero_image',        true,
      'gallery_max',       15,
      'video',             true,
      'featured_placement', false,
      'saved_search_priority', true
    )
  ),
  (
    'platinum',
    'Platinum',
    19900,                -- $199.00/mo (placeholder)
    NULL,
    NULL,                 -- unlimited
    jsonb_build_object(
      'hero_image',        true,
      'gallery_max',       30,
      'video',             true,
      'featured_placement', true,
      'saved_search_priority', true,
      'editorial_feature_slots_per_quarter', 1
    )
  ),
  (
    'partner',
    'Partner (Regal Bloodstock)',
    0,                    -- Regal's own listings: no revenue; tiebreak favouring disclosed in /about and /legal
    NULL,
    NULL,
    jsonb_build_object(
      'hero_image',        true,
      'gallery_max',       30,
      'video',             true,
      'featured_placement', true,
      'saved_search_priority', true,
      'regal_owned',       true
    )
  )
ON CONFLICT (code) DO NOTHING;
