-- supabase/seed.sql
-- Dev seed data: 3 trainers, 5 syndicators, 30 horses, share tiers,
-- horse images, horse_trainer links.
-- Idempotent: ON CONFLICT ... DO NOTHING throughout.
-- DO NOT run against production. Architect must review before applying.
--
-- AFSL gate compliance:
--   All 5 syndicators have afsl_status='verified', afsl_number IS NOT NULL,
--   afsl_verified_at IS NOT NULL. All 30 horses have status='active' and
--   pds_url IS NOT NULL. The 3-layer gate will pass.

-- ─────────────────────────────────────────────────────────────────────────────
-- TRAINERS (3)
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO trainer (slug, name, stable_name, state, location)
VALUES
  ('ciaron-maher', 'Ciaron Maher', 'Maher & Eustace Racing', 'VIC', 'Caulfield'),
  ('chris-waller', 'Chris Waller', 'Chris Waller Racing', 'NSW', 'Rosehill'),
  ('annabel-neasham', 'Annabel Neasham', 'Neasham Racing', 'NSW', 'Warwick Farm')
ON CONFLICT (slug) DO NOTHING;

-- ─────────────────────────────────────────────────────────────────────────────
-- SYNDICATORS (5)
-- All verified. One is_regal_owned = true (Regal Bloodstock — the platform
-- operator). Mix of tier levels.
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO syndicator (
  slug, name, abn, afsl_number, afsl_status, afsl_verified_at,
  tier, contact_name, contact_email, contact_phone,
  website_url, about, is_regal_owned
)
VALUES
  (
    'regal-bloodstock',
    'Regal Bloodstock',
    '12345678901',
    '000001',
    'verified',
    now(),
    'partner',
    'James Regal',
    'james@regalbloodstock.example.com',
    '+61 3 9000 0001',
    'https://regalbloodstock.example.com',
    'Melbourne-based AFSL holder and platform operator. Authorised racehorse syndicator since 2010.',
    true
  ),
  (
    'inglis-syndications',
    'Inglis Syndications',
    '23456789012',
    '000002',
    'verified',
    now(),
    'platinum',
    'Sarah Inglis',
    'sarah@inglissyndications.example.com',
    '+61 2 9000 0002',
    'https://inglissyndications.example.com',
    'Leading Sydney-based syndicator with a focus on quality 2YOs by top-line sires.',
    false
  ),
  (
    'blue-sky-racing',
    'Blue Sky Racing',
    '34567890123',
    '000003',
    'verified',
    now(),
    'premium',
    'Tom Nguyen',
    'tom@bluesky.example.com',
    '+61 7 9000 0003',
    'https://blueskyrac.example.com',
    'Queensland-based syndicator specialising in QTIS-eligible horses and Group-race chasers.',
    false
  ),
  (
    'southern-cross-stables',
    'Southern Cross Stables',
    '45678901234',
    '000004',
    'verified',
    now(),
    'premium',
    'Fiona Walsh',
    'fiona@southerncross.example.com',
    '+61 8 9000 0004',
    'https://southerncross.example.com',
    'Perth-based stable with a strong record in BOBS graduates and country feature races.',
    false
  ),
  (
    'arc-racing',
    'ARC Racing',
    '56789012345',
    '000005',
    'verified',
    now(),
    'basic',
    'David Park',
    'david@arcracing.example.com',
    '+61 3 9000 0005',
    NULL,
    'Boutique Victorian syndicator. Small ownership groups, personal service.',
    false
  )
ON CONFLICT (slug) DO NOTHING;

-- ─────────────────────────────────────────────────────────────────────────────
-- HORSES (30) — 6 per syndicator
-- All status='active', pds_url IS NOT NULL (AFSL gate must pass).
-- total_shares_remaining initialised = total_shares_available.
-- The share_tier trigger will recompute it after share_tier inserts.
--
-- Price reference: 2yo colt by Capitalist at $150k full value.
-- 1% = $1,500 = 150000 cents.
-- 2.5% = $3,750 = 375000 cents.
-- 5% = $7,500 = 750000 cents.
-- 10% = $15,000 = 1500000 cents.
--
-- ongoing_cost_cents_per_pct_per_week: 3000–8000 (i.e. $30–$80/week per 1%).
-- ─────────────────────────────────────────────────────────────────────────────

