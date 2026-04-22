-- Migration: 20260422120100_core_tables
-- Phase 2. User profile, syndicator, trainer, horse, share_tier, enquiry,
-- saved_search, listing_tier, subscription, payment.
-- See docs/db/schema.md §3.1–3.13.

-- ─── user_profile ─────────────────────────────────────────────
CREATE TABLE user_profile (
  id                         UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role                       user_role NOT NULL DEFAULT 'buyer',
  display_name               TEXT,
  phone                      TEXT,
  state                      TEXT CHECK (state IN ('NSW','VIC','QLD','SA','WA','TAS','ACT','NT')),
  postcode                   TEXT CHECK (postcode ~ '^\d{4}$'),
  owner_experience           owner_experience DEFAULT 'none',
  budget_min_cents           INTEGER CHECK (budget_min_cents >= 0),
  budget_max_cents           INTEGER CHECK (budget_max_cents >= 0),
  preferred_sires            TEXT[] NOT NULL DEFAULT '{}',
  preferred_trainers         TEXT[] NOT NULL DEFAULT '{}',
  preferred_share_sizes      NUMERIC(5,2)[] NOT NULL DEFAULT '{}',
  preferred_states           TEXT[] NOT NULL DEFAULT '{}',
  preferred_bonus_schemes    TEXT[] NOT NULL DEFAULT '{}',
  created_at                 TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                 TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at                 TIMESTAMPTZ,
  CONSTRAINT budget_range_ok CHECK (
    budget_max_cents IS NULL OR budget_min_cents IS NULL OR budget_max_cents >= budget_min_cents
  )
);

CREATE INDEX user_profile_role_idx  ON user_profile(role)  WHERE deleted_at IS NULL;
CREATE INDEX user_profile_state_idx ON user_profile(state) WHERE deleted_at IS NULL;

-- ─── syndicator ───────────────────────────────────────────────
CREATE TABLE syndicator (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug                  CITEXT UNIQUE NOT NULL,
  name                  TEXT NOT NULL,
  abn                   TEXT CHECK (abn ~ '^\d{11}$'),
  afsl_number           TEXT,
  afsl_status           afsl_status NOT NULL DEFAULT 'unverified',
  afsl_verified_at      TIMESTAMPTZ,
  afsl_verified_by      UUID REFERENCES user_profile(id),
  afsl_expires_at       DATE,
  authorised_rep_of     TEXT,
  tier                  syndicator_tier NOT NULL DEFAULT 'basic',
  contact_name          TEXT NOT NULL,
  contact_email         CITEXT NOT NULL,
  contact_phone         TEXT NOT NULL,
  website_url           TEXT,
  about                 TEXT,
  is_regal_owned        BOOLEAN NOT NULL DEFAULT false,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at            TIMESTAMPTZ,
  CONSTRAINT afsl_verified_has_number CHECK (
    afsl_status != 'verified'
    OR (afsl_number IS NOT NULL AND afsl_verified_at IS NOT NULL)
  )
);

CREATE INDEX syndicator_afsl_status_idx ON syndicator(afsl_status) WHERE deleted_at IS NULL;
CREATE INDEX syndicator_tier_idx        ON syndicator(tier)        WHERE deleted_at IS NULL;

-- ─── syndicator_user (M:N) ────────────────────────────────────
CREATE TABLE syndicator_user (
  syndicator_id  UUID NOT NULL REFERENCES syndicator(id)   ON DELETE CASCADE,
  user_id        UUID NOT NULL REFERENCES user_profile(id) ON DELETE CASCADE,
  is_admin       BOOLEAN NOT NULL DEFAULT false,
  invited_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  accepted_at    TIMESTAMPTZ,
  PRIMARY KEY (syndicator_id, user_id)
);

