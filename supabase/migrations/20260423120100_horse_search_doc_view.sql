-- Migration: 20260423120100_horse_search_doc_view
-- Phase 3. Denormalised projection view used by the indexer worker to
-- materialise Typesense documents without N+1 queries.
-- See docs/search/indexing.md §4.3 and docs/search/typesense-schema.md §2.

CREATE OR REPLACE VIEW horse_search_doc AS
SELECT
  h.id,
  h.slug,
  h.name,
  h.status::text                                        AS status,

  -- Pedigree
  h.sire,
  h.dam,
  h.dam_sire,

  -- Physical attributes
  h.sex::text                                           AS sex,
  h.colour::text                                        AS colour,
  to_char(h.foal_date, 'YYYY-MM-DD')                   AS foal_date,
  EXTRACT(YEAR FROM h.foal_date)::int                  AS foal_year,

  -- Age category derived from Southern Hemisphere racing calendar.
  -- Age rolls on 1 August each year; the interval thresholds reflect that.
  CASE
    WHEN h.foal_date IS NULL                                   THEN 'unknown'
    WHEN age(now(), h.foal_date) < interval '1 year 8 months' THEN 'weanling'
    WHEN age(now(), h.foal_date) < interval '2 years 8 months' THEN 'yearling'
    WHEN age(now(), h.foal_date) < interval '3 years 8 months' THEN '2yo'
    WHEN age(now(), h.foal_date) < interval '4 years 8 months' THEN '3yo'
    ELSE 'older'
  END                                                          AS age_category,

  -- Location
  h.location_state,
  h.location_postcode,

  -- Syndicator (denormalised)
  h.syndicator_id::text,
  s.slug                                                AS syndicator_slug,
  s.name                                                AS syndicator_name,
  s.tier::text                                          AS syndicator_tier,
  s.is_regal_owned,

  -- Primary trainer (denormalised)
  h.primary_trainer_id::text,
  t.name                                                AS primary_trainer_name,

  -- Commercial: min / max price across available share tiers
  COALESCE(
    (SELECT MIN(st.price_cents)
       FROM share_tier st
      WHERE st.horse_id = h.id AND st.available),
    0
  )                                                     AS price_min_cents,
  COALESCE(
    (SELECT MAX(st.price_cents)
       FROM share_tier st
      WHERE st.horse_id = h.id AND st.available),
    0
  )                                                     AS price_max_cents,

  -- 1%-equivalent valuation from the smallest available tier
  (SELECT MIN(ROUND(st.price_cents / st.share_pct)::bigint)
     FROM share_tier st
    WHERE st.horse_id = h.id AND st.available)          AS price_per_pct_cents,

  -- Price bucket (facet) — computed from price_per_pct_cents thresholds
  CASE
    WHEN (SELECT MIN(st.price_cents / st.share_pct)
            FROM share_tier st
           WHERE st.horse_id = h.id AND st.available) < 100000  THEN 'under_1k'
    WHEN (SELECT MIN(st.price_cents / st.share_pct)
            FROM share_tier st
           WHERE st.horse_id = h.id AND st.available) < 250000  THEN '1k_2_5k'
    WHEN (SELECT MIN(st.price_cents / st.share_pct)
            FROM share_tier st
           WHERE st.horse_id = h.id AND st.available) < 500000  THEN '2_5k_5k'
    WHEN (SELECT MIN(st.price_cents / st.share_pct)
            FROM share_tier st
           WHERE st.horse_id = h.id AND st.available) < 1000000 THEN '5k_10k'
    ELSE '10k_plus'
  END                                                   AS price_bucket,

  -- Available share-percentage chips (multi-valued array)
  (SELECT array_agg(st.share_pct ORDER BY st.share_pct)
     FROM share_tier st
    WHERE st.horse_id = h.id AND st.available)          AS share_pcts_available,

  h.ongoing_cost_cents_per_pct_per_week,
  h.total_shares_remaining,

  -- Final-shares flag: triggers the brass status line on HorseCard
  (h.total_shares_remaining <= 2.0)                    AS has_final_shares,

  h.bonus_schemes,
  h.vet_xray_clear,
  h.vet_scope_clear,

  -- Freshness (unix epoch for Typesense numeric sort/filter)
  EXTRACT(EPOCH FROM h.created_at)::bigint             AS created_at_unix,
  EXTRACT(EPOCH FROM h.submitted_at)::bigint           AS submitted_at_unix,

  -- Popularity (maintained by triggers; nightly rebuild keeps these fresh)
  h.view_count,
  h.enquiry_count,

  -- Display payload — not indexed by Typesense (index: false) but returned
  -- in search hits so HorseCard renders without a Postgres round-trip.
  (SELECT hi.storage_path
     FROM horse_image hi
    WHERE hi.horse_id = h.id AND hi.is_hero
    LIMIT 1)                                            AS hero_image_path,
  h.description

FROM horse h
JOIN syndicator s  ON s.id = h.syndicator_id
LEFT JOIN trainer t ON t.id = h.primary_trainer_id
WHERE h.deleted_at IS NULL;

-- Worker reads this view with service role; no RLS bypass needed.
-- Wrapped in DO so test harnesses (pglite) that lack the Supabase
-- service_role role don't fail the migration apply.
DO $$
BEGIN
  EXECUTE 'GRANT SELECT ON horse_search_doc TO service_role';
EXCEPTION
  WHEN undefined_object THEN NULL;
END
$$;