-- ── Regal Bloodstock (6 horses) ───────────────────────────────────────────────
INSERT INTO horse (
  slug, syndicator_id, status,
  name, sire, dam, dam_sire, sex, colour, foal_date,
  location_state, location_postcode,
  total_shares_available, total_shares_remaining,
  ongoing_cost_cents_per_pct_per_week,
  pds_url, pds_dated,
  vet_xray_clear, vet_scope_clear, vet_checked_at,
  bonus_schemes, description
)
SELECT
  h.slug,
  s.id,
  'active',
  h.name, h.sire, h.dam, h.dam_sire,
  h.sex::horse_sex, h.colour::horse_colour, h.foal_date::date,
  h.location_state, h.location_postcode,
  100, 100,
  h.weekly_cost,
  'https://example.com/pds/' || h.slug || '.pdf',
  '2026-01-01'::date,
  true, true, h.foal_date::date + interval '1 year',
  h.bonus_schemes,
  h.description
FROM (
  VALUES
    ('regal-captain-flyer',   'Captain Flyer',    'Capitalist',      'Zephyr Dame',     'Zoustar',       'colt',    'chestnut', '2024-09-15', 'VIC', '3124', 5500, ARRAY['BOBS','VOBIS'],         'Powerful chestnut colt with excellent bone structure and a natural racing action.'),
    ('regal-star-of-rome',    'Star of Rome',     'I Am Invincible', 'Roman Belle',     'Frankel',       'filly',   'bay',      '2024-10-02', 'VIC', '3124', 4800, ARRAY['VOBIS'],                 'Elegant bay filly out of a Group-placed dam. Scopey with a long stride.'),
    ('regal-gold-verdict',    'Gold Verdict',     'Written Tycoon',  'Verdana',         'Snitzel',       'colt',    'bay',      '2023-08-20', 'VIC', '3153', 6200, ARRAY['BOBS','VOBIS'],          'Well-muscled Written Tycoon colt. Trialled brightly at Flemington.'),
    ('regal-silk-road',       'Silk Road',        'Snitzel',         'Silk Dancer',     'Redoute''s Choice', 'filly', 'grey',  '2024-07-30', 'VIC', '3124', 4200, ARRAY['VOBIS','MM'],            'Grey filly with a floating action. Handles all track conditions.'),
    ('regal-thunder-bay',     'Thunder Bay',      'Too Darn Hot',    'Bay Thunder',     'Lonhro',        'colt',    'bay',      '2023-11-10', 'VIC', '3194', 7500, ARRAY['BOBS'],                  'UK-bred colt by Too Darn Hot. Imported for the spring. Strong on the bit.'),
    ('regal-emerald-queen',   'Emerald Queen',    'Zoustar',         'Emerald Isle',    'Danehill Dancer','filly',  'chestnut', '2024-08-25', 'VIC', '3153', 5000, ARRAY['VOBIS'],                 'Athletic filly with a relaxed temperament. Dam is a stakes-placed producer.')
) AS h(slug, name, sire, dam, dam_sire, sex, colour, foal_date, location_state, location_postcode, weekly_cost, bonus_schemes, description)
JOIN syndicator s ON s.slug = 'regal-bloodstock'
ON CONFLICT (slug) DO NOTHING;

-- ── Inglis Syndications (6 horses) ───────────────────────────────────────────
INSERT INTO horse (
  slug, syndicator_id, status,
  name, sire, dam, dam_sire, sex, colour, foal_date,
  location_state, location_postcode,
  total_shares_available, total_shares_remaining,
  ongoing_cost_cents_per_pct_per_week,
  pds_url, pds_dated,
  vet_xray_clear, vet_scope_clear, vet_checked_at,
  bonus_schemes, description
)
SELECT
  h.slug,
  s.id,
  'active',
  h.name, h.sire, h.dam, h.dam_sire,
  h.sex::horse_sex, h.colour::horse_colour, h.foal_date::date,
  h.location_state, h.location_postcode,
  100, 100,
  h.weekly_cost,
  'https://example.com/pds/' || h.slug || '.pdf',
  '2026-01-01'::date,
  true, true, h.foal_date::date + interval '1 year',
  h.bonus_schemes,
  h.description
