-- supabase/migrations/20260425130000_update_listing_tiers.sql
-- Update tier codes and prices to match Phase 6 design system.

UPDATE listing_tier SET
  code = 'listed',
  name = 'Listed',
  price_cents_per_listing = 3900,
  price_cents_per_month = 0
WHERE code = 'basic';

UPDATE listing_tier SET
  code = 'feature',
  name = 'Feature',
  price_cents_per_listing = 7900,
  price_cents_per_month = 0
WHERE code = 'premium';

UPDATE listing_tier SET
  code = 'headline',
  name = 'Headline',
  price_cents_per_listing = 14900,
  price_cents_per_month = 0
WHERE code = 'platinum';

UPDATE listing_tier SET
  code = 'partner',
  name = 'Stable Partner',
  price_cents_per_listing = NULL,
  price_cents_per_month = 49900
WHERE code = 'partner';