-- ─── trainer ──────────────────────────────────────────────────
CREATE TABLE trainer (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug            CITEXT UNIQUE NOT NULL,
  name            TEXT NOT NULL,
  stable_name     TEXT,
  state           TEXT CHECK (state IN ('NSW','VIC','QLD','SA','WA','TAS','ACT','NT')),
  location        TEXT,
  website_url     TEXT,
  about           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX trainer_name_trgm_idx ON trainer USING gin (name gin_trgm_ops);

-- ─── horse ────────────────────────────────────────────────────
CREATE TABLE horse (
  id                         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug                       CITEXT UNIQUE NOT NULL,
  syndicator_id              UUID NOT NULL REFERENCES syndicator(id),
  primary_trainer_id         UUID REFERENCES trainer(id),
  status                     horse_status NOT NULL DEFAULT 'draft',

  name                       TEXT,
  sire                       TEXT NOT NULL,
  dam                        TEXT NOT NULL,
  dam_sire                   TEXT,
  pedigree_json              JSONB,
  foal_date                  DATE,
  sex                        horse_sex NOT NULL,
  colour                     horse_colour,
  country                    TEXT NOT NULL DEFAULT 'AUS' CHECK (country ~ '^[A-Z]{3}$'),

  location_state             TEXT NOT NULL CHECK (location_state IN ('NSW','VIC','QLD','SA','WA','TAS','ACT','NT')),
  location_postcode          TEXT CHECK (location_postcode ~ '^\d{4}$'),

  ongoing_cost_cents_per_pct_per_week INTEGER CHECK (ongoing_cost_cents_per_pct_per_week >= 0),
  total_shares_available     NUMERIC(5,2) NOT NULL DEFAULT 100
    CHECK (total_shares_available > 0 AND total_shares_available <= 100),
  total_shares_remaining     NUMERIC(5,2) NOT NULL DEFAULT 100
    CHECK (total_shares_remaining >= 0),

  pds_url                    TEXT,
  pds_dated                  DATE,
  insurance_details          TEXT,
  vet_xray_clear             BOOLEAN,
  vet_scope_clear            BOOLEAN,
  vet_checked_at             DATE,

  description                TEXT,
  bonus_schemes              TEXT[] NOT NULL DEFAULT '{}',

  view_count                 INTEGER NOT NULL DEFAULT 0,
  enquiry_count              INTEGER NOT NULL DEFAULT 0,
  wishlist_count             INTEGER NOT NULL DEFAULT 0,

  submitted_at               TIMESTAMPTZ,
  approved_at                TIMESTAMPTZ,
  approved_by                UUID REFERENCES user_profile(id),
  sold_at                    TIMESTAMPTZ,
  withdrawn_at               TIMESTAMPTZ,
  withdrawal_reason          TEXT,
  created_at                 TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                 TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at                 TIMESTAMPTZ,

  CONSTRAINT remaining_le_total CHECK (total_shares_remaining <= total_shares_available)
);

CREATE INDEX horse_status_idx       ON horse(status)             WHERE deleted_at IS NULL;
CREATE INDEX horse_syndicator_idx   ON horse(syndicator_id)      WHERE deleted_at IS NULL;
CREATE INDEX horse_trainer_idx      ON horse(primary_trainer_id) WHERE deleted_at IS NULL;
CREATE INDEX horse_state_active_idx ON horse(location_state)     WHERE status = 'active';
CREATE INDEX horse_sire_trgm_idx    ON horse USING gin (sire gin_trgm_ops);
CREATE INDEX horse_dam_trgm_idx     ON horse USING gin (dam  gin_trgm_ops);

-- ─── horse_trainer (M:N history) ──────────────────────────────
CREATE TABLE horse_trainer (
  horse_id    UUID NOT NULL REFERENCES horse(id)   ON DELETE CASCADE,
  trainer_id  UUID NOT NULL REFERENCES trainer(id) ON DELETE CASCADE,
  from_date   DATE,
  to_date     DATE,
  is_current  BOOLEAN NOT NULL DEFAULT true,
  PRIMARY KEY (horse_id, trainer_id, COALESCE(from_date, '1900-01-01'))
);

-- ─── share_tier ───────────────────────────────────────────────
CREATE TABLE share_tier (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  horse_id           UUID NOT NULL REFERENCES horse(id) ON DELETE CASCADE,
  share_pct          NUMERIC(5,2) NOT NULL CHECK (share_pct > 0 AND share_pct <= 100),
  price_cents        INTEGER NOT NULL CHECK (price_cents > 0),
  available          BOOLEAN NOT NULL DEFAULT true,
  display_order      SMALLINT NOT NULL DEFAULT 0,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (horse_id, share_pct)
);

CREATE INDEX share_tier_horse_idx ON share_tier(horse_id);

-- ─── horse_image ──────────────────────────────────────────────
CREATE TABLE horse_image (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  horse_id      UUID NOT NULL REFERENCES horse(id) ON DELETE CASCADE,
  storage_path  TEXT NOT NULL,
  alt_text      TEXT NOT NULL,
  width         INTEGER,
  height        INTEGER,
  bytes         INTEGER,
  is_hero       BOOLEAN NOT NULL DEFAULT false,
  display_order SMALLINT NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX horse_image_one_hero_idx ON horse_image(horse_id) WHERE is_hero = true;

-- ─── horse_video ──────────────────────────────────────────────
CREATE TABLE horse_video (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  horse_id        UUID NOT NULL REFERENCES horse(id) ON DELETE CASCADE,
  mux_asset_id    TEXT NOT NULL,
  mux_playback_id TEXT NOT NULL,
  duration_ms     INTEGER,
  caption         TEXT,
  display_order   SMALLINT NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── enquiry ──────────────────────────────────────────────────
CREATE TABLE enquiry (
  id                         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                    UUID REFERENCES user_profile(id),
  horse_id                   UUID NOT NULL REFERENCES horse(id),
  syndicator_id              UUID NOT NULL REFERENCES syndicator(id),
  contact_name               TEXT NOT NULL,
  contact_email              CITEXT NOT NULL,
  contact_phone              TEXT,
  message                    TEXT,
  share_size_interested_pct  NUMERIC(5,2),
  budget_min_cents           INTEGER,
  budget_max_cents           INTEGER,
  preferred_contact_time     TEXT,
  source                     TEXT,
  consent_marketing_at_submit BOOLEAN NOT NULL,
  consent_share_at_submit     BOOLEAN NOT NULL,
  created_at                 TIMESTAMPTZ NOT NULL DEFAULT now(),
  forwarded_to_syndicator_at TIMESTAMPTZ,
  outcome                    enquiry_outcome NOT NULL DEFAULT 'pending',
  outcome_updated_at         TIMESTAMPTZ,
  outcome_updated_by         UUID REFERENCES user_profile(id),
  deleted_at                 TIMESTAMPTZ
);

CREATE INDEX enquiry_user_idx       ON enquiry(user_id)       WHERE deleted_at IS NULL;
CREATE INDEX enquiry_horse_idx      ON enquiry(horse_id)      WHERE deleted_at IS NULL;
CREATE INDEX enquiry_syndicator_idx ON enquiry(syndicator_id) WHERE deleted_at IS NULL;
CREATE INDEX enquiry_created_idx    ON enquiry(created_at DESC);

-- ─── saved_search ─────────────────────────────────────────────
CREATE TABLE saved_search (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID NOT NULL REFERENCES user_profile(id) ON DELETE CASCADE,
  name             TEXT,
  filter_json      JSONB NOT NULL,
  frequency        search_frequency NOT NULL DEFAULT 'weekly',
  last_sent_at     TIMESTAMPTZ,
  last_match_count INTEGER,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX saved_search_user_idx      ON saved_search(user_id);
CREATE INDEX saved_search_frequency_idx ON saved_search(frequency) WHERE frequency != 'off';

-- ─── listing_tier ─────────────────────────────────────────────
CREATE TABLE listing_tier (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code                    CITEXT UNIQUE NOT NULL,
  name                    TEXT NOT NULL,
  price_cents_per_month   INTEGER NOT NULL CHECK (price_cents_per_month >= 0),
  price_cents_per_listing INTEGER,
  max_active_horses       INTEGER,
  features_json           JSONB NOT NULL DEFAULT '{}',
  is_active               BOOLEAN NOT NULL DEFAULT true,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── subscription ─────────────────────────────────────────────
CREATE TABLE subscription (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  syndicator_id          UUID NOT NULL REFERENCES syndicator(id) ON DELETE RESTRICT,
  listing_tier_id        UUID NOT NULL REFERENCES listing_tier(id),
  stripe_subscription_id TEXT UNIQUE,
  stripe_customer_id     TEXT,
  status                 TEXT NOT NULL CHECK (status IN ('trialing','active','past_due','canceled','unpaid')),
  current_period_start   TIMESTAMPTZ,
  current_period_end     TIMESTAMPTZ,
  cancel_at              TIMESTAMPTZ,
  canceled_at            TIMESTAMPTZ,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX subscription_one_active_per_synd
  ON subscription(syndicator_id) WHERE status IN ('trialing','active','past_due');

-- ─── payment ──────────────────────────────────────────────────
CREATE TABLE payment (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  syndicator_id         UUID NOT NULL REFERENCES syndicator(id),
  subscription_id       UUID REFERENCES subscription(id),
  stripe_payment_intent TEXT UNIQUE,
  stripe_invoice_id     TEXT,
  amount_cents          INTEGER NOT NULL,
  currency              TEXT NOT NULL DEFAULT 'aud' CHECK (currency = lower(currency)),
  status                payment_status NOT NULL,
  description           TEXT NOT NULL,
  paid_at               TIMESTAMPTZ,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX payment_syndicator_idx ON payment(syndicator_id);
CREATE INDEX payment_status_idx     ON payment(status);