FROM (
  VALUES
    ('inglis-noble-knight',   'Noble Knight',     'Capitalist',      'Noble Lass',      'Fastnet Rock',  'colt',    'bay',      '2024-09-01', 'NSW', '2018', 5000, ARRAY['BOBS'],                  'Strongly built Capitalist colt with a powerful hindquarter and a great work ethic.'),
    ('inglis-satin-rose',     'Satin Rose',       'Frankel',         'Rose Bud',        'Danehill',      'filly',   'bay',      '2024-10-20', 'NSW', '2018', 4500, ARRAY['BOBS'],                  'Half-sister to a Group 2 winner. Long-striding Frankel filly for the summer.'),
    ('inglis-hurricane-lad',  'Hurricane Lad',    'I Am Invincible', 'Cyclone Lady',    'Encosta de Lago','colt',   'chestnut', '2023-09-12', 'NSW', '2250', 6800, ARRAY['BOBS','MM'],             'Quick-twitch colt who posted the fastest sectional at the Inglis Sales day 2Y trial.'),
    ('inglis-port-macquarie',  'Port Macquarie',  'Zoustar',         'Harbour Belle',   'Commands',      'gelding', 'brown',    '2023-07-04', 'NSW', '2444', 5200, ARRAY['BOBS'],                  'Sound gelding with an abundance of bone. Suited to the Saturday metropolitan grade.'),
    ('inglis-sunburst',       'Sunburst',         'Written Tycoon',  'Sunray Girl',     'More Than Ready','filly',  'chestnut', '2024-08-14', 'NSW', '2018', 4700, ARRAY['BOBS','MM'],             'Sunray Girl produces a consistent type. This filly is a model of athletic balance.'),
    ('inglis-copper-king',    'Copper King',      'Snitzel',         'Copper Belle',    'Encosta de Lago','colt',   'chestnut', '2024-11-03', 'NSW', '2016', 5900, ARRAY['BOBS'],                  'Copper-coated Snitzel colt. Closely related to a Group 1 winner over 1200m.')
) AS h(slug, name, sire, dam, dam_sire, sex, colour, foal_date, location_state, location_postcode, weekly_cost, bonus_schemes, description)
JOIN syndicator s ON s.slug = 'inglis-syndications'
ON CONFLICT (slug) DO NOTHING;

-- ── Blue Sky Racing (6 horses) ────────────────────────────────────────────────
INSERT INTO horse (
  slug, syndicator_id, status,
  name, sire, dam, dam_sire, sex, colour, foal_date,
  location_state, location_postcode,
  total_shares_available, total_shares_remaining,
  ongoing_cost_cents_per_pct_per_week,
  pds_url, pds_dated,
  vet_xray_clear, vet_scope_clear, vet_checked_at,
  bonus_schemes, description
)
SELECT
  h.slug,
  s.id,
  'active',
  h.name, h.sire, h.dam, h.dam_sire,
  h.sex::horse_sex, h.colour::horse_colour, h.foal_date::date,
  h.location_state, h.location_postcode,
  100, 100,
  h.weekly_cost,
  'https://example.com/pds/' || h.slug || '.pdf',
  '2026-01-01'::date,
  true, true, h.foal_date::date + interval '1 year',
  h.bonus_schemes,
  h.description
FROM (
  VALUES
    ('blue-sky-qt-flyer',      'QT Flyer',          'Too Darn Hot',    'Queensland Dream', 'Fastnet Rock', 'colt',    'bay',      '2024-08-10', 'QLD', '4000', 5500, ARRAY['QTIS','BOBS'],           'QTIS-eligible colt with a great mind and natural balance through the turn.'),
    ('blue-sky-tropical-star', 'Tropical Star',     'Capitalist',      'Tropical Beauty',  'Redoute''s Choice','filly','chestnut','2024-09-05','QLD','4006', 4800, ARRAY['QTIS'],                  'Filly out of a QTIS-winning mare. Expected to be very sharp over 1000–1200m.'),
    ('blue-sky-coral-reef',    'Coral Reef',        'I Am Invincible', 'Reef Dancer',      'Danehill Dancer','gelding','grey',   '2023-10-18', 'QLD', '4217', 6000, ARRAY['QTIS','BOBS'],           'Grey gelding with a high cruising speed. Already trialling over 800m in 47.0.'),
    ('blue-sky-gold-coast-flyer','Gold Coast Flyer','Snitzel',         'Gold Rush Lady',   'Lonhro',        'colt',    'bay',      '2024-07-22', 'QLD', '4217', 5200, ARRAY['QTIS'],                  'Lightning-quick Snitzel colt. Unraced but draws on an exceptional sprint family.'),
    ('blue-sky-reef-runner',   'Reef Runner',       'Written Tycoon',  'Reef Wind',        'Encosta de Lago','filly', 'bay',      '2023-11-25', 'QLD', '4551', 4400, ARRAY['QTIS','MM'],             'Written Tycoon filly with a relaxed disposition. Handles the Queensland heat.'),
    ('blue-sky-sunshine-coast','Sunshine Coast',    'Frankel',         'Coastal Breeze',   'Commands',      'colt',    'brown',    '2024-09-30', 'QLD', '4558', 6700, ARRAY['QTIS'],                  'Frankel colt showing above-average scope. Bred for distance but early speed is evident.')
) AS h(slug, name, sire, dam, dam_sire, sex, colour, foal_date, location_state, location_postcode, weekly_cost, bonus_schemes, description)
JOIN syndicator s ON s.slug = 'blue-sky-racing'
ON CONFLICT (slug) DO NOTHING;

-- ── Southern Cross Stables (6 horses) ────────────────────────────────────────
INSERT INTO horse (
  slug, syndicator_id, status,
  name, sire, dam, dam_sire, sex, colour, foal_date,
  location_state, location_postcode,
  total_shares_available, total_shares_remaining,
  ongoing_cost_cents_per_pct_per_week,
  pds_url, pds_dated,
  vet_xray_clear, vet_scope_clear, vet_checked_at,
  bonus_schemes, description
)
SELECT
  h.slug,
  s.id,
  'active',
  h.name, h.sire, h.dam, h.dam_sire,
  h.sex::horse_sex, h.colour::horse_colour, h.foal_date::date,
  h.location_state, h.location_postcode,
  100, 100,
  h.weekly_cost,
  'https://example.com/pds/' || h.slug || '.pdf',
  '2026-01-01'::date,
  true, true, h.foal_date::date + interval '1 year',
  h.bonus_schemes,
  h.description
FROM (
  VALUES
    ('sc-perth-pearl',          'Perth Pearl',       'Zoustar',         'Pearl of the West', 'Redoute''s Choice','filly','grey',   '2024-09-18', 'WA', '6009', 4600, ARRAY['BOBS'],                  'Zoustar filly with feathery movement. Dam is a multiple winner in WA country grade.'),
    ('sc-western-warrior',      'Western Warrior',   'Capitalist',      'Western Belle',     'Lonhro',           'colt', 'bay',    '2024-08-28', 'WA', '6009', 5700, ARRAY['BOBS'],                  'Compact Capitalist colt. Tested on the Ascot training track — very willing on the bridle.'),
    ('sc-southern-star',        'Southern Star',     'I Am Invincible', 'Southern Belle',    'Fastnet Rock',    'filly','chestnut','2023-10-07', 'WA', '6060', 5100, ARRAY['BOBS','MM'],             'Half-sister to two city winners. Moves with a lovely rhythmic action.'),
    ('sc-bobs-graduate',        'BOBS Graduate',     'Snitzel',         'Graduate Lady',     'Commands',        'colt', 'bay',     '2024-07-14', 'WA', '6009', 4900, ARRAY['BOBS'],                  'Classic Snitzel-type: sharp, quick, and naturally forward-going. BOBS eligible.'),
    ('sc-indian-ocean',         'Indian Ocean',      'Too Darn Hot',    'Ocean Swell',       'Danehill',        'gelding','brown',  '2023-08-31', 'WA', '6009', 5400, ARRAY['BOBS'],                  'Mature gelding already showing the durable racing mentality you want in a syndicate horse.'),
    ('sc-red-dust',             'Red Dust',          'Written Tycoon',  'Dusty Trail',       'Encosta de Lago', 'colt', 'chestnut','2024-10-12', 'WA', '6537', 4300, ARRAY['BOBS'],                  'Versatile Written Tycoon colt suited to the clay tracks of WA. Resilient type.')
) AS h(slug, name, sire, dam, dam_sire, sex, colour, foal_date, location_state, location_postcode, weekly_cost, bonus_schemes, description)
JOIN syndicator s ON s.slug = 'southern-cross-stables'
ON CONFLICT (slug) DO NOTHING;

-- ── ARC Racing (6 horses) ─────────────────────────────────────────────────────
INSERT INTO horse (
  slug, syndicator_id, status,
  name, sire, dam, dam_sire, sex, colour, foal_date,
  location_state, location_postcode,
  total_shares_available, total_shares_remaining,
  ongoing_cost_cents_per_pct_per_week,
  pds_url, pds_dated,
  vet_xray_clear, vet_scope_clear, vet_checked_at,
  bonus_schemes, description
)
SELECT
  h.slug,
  s.id,
  'active',
  h.name, h.sire, h.dam, h.dam_sire,
  h.sex::horse_sex, h.colour::horse_colour, h.foal_date::date,
  h.location_state, h.location_postcode,
  100, 100,
  h.weekly_cost,
  'https://example.com/pds/' || h.slug || '.pdf',
  '2026-01-01'::date,
  true, true, h.foal_date::date + interval '1 year',
  h.bonus_schemes,
  h.description
FROM (
  VALUES
    ('arc-flemington-flash',    'Flemington Flash',  'I Am Invincible', 'Flash Dance',       'Fastnet Rock',    'colt', 'chestnut','2024-09-10', 'VIC', '3031', 7000, ARRAY['VOBIS','BOBS'],          'Powerful I Am Invincible colt expected to be sharp at 1000–1200m. Highly commercial pedigree.'),
    ('arc-caulfield-classic',   'Caulfield Classic', 'Frankel',         'Classic Lady',      'Danehill',        'filly','bay',     '2024-10-22', 'VIC', '3145', 4900, ARRAY['VOBIS'],                 'Scopey Frankel filly with a beautiful walking action. Could develop into a Queen of the Turf.'),
    ('arc-moonee-valley-king',  'Moonee Valley King','Written Tycoon',  'Valley Rose',       'Encosta de Lago', 'colt', 'bay',     '2023-09-28', 'VIC', '3039', 6500, ARRAY['VOBIS','MM'],            'Lightly-raced colt with an electric turn of foot over 1000m at Moonee Valley.'),
    ('arc-sandown-star',        'Sandown Star',      'Snitzel',         'Sandown Belle',     'Redoute''s Choice','gelding','brown', '2023-10-15', 'VIC', '3175', 5600, ARRAY['VOBIS'],                 'Consistent gelding who thrives on racing. Already placed twice from four starts.'),
    ('arc-pakenham-prince',     'Pakenham Prince',   'Zoustar',         'Country Miss',      'More Than Ready', 'colt', 'bay',     '2024-08-05', 'VIC', '3810', 4000, ARRAY['VOBIS'],                 'Country-bred Zoustar colt. Straightforward temperament and excellent bone density.'),
    ('arc-ballarat-beauty',     'Ballarat Beauty',   'Too Darn Hot',    'Ballarat Rose',     'Commands',        'filly','grey',    '2024-09-20', 'VIC', '3350', 4700, ARRAY['VOBIS','BOBS'],          'UK-bred grey filly. Settled beautifully after arrival. Suit the spring 3yo programme.')
) AS h(slug, name, sire, dam, dam_sire, sex, colour, foal_date, location_state, location_postcode, weekly_cost, bonus_schemes, description)
JOIN syndicator s ON s.slug = 'arc-racing'
ON CONFLICT (slug) DO NOTHING;

-- ─────────────────────────────────────────────────────────────────────────────
-- SHARE TIERS (~2–3 per horse)
--
-- Price reference (1% of horse value in cents):
--   Regal / Inglis horses:       1% ≈ 150000  (full value ~$150k)
--   Blue Sky / SC horses:        1% ≈ 120000  (full value ~$120k)
--   ARC horses:                  1% ≈  90000  (full value ~$90k)
--
-- Tier sizes: 2.5%, 5%, 10%
-- Prices:  2.5% ≈ val*2.5, 5% ≈ val*5, 10% ≈ val*10
-- A handful of 5% and 10% tiers are marked available=false to exercise trigger.
-- ON CONFLICT (horse_id, share_pct) DO NOTHING.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── Regal Bloodstock shares ───────────────────────────────────────────────────
INSERT INTO share_tier (horse_id, share_pct, price_cents, available, display_order)
SELECT h.id, t.share_pct, t.price_cents, t.available, t.disp
FROM horse h
JOIN (
  VALUES
    -- regal-captain-flyer  val_1pct=165000
    ('regal-captain-flyer',   2.5,  412500,  true,  1),
    ('regal-captain-flyer',   5,    825000,  true,  2),
    ('regal-captain-flyer',   10,   1650000, false, 3),  -- sold
    -- regal-star-of-rome   val_1pct=145000
    ('regal-star-of-rome',    2.5,  362500,  true,  1),
    ('regal-star-of-rome',    5,    725000,  true,  2),
    -- regal-gold-verdict   val_1pct=155000
    ('regal-gold-verdict',    2.5,  387500,  true,  1),
    ('regal-gold-verdict',    5,    775000,  false, 2),  -- sold
    ('regal-gold-verdict',    10,   1550000, true,  3),
    -- regal-silk-road      val_1pct=130000
    ('regal-silk-road',       2.5,  325000,  true,  1),
    ('regal-silk-road',       5,    650000,  true,  2),
    -- regal-thunder-bay    val_1pct=175000
    ('regal-thunder-bay',     2.5,  437500,  true,  1),
    ('regal-thunder-bay',     5,    875000,  true,  2),
    ('regal-thunder-bay',     10,   1750000, true,  3),
    -- regal-emerald-queen  val_1pct=140000
    ('regal-emerald-queen',   2.5,  350000,  true,  1),
    ('regal-emerald-queen',   5,    700000,  true,  2)
) AS t(slug, share_pct, price_cents, available, disp)
  ON h.slug = t.slug
ON CONFLICT (horse_id, share_pct) DO NOTHING;

-- ── Inglis Syndications shares ────────────────────────────────────────────────
INSERT INTO share_tier (horse_id, share_pct, price_cents, available, display_order)
SELECT h.id, t.share_pct, t.price_cents, t.available, t.disp
FROM horse h
JOIN (
  VALUES
    -- inglis-noble-knight  val_1pct=160000
    ('inglis-noble-knight',    2.5,  400000,  true,  1),
    ('inglis-noble-knight',    5,    800000,  true,  2),
    ('inglis-noble-knight',    10,   1600000, false, 3),  -- sold
    -- inglis-satin-rose    val_1pct=150000
    ('inglis-satin-rose',      2.5,  375000,  true,  1),
    ('inglis-satin-rose',      5,    750000,  true,  2),
    -- inglis-hurricane-lad val_1pct=170000
    ('inglis-hurricane-lad',   2.5,  425000,  true,  1),
    ('inglis-hurricane-lad',   5,    850000,  true,  2),
    ('inglis-hurricane-lad',   10,   1700000, true,  3),
    -- inglis-port-macquarie val_1pct=120000
    ('inglis-port-macquarie',  2.5,  300000,  true,  1),
    ('inglis-port-macquarie',  5,    600000,  false, 2),  -- sold
    -- inglis-sunburst      val_1pct=140000
    ('inglis-sunburst',        2.5,  350000,  true,  1),
    ('inglis-sunburst',        5,    700000,  true,  2),
    -- inglis-copper-king   val_1pct=155000
    ('inglis-copper-king',     2.5,  387500,  true,  1),
    ('inglis-copper-king',     5,    775000,  true,  2),
    ('inglis-copper-king',     10,   1550000, true,  3)
) AS t(slug, share_pct, price_cents, available, disp)
  ON h.slug = t.slug
ON CONFLICT (horse_id, share_pct) DO NOTHING;

-- ── Blue Sky Racing shares ────────────────────────────────────────────────────
INSERT INTO share_tier (horse_id, share_pct, price_cents, available, display_order)
SELECT h.id, t.share_pct, t.price_cents, t.available, t.disp
FROM horse h
JOIN (
  VALUES
    -- blue-sky-qt-flyer      val_1pct=125000
    ('blue-sky-qt-flyer',       2.5,  312500,  true,  1),
    ('blue-sky-qt-flyer',       5,    625000,  true,  2),
    -- blue-sky-tropical-star  val_1pct=120000
    ('blue-sky-tropical-star',  2.5,  300000,  true,  1),
    ('blue-sky-tropical-star',  5,    600000,  true,  2),
    ('blue-sky-tropical-star',  10,   1200000, false, 3),  -- sold
    -- blue-sky-coral-reef     val_1pct=130000
    ('blue-sky-coral-reef',     2.5,  325000,  true,  1),
    ('blue-sky-coral-reef',     5,    650000,  true,  2),
    -- blue-sky-gold-coast-flyer val_1pct=115000
    ('blue-sky-gold-coast-flyer',2.5, 287500,  true,  1),
    ('blue-sky-gold-coast-flyer',5,   575000,  true,  2),
    -- blue-sky-reef-runner    val_1pct=110000
    ('blue-sky-reef-runner',    2.5,  275000,  true,  1),
    ('blue-sky-reef-runner',    5,    550000,  false, 2),  -- sold
    -- blue-sky-sunshine-coast val_1pct=135000
    ('blue-sky-sunshine-coast', 2.5,  337500,  true,  1),
    ('blue-sky-sunshine-coast', 5,    675000,  true,  2),
    ('blue-sky-sunshine-coast', 10,   1350000, true,  3)
) AS t(slug, share_pct, price_cents, available, disp)
  ON h.slug = t.slug
ON CONFLICT (horse_id, share_pct) DO NOTHING;

-- ── Southern Cross Stables shares ────────────────────────────────────────────
INSERT INTO share_tier (horse_id, share_pct, price_cents, available, display_order)
SELECT h.id, t.share_pct, t.price_cents, t.available, t.disp
FROM horse h
JOIN (
  VALUES
    -- sc-perth-pearl     val_1pct=115000
    ('sc-perth-pearl',          2.5,  287500,  true,  1),
    ('sc-perth-pearl',          5,    575000,  true,  2),
    -- sc-western-warrior val_1pct=130000
    ('sc-western-warrior',      2.5,  325000,  true,  1),
    ('sc-western-warrior',      5,    650000,  true,  2),
    ('sc-western-warrior',      10,   1300000, false, 3),  -- sold
    -- sc-southern-star   val_1pct=120000
    ('sc-southern-star',        2.5,  300000,  true,  1),
    ('sc-southern-star',        5,    600000,  true,  2),
    -- sc-bobs-graduate   val_1pct=110000
    ('sc-bobs-graduate',        2.5,  275000,  true,  1),
    ('sc-bobs-graduate',        5,    550000,  true,  2),
    -- sc-indian-ocean    val_1pct=125000
    ('sc-indian-ocean',         2.5,  312500,  true,  1),
    ('sc-indian-ocean',         5,    625000,  false, 2),  -- sold
    -- sc-red-dust        val_1pct=105000
    ('sc-red-dust',             2.5,  262500,  true,  1),
    ('sc-red-dust',             5,    525000,  true,  2),
    ('sc-red-dust',             10,   1050000, true,  3)
) AS t(slug, share_pct, price_cents, available, disp)
  ON h.slug = t.slug
ON CONFLICT (horse_id, share_pct) DO NOTHING;

-- ── ARC Racing shares ─────────────────────────────────────────────────────────
INSERT INTO share_tier (horse_id, share_pct, price_cents, available, display_order)
SELECT h.id, t.share_pct, t.price_cents, t.available, t.disp
FROM horse h
JOIN (
  VALUES
    -- arc-flemington-flash   val_1pct=100000
    ('arc-flemington-flash',    2.5,  250000,  true,  1),
    ('arc-flemington-flash',    5,    500000,  true,  2),
    ('arc-flemington-flash',    10,   1000000, false, 3),  -- sold
    -- arc-caulfield-classic  val_1pct=90000
    ('arc-caulfield-classic',   2.5,  225000,  true,  1),
    ('arc-caulfield-classic',   5,    450000,  true,  2),
    -- arc-moonee-valley-king val_1pct=95000
    ('arc-moonee-valley-king',  2.5,  237500,  true,  1),
    ('arc-moonee-valley-king',  5,    475000,  false, 2),  -- sold
    ('arc-moonee-valley-king',  10,   950000,  true,  3),
    -- arc-sandown-star       val_1pct=85000
    ('arc-sandown-star',        2.5,  212500,  true,  1),
    ('arc-sandown-star',        5,    425000,  true,  2),
    -- arc-pakenham-prince    val_1pct=80000
    ('arc-pakenham-prince',     2.5,  200000,  true,  1),
    ('arc-pakenham-prince',     5,    400000,  true,  2),
    -- arc-ballarat-beauty    val_1pct=88000
    ('arc-ballarat-beauty',     2.5,  220000,  true,  1),
    ('arc-ballarat-beauty',     5,    440000,  true,  2),
    ('arc-ballarat-beauty',     10,   880000,  true,  3)
) AS t(slug, share_pct, price_cents, available, disp)
  ON h.slug = t.slug
ON CONFLICT (horse_id, share_pct) DO NOTHING;

-- ─────────────────────────────────────────────────────────────────────────────
-- HORSE IMAGES (1 hero per horse — 30 total)
-- storage_path references seed/hero-{slug}.jpg (no actual bytes).
-- Unique index on (horse_id) WHERE is_hero = true prevents duplicates.
-- No conflict key available on horse_image other than the unique index;
-- wrap in NOT EXISTS check for idempotency.
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO horse_image (horse_id, storage_path, alt_text, width, height, is_hero, display_order)
SELECT
  h.id,
  'seed/hero-' || h.slug || '.jpg',
  h.name || ' — hero image',
  1600,
  1066,
  true,
  0
FROM horse h
WHERE NOT EXISTS (
  SELECT 1 FROM horse_image hi
  WHERE hi.horse_id = h.id AND hi.is_hero = true
);

-- ─────────────────────────────────────────────────────────────────────────────
-- HORSE TRAINER LINKS (1 current trainer per horse — 30 total)
-- Assign trainers round-robin: Maher → Waller → Neasham → repeat.
-- The unique index is on (horse_id, trainer_id, COALESCE(from_date, '1900-01-01')).
-- Use NOT EXISTS for idempotency.
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO horse_trainer (horse_id, trainer_id, from_date, is_current)
SELECT
  h.id,
  t.id,
  h.foal_date,
  true
FROM (
  SELECT
    h.*,
    ROW_NUMBER() OVER (ORDER BY h.created_at) AS rn
  FROM horse h
  WHERE h.deleted_at IS NULL
) h
JOIN trainer t ON t.slug = CASE ((h.rn - 1) % 3)
  WHEN 0 THEN 'ciaron-maher'
  WHEN 1 THEN 'chris-waller'
  ELSE 'annabel-neasham'
END
WHERE NOT EXISTS (
  SELECT 1 FROM horse_trainer ht
  WHERE ht.horse_id = h.id
    AND ht.trainer_id = t.id
    AND COALESCE(ht.from_date, '1900-01-01'::date) = COALESCE(h.foal_date, '1900-01-01'::date)
);
