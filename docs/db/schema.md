# Data Schema — horseracingshares

> **Status:** v1 (2026-04-22). Load-bearing for Phase 2.
> **Scope:** every persistent entity the MVP needs, plus the RLS and compliance constraints that ride on top of them.
> **Audience:** the architect writing migrations, the builder implementing API routes, the compliance officer auditing data handling.

---

## 0. Conventions

- **Database:** Postgres 15 (Supabase-managed).
- **IDs:** UUID v7 (`gen_random_uuid()` on insert until `uuid-ossp` v7 lands; order roughly time-sortable).
- **Timestamps:** `timestamptz`, ISO 8601 UTC. Every table gets `created_at` and `updated_at` (trigger-maintained).
- **Money:** integer cents, column suffix `_cents`. AUD. Never floats.
- **Slugs:** lowercase kebab-case, `citext`, unique where present.
- **Soft delete:** `deleted_at timestamptz` where the entity has external references that must not break (User, Syndicator, Horse, Enquiry). Hard delete elsewhere.
- **Naming:** snake_case tables and columns, singular table names (`user`, `horse`) to match Postgres idiom. Foreign keys are `{other}_id`.
- **Enums:** Postgres `CREATE TYPE` enums for stable vocabularies; `text` with CHECK for evolving vocabularies (filter facets).
- **RLS:** enabled on every user-data table. Default deny. Policies declared in §5.
- **Audit:** see §6 — the `audit_log` table captures every write to compliance-critical rows (Syndicator AFSL state, Horse status transitions, Enquiry lifecycle).

---

## 1. Entities at a glance

```
┌───────────┐        ┌─────────────┐        ┌─────────────┐
│   user    │        │  syndicator │        │   trainer   │
└────┬──────┘        └──────┬──────┘        └──────┬──────┘
     │ 1:N                  │ 1:N                  │ N:M (horse_trainer)
     ▼                      ▼                      │
┌───────────┐         ┌──────────┐◄────────────────┘
│  enquiry  │────────▶│  horse   │
└────┬──────┘  N:1    └────┬─────┘
     │                     │ 1:N
     │ 1:N                 ▼
     ▼              ┌─────────────┐
  no child      ┌───│ share_tier  │
                │   └─────────────┘
                │   ┌───────────────┐
                └──▶│ horse_image   │  horse_video, horse_incentive
                    └───────────────┘

┌──────────────┐   ┌──────────────┐   ┌─────────────┐
│ saved_search │   │ listing_tier │   │subscription │
│   (user→)    │   │  (catalog)   │   │(syndicator→)│
└──────────────┘   └──────────────┘   └──────┬──────┘
                                             │ 1:N
                                             ▼
                                      ┌─────────────┐
                                      │   payment   │
                                      └─────────────┘

┌────────────────┐   ┌────────────────┐   ┌────────────────┐
│ winner_archive │   │ view_event     │   │ consent_ledger │
│   (horse→)     │   │ (user, horse→) │   │   (user→)      │
└────────────────┘   └────────────────┘   └────────────────┘
                                          
┌────────────────┐   ┌────────────────┐
│  audit_log     │   │ lead_score     │
│  (polymorphic) │   │   (user 1:1)   │
└────────────────┘   └────────────────┘
```

Core relations:
- A **user** is either a buyer (default) or is linked to a **syndicator** via `syndicator_user` (buyer accounts never become syndicators directly — syndicator invites create the link).
- A **syndicator** owns zero-or-more **horses**.
- A **horse** has many **share_tier** rows (2.5%, 5%, 10% slices, each priced independently), many **horse_image** / **horse_video** rows, and many-to-many with **trainer**.
- An **enquiry** belongs to a user and a horse; it's the load-bearing conversion event.
- **winner_archive** rows get written when a horse that was once listed has a race result — separate table because one horse has many results and horses may be deleted.

---

## 2. Extensions & types

```sql
-- Phase 2 migration 0001_extensions.sql
CREATE EXTENSION IF NOT EXISTS "pgcrypto";          -- gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS "citext";            -- case-insensitive slugs + emails
CREATE EXTENSION IF NOT EXISTS "pg_trgm";           -- trigram search for names
CREATE EXTENSION IF NOT EXISTS "btree_gin";         -- composite indexes on jsonb + text

-- Shared enums
CREATE TYPE user_role       AS ENUM ('buyer', 'syndicator', 'operator');
CREATE TYPE horse_status    AS ENUM ('draft', 'pending_review', 'active', 'sold', 'withdrawn');
CREATE TYPE horse_sex       AS ENUM ('colt', 'filly', 'gelding', 'mare', 'stallion');
CREATE TYPE horse_colour    AS ENUM ('bay', 'brown', 'chestnut', 'grey', 'black', 'roan');
CREATE TYPE syndicator_tier AS ENUM ('basic', 'premium', 'platinum', 'partner');
CREATE TYPE enquiry_outcome AS ENUM ('pending', 'contacted', 'share_purchased', 'rejected', 'no_response');
CREATE TYPE owner_experience AS ENUM ('none', 'one_to_two', 'three_plus');
CREATE TYPE search_frequency AS ENUM ('off', 'daily', 'weekly');
CREATE TYPE payment_status  AS ENUM ('requires_action', 'processing', 'succeeded', 'failed', 'refunded');
CREATE TYPE afsl_status     AS ENUM ('unverified', 'pending', 'verified', 'suspended', 'expired');
```

Bonus schemes, Australian states, and postcodes live as text+CHECK rather than enums — the set evolves and 19 BOBS-family schemes would bloat the enum list.

---

## 3. Tables

### 3.1 `user_profile`

Extends Supabase's `auth.users`. We never touch `auth.users` directly — all app data goes here, keyed by the same UUID.

```sql
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
  preferred_sires            TEXT[] DEFAULT '{}',
  preferred_trainers         TEXT[] DEFAULT '{}',
  preferred_share_sizes      NUMERIC(5,2)[] DEFAULT '{}',
  preferred_states           TEXT[] DEFAULT '{}',
  preferred_bonus_schemes    TEXT[] DEFAULT '{}',
  created_at                 TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                 TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at                 TIMESTAMPTZ,
  CONSTRAINT budget_range_ok CHECK (budget_max_cents IS NULL OR budget_min_cents IS NULL OR budget_max_cents >= budget_min_cents)
);

CREATE INDEX user_profile_role_idx  ON user_profile(role)     WHERE deleted_at IS NULL;
CREATE INDEX user_profile_state_idx ON user_profile(state)    WHERE deleted_at IS NULL;
```

### 3.2 `syndicator`

```sql
CREATE TABLE syndicator (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug                  CITEXT UNIQUE NOT NULL,
  name                  TEXT NOT NULL,
  abn                   TEXT CHECK (abn ~ '^\d{11}$'),
  afsl_number           TEXT,
  afsl_status           afsl_status NOT NULL DEFAULT 'unverified',
  afsl_verified_at      TIMESTAMPTZ,
  afsl_verified_by      UUID REFERENCES user_profile(id),  -- operator who verified
  afsl_expires_at       DATE,
  authorised_rep_of     TEXT,                               -- parent AFSL holder name if AR
  tier                  syndicator_tier NOT NULL DEFAULT 'basic',
  contact_name          TEXT NOT NULL,
  contact_email         CITEXT NOT NULL,
  contact_phone         TEXT NOT NULL,
  website_url           TEXT,
  about                 TEXT,
  is_regal_owned        BOOLEAN NOT NULL DEFAULT false,     -- the Regal disclosure flag
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at            TIMESTAMPTZ,
  CONSTRAINT afsl_verified_has_number CHECK (
    afsl_status != 'verified' OR (afsl_number IS NOT NULL AND afsl_verified_at IS NOT NULL)
  )
);

CREATE INDEX syndicator_afsl_status_idx ON syndicator(afsl_status) WHERE deleted_at IS NULL;
CREATE INDEX syndicator_tier_idx        ON syndicator(tier)        WHERE deleted_at IS NULL;
```

**Manual AFSL verification (Phase 1 operational note, design-system.md §6):** the operator marks a syndicator `afsl_status='verified'` via a protected admin route, which sets `afsl_verified_at = now()` and `afsl_verified_by = auth.uid()`. 24h SLA for the first 20 syndicators. The API route is the second belt; the CHECK above is the third.

### 3.3 `syndicator_user`

Many-to-many bridge between `user_profile` (role='syndicator' or 'operator') and `syndicator`. A single syndicator org may have multiple users; a single user may belong to multiple syndicators.

```sql
CREATE TABLE syndicator_user (
  syndicator_id  UUID NOT NULL REFERENCES syndicator(id)    ON DELETE CASCADE,
  user_id        UUID NOT NULL REFERENCES user_profile(id)  ON DELETE CASCADE,
  is_admin       BOOLEAN NOT NULL DEFAULT false,
  invited_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  accepted_at    TIMESTAMPTZ,
  PRIMARY KEY (syndicator_id, user_id)
);
```

### 3.4 `trainer`

First-class entity so we can canonicalise spelling (Ciaron Maher vs C. Maher) and build trainer directory pages.

```sql
CREATE TABLE trainer (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug            CITEXT UNIQUE NOT NULL,
  name            TEXT NOT NULL,
  stable_name     TEXT,
  state           TEXT CHECK (state IN ('NSW','VIC','QLD','SA','WA','TAS','ACT','NT')),
  location        TEXT,                   -- e.g. "Caulfield", "Warwick Farm"
  website_url     TEXT,
  about           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX trainer_name_trgm_idx ON trainer USING gin (name gin_trgm_ops);
```

### 3.5 `horse`

The centrepiece. Every active row must clear the AFSL/PDS gate (§4).

```sql
CREATE TABLE horse (
  id                         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug                       CITEXT UNIQUE NOT NULL,
  syndicator_id              UUID NOT NULL REFERENCES syndicator(id),
  primary_trainer_id         UUID REFERENCES trainer(id),
  status                     horse_status NOT NULL DEFAULT 'draft',

  -- Identity
  name                       TEXT,
  sire                       TEXT NOT NULL,
  dam                        TEXT NOT NULL,
  dam_sire                   TEXT,
  pedigree_json              JSONB,                     -- full 3-gen chart, bloodstock convention
  foal_date                  DATE,
  sex                        horse_sex NOT NULL,
  colour                     horse_colour,
  country                    TEXT NOT NULL DEFAULT 'AUS' CHECK (country ~ '^[A-Z]{3}$'),

  -- Location
  location_state             TEXT NOT NULL CHECK (location_state IN ('NSW','VIC','QLD','SA','WA','TAS','ACT','NT')),
  location_postcode          TEXT CHECK (location_postcode ~ '^\d{4}$'),

  -- Costs (per-%-share, cents per week)
  ongoing_cost_cents_per_pct_per_week INTEGER CHECK (ongoing_cost_cents_per_pct_per_week >= 0),
  total_shares_available     NUMERIC(5,2) NOT NULL DEFAULT 100 CHECK (total_shares_available > 0 AND total_shares_available <= 100),
  total_shares_remaining     NUMERIC(5,2) NOT NULL CHECK (total_shares_remaining >= 0),

  -- Compliance
  pds_url                    TEXT,                      -- Product Disclosure Statement (mandatory for active)
  pds_dated                  DATE,                      -- date on the PDS, displayed on the listing
  insurance_details          TEXT,
  vet_xray_clear             BOOLEAN,
  vet_scope_clear            BOOLEAN,
  vet_checked_at             DATE,

  -- Discovery
  description                TEXT,
  bonus_schemes              TEXT[] DEFAULT '{}',       -- ['BOBS','VOBIS','MMRS', …]

  -- Metrics (denormalised, updated by triggers; never exposed for sort manipulation)
  view_count                 INTEGER NOT NULL DEFAULT 0,
  enquiry_count              INTEGER NOT NULL DEFAULT 0,
  wishlist_count             INTEGER NOT NULL DEFAULT 0,

  -- Lifecycle
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

CREATE INDEX horse_status_idx      ON horse(status)         WHERE deleted_at IS NULL;
CREATE INDEX horse_syndicator_idx  ON horse(syndicator_id)  WHERE deleted_at IS NULL;
CREATE INDEX horse_trainer_idx     ON horse(primary_trainer_id) WHERE deleted_at IS NULL;
CREATE INDEX horse_state_idx       ON horse(location_state) WHERE status = 'active';
CREATE INDEX horse_sire_trgm_idx   ON horse USING gin (sire gin_trgm_ops);
CREATE INDEX horse_dam_trgm_idx    ON horse USING gin (dam gin_trgm_ops);
```

### 3.6 `horse_trainer` (M:N)

Horses may be trained by multiple trainers over their career; we track the history so a horse page can show "previously with X".

```sql
-- Surrogate PK + expression unique index — Postgres disallows
-- function expressions inside PRIMARY KEY clauses.
CREATE TABLE horse_trainer (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  horse_id    UUID NOT NULL REFERENCES horse(id)   ON DELETE CASCADE,
  trainer_id  UUID NOT NULL REFERENCES trainer(id) ON DELETE CASCADE,
  from_date   DATE,
  to_date     DATE,
  is_current  BOOLEAN NOT NULL DEFAULT true
);

CREATE UNIQUE INDEX horse_trainer_uniq
  ON horse_trainer (horse_id, trainer_id, COALESCE(from_date, '1900-01-01'::date));
```

### 3.7 `share_tier`

A horse may offer 2.5%, 5%, and 10% shares at different prices. Each slice is a row so we can sell/reserve independently.

```sql
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
```

### 3.8 `horse_image` / `horse_video`

```sql
CREATE TABLE horse_image (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  horse_id      UUID NOT NULL REFERENCES horse(id) ON DELETE CASCADE,
  storage_path  TEXT NOT NULL,             -- Supabase Storage key
  alt_text      TEXT NOT NULL,
  width         INTEGER,
  height        INTEGER,
  bytes         INTEGER,
  is_hero       BOOLEAN NOT NULL DEFAULT false,
  display_order SMALLINT NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX horse_image_one_hero_idx ON horse_image(horse_id) WHERE is_hero = true;

CREATE TABLE horse_video (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  horse_id      UUID NOT NULL REFERENCES horse(id) ON DELETE CASCADE,
  mux_asset_id  TEXT NOT NULL,             -- Mux API identifier
  mux_playback_id TEXT NOT NULL,
  duration_ms   INTEGER,
  caption       TEXT,
  display_order SMALLINT NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### 3.9 `enquiry`

The conversion event. Every enquiry is captured on-platform and forwarded to the syndicator within 60 seconds (CLAUDE.md compliance rule).

```sql
CREATE TABLE enquiry (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                   UUID REFERENCES user_profile(id),   -- nullable for pre-auth enquiries
  horse_id                  UUID NOT NULL REFERENCES horse(id),
  syndicator_id             UUID NOT NULL REFERENCES syndicator(id),
  -- contact snapshot (denormalised so a deleted user's enquiry audit-trail stays intact)
  contact_name              TEXT NOT NULL,
  contact_email             CITEXT NOT NULL,
  contact_phone             TEXT,
  message                   TEXT,
  share_size_interested_pct NUMERIC(5,2),
  budget_min_cents          INTEGER,
  budget_max_cents          INTEGER,
  preferred_contact_time    TEXT,
  source                    TEXT,                 -- utm_source or internal ref
  consent_marketing_at_submit BOOLEAN NOT NULL,   -- immutable snapshot for compliance
  consent_share_at_submit     BOOLEAN NOT NULL,
  created_at                TIMESTAMPTZ NOT NULL DEFAULT now(),
  forwarded_to_syndicator_at TIMESTAMPTZ,
  outcome                   enquiry_outcome NOT NULL DEFAULT 'pending',
  outcome_updated_at        TIMESTAMPTZ,
  outcome_updated_by        UUID REFERENCES user_profile(id),
  deleted_at                TIMESTAMPTZ
);

CREATE INDEX enquiry_user_idx       ON enquiry(user_id)       WHERE deleted_at IS NULL;
CREATE INDEX enquiry_horse_idx      ON enquiry(horse_id)      WHERE deleted_at IS NULL;
CREATE INDEX enquiry_syndicator_idx ON enquiry(syndicator_id) WHERE deleted_at IS NULL;
CREATE INDEX enquiry_created_idx    ON enquiry(created_at DESC);
```

### 3.10 `saved_search`

```sql
CREATE TABLE saved_search (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES user_profile(id) ON DELETE CASCADE,
  name            TEXT,
  filter_json     JSONB NOT NULL,              -- validated against zod at API
  frequency       search_frequency NOT NULL DEFAULT 'weekly',
  last_sent_at    TIMESTAMPTZ,
  last_match_count INTEGER,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX saved_search_user_idx      ON saved_search(user_id);
CREATE INDEX saved_search_frequency_idx ON saved_search(frequency) WHERE frequency != 'off';
```

### 3.11 `listing_tier`

Catalog of what a syndicator can buy. Not per-syndicator state — that lives in `subscription`.

```sql
CREATE TABLE listing_tier (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code                   CITEXT UNIQUE NOT NULL,     -- 'basic', 'premium', 'platinum'
  name                   TEXT NOT NULL,
  price_cents_per_month  INTEGER NOT NULL CHECK (price_cents_per_month >= 0),
  price_cents_per_listing INTEGER,                   -- optional per-listing overlay
  max_active_horses      INTEGER,                    -- NULL = unlimited
  features_json          JSONB NOT NULL DEFAULT '{}',
  is_active              BOOLEAN NOT NULL DEFAULT true,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### 3.12 `subscription`

A syndicator's current subscription state. Exactly one active row per syndicator at a time (enforced by partial unique index).

```sql
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
```

### 3.13 `payment`

Every Stripe event we care about. Listing fees only (never share purchases — CLAUDE.md compliance hard rule).

```sql
CREATE TABLE payment (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  syndicator_id          UUID NOT NULL REFERENCES syndicator(id),
  subscription_id        UUID REFERENCES subscription(id),
  stripe_payment_intent  TEXT UNIQUE,
  stripe_invoice_id      TEXT,
  amount_cents           INTEGER NOT NULL,
  currency               TEXT NOT NULL DEFAULT 'aud' CHECK (currency = lower(currency)),
  status                 payment_status NOT NULL,
  description            TEXT NOT NULL,             -- 'Basic listing – April 2026'
  paid_at                TIMESTAMPTZ,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX payment_syndicator_idx ON payment(syndicator_id);
CREATE INDEX payment_status_idx     ON payment(status);
```

### 3.14 `winner_archive`

Race results for horses that have been listed. Populated by a nightly worker that scrapes Racing Australia's result feed (Phase 3 work — schema lands now so migrations are contiguous).

```sql
CREATE TABLE winner_archive (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  horse_id      UUID REFERENCES horse(id),          -- nullable: result predates listing
  horse_name    TEXT NOT NULL,                      -- denormalised in case horse is deleted
  race_name     TEXT NOT NULL,
  race_date     DATE NOT NULL,
  track         TEXT NOT NULL,
  position      SMALLINT,                           -- 1 = win, 2 = 2nd, etc.
  prizemoney_cents INTEGER,
  field_size    SMALLINT,
  black_type    TEXT,                               -- 'G1', 'G2', 'G3', 'LR', NULL
  distance_m    INTEGER,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX winner_archive_horse_idx    ON winner_archive(horse_id);
CREATE INDEX winner_archive_race_date_idx ON winner_archive(race_date DESC);
```

### 3.15 `view_event`

Lightweight pageview log used by the lead-scoring worker. Bucketed by day so it doesn't balloon. Retained 12 months, then rolled to a summary table.

```sql
CREATE TABLE view_event (
  id            BIGSERIAL PRIMARY KEY,
  user_id       UUID REFERENCES user_profile(id),   -- nullable for anonymous
  session_id    TEXT NOT NULL,                      -- cookie-scoped, rotated per session
  horse_id      UUID REFERENCES horse(id),
  event_type    TEXT NOT NULL CHECK (event_type IN ('view','save','enquiry_start','enquiry_submit','cost_calc','pds_download')),
  occurred_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  dwell_ms      INTEGER,
  source        TEXT
);

CREATE INDEX view_event_user_time_idx   ON view_event(user_id, occurred_at DESC) WHERE user_id IS NOT NULL;
CREATE INDEX view_event_horse_time_idx  ON view_event(horse_id, occurred_at DESC);
CREATE INDEX view_event_session_idx     ON view_event(session_id, occurred_at DESC);
```

### 3.16 `consent_ledger`

Immutable audit trail of every consent change — granted, revoked, re-granted. Required for compliance: at any moment we must be able to answer "what consent did this user have on this date?". Never UPDATE rows here; only INSERT.

```sql
CREATE TABLE consent_ledger (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES user_profile(id) ON DELETE CASCADE,
  consent_type      TEXT NOT NULL CHECK (consent_type IN (
                      'marketing_email',
                      'marketing_sms',
                      'share_with_syndicator_on_enquiry',
                      'share_with_regal_partner_matches',
                      'analytics_session_replay'
                    )),
  granted           BOOLEAN NOT NULL,
  source            TEXT NOT NULL,        -- 'signup','preferences_page','enquiry_form','email_unsub_link'
  ip_address        INET,
  user_agent        TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX consent_ledger_user_type_idx ON consent_ledger(user_id, consent_type, created_at DESC);
```

Current-consent resolution: `SELECT DISTINCT ON (consent_type) ... ORDER BY consent_type, created_at DESC`. Wrapped in a SQL function `current_consent(user_id UUID) RETURNS TABLE(...)` for ergonomic use.

### 3.17 `lead_score`

One row per user. Updated by a worker on every view_event write or nightly rebuild. See `docs/db/scoring.md` for algorithm.

```sql
CREATE TABLE lead_score (
  user_id           UUID PRIMARY KEY REFERENCES user_profile(id) ON DELETE CASCADE,
  score             INTEGER NOT NULL DEFAULT 0 CHECK (score >= 0 AND score <= 100),
  band              TEXT NOT NULL DEFAULT 'cold' CHECK (band IN ('cold','warm','hot','fire')),
  last_enquiry_at   TIMESTAMPTZ,
  last_view_at      TIMESTAMPTZ,
  view_count_30d    INTEGER NOT NULL DEFAULT 0,
  enquiry_count_90d INTEGER NOT NULL DEFAULT 0,
  declared_budget_cents INTEGER,
  computed_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX lead_score_band_idx ON lead_score(band);
CREATE INDEX lead_score_score_idx ON lead_score(score DESC);
```

### 3.18 `audit_log`

Polymorphic write log for compliance-critical entities. Written by triggers on Syndicator, Horse, Enquiry.

```sql
CREATE TABLE audit_log (
  id             BIGSERIAL PRIMARY KEY,
  table_name     TEXT NOT NULL,
  row_id         UUID NOT NULL,
  action         TEXT NOT NULL CHECK (action IN ('INSERT','UPDATE','DELETE')),
  changed_by     UUID REFERENCES user_profile(id),
  change_reason  TEXT,
  old_row        JSONB,
  new_row        JSONB,
  occurred_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX audit_log_target_idx ON audit_log(table_name, row_id, occurred_at DESC);
CREATE INDEX audit_log_actor_idx  ON audit_log(changed_by, occurred_at DESC);
```

---

## 4. The AFSL/PDS gate — three-layer enforcement

The compliance-critical invariant (CLAUDE.md): **a horse cannot have `status = 'active'` unless**
1. its syndicator has `afsl_number IS NOT NULL` AND `afsl_status = 'verified'` AND `afsl_verified_at IS NOT NULL`, AND
2. the horse itself has `pds_url IS NOT NULL`.

Postgres CHECK constraints can't reference other tables, so layer 1 is a trigger, layer 2 is the API route, layer 3 is the form.

### 4.1 DB layer — BEFORE INSERT/UPDATE trigger on `horse`

```sql
CREATE OR REPLACE FUNCTION enforce_horse_active_gate() RETURNS trigger AS $$
DECLARE
  s syndicator%ROWTYPE;
BEGIN
  IF NEW.status = 'active' THEN
    IF NEW.pds_url IS NULL THEN
      RAISE EXCEPTION 'horse.status=active requires pds_url'
        USING ERRCODE = 'check_violation';
    END IF;
    SELECT * INTO s FROM syndicator WHERE id = NEW.syndicator_id AND deleted_at IS NULL;
    IF s.afsl_number IS NULL
       OR s.afsl_status != 'verified'
       OR s.afsl_verified_at IS NULL THEN
      RAISE EXCEPTION
        'horse.status=active requires syndicator % to be AFSL-verified (number, verified_at, status=verified)',
        NEW.syndicator_id
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER horse_active_gate
  BEFORE INSERT OR UPDATE OF status, pds_url, syndicator_id
  ON horse
  FOR EACH ROW
  EXECUTE FUNCTION enforce_horse_active_gate();
```

A matching trigger on `syndicator` downgrades any `active` horses to `pending_review` if its `afsl_status` leaves 'verified':

```sql
CREATE OR REPLACE FUNCTION syndicator_afsl_cascade() RETURNS trigger AS $$
BEGIN
  IF OLD.afsl_status = 'verified' AND NEW.afsl_status != 'verified' THEN
    UPDATE horse
       SET status = 'pending_review',
           updated_at = now()
     WHERE syndicator_id = NEW.id
       AND status = 'active';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER syndicator_afsl_cascade_t
  AFTER UPDATE OF afsl_status ON syndicator
  FOR EACH ROW
  EXECUTE FUNCTION syndicator_afsl_cascade();
```

### 4.2 API layer — Zod + service guard

The `POST /api/horse/:id/activate` route validates with zod, then calls a service function that explicitly re-checks the gate before issuing the UPDATE. This gives callers a clean 422 error message rather than a Postgres exception.

### 4.3 Form layer

The submission form disables the "Submit for review" button until `pds_url` is populated and the syndicator shows as verified in the UI. The operator approves `draft → active` only from the admin review queue.

---

## 5. RLS policies

Every table has RLS enabled. Policies below.

### 5.1 `user_profile`

```sql
ALTER TABLE user_profile ENABLE ROW LEVEL SECURITY;

-- Self-read / self-write
CREATE POLICY up_self ON user_profile FOR ALL
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Operators can read everyone
CREATE POLICY up_operator_read ON user_profile FOR SELECT
  USING (EXISTS (SELECT 1 FROM user_profile op WHERE op.id = auth.uid() AND op.role = 'operator'));
```

### 5.2 `syndicator`

Three policies split by intent — `WITH CHECK` doesn't apply to SELECT/DELETE, so a single `FOR ALL` policy can't cleanly express "all members read, only admins write":

```sql
ALTER TABLE syndicator ENABLE ROW LEVEL SECURITY;

-- Public read of verified syndicators (needed for horse detail page)
CREATE POLICY synd_public_verified ON syndicator FOR SELECT
  USING (afsl_status = 'verified' AND deleted_at IS NULL);

-- Members of the syndicator can read (regardless of admin flag)
CREATE POLICY synd_member_read ON syndicator FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM syndicator_user su
    WHERE su.syndicator_id = syndicator.id
      AND su.user_id = auth.uid()
      AND su.accepted_at IS NOT NULL
  ));

-- Admins update their own (INSERT/DELETE are operator-gated)
CREATE POLICY synd_admin_write ON syndicator FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM syndicator_user su
    WHERE su.syndicator_id = syndicator.id
      AND su.user_id = auth.uid()
      AND su.accepted_at IS NOT NULL
      AND su.is_admin = true
  ));

-- Operators can do everything
CREATE POLICY synd_operator ON syndicator FOR ALL USING (is_operator()) WITH CHECK (is_operator());
```

**AFSL re-verification on material change.** Any admin-initiated edit of `afsl_number` or `afsl_verified_at` automatically resets `afsl_status` to `pending` and clears the verification stamp — an operator must re-verify. Enforced by the `syndicator_afsl_reverify` BEFORE UPDATE trigger in `20260422120500_afsl_gate.sql`. This closes a gap where an admin could otherwise edit their AFSL number without triggering re-verification.

Operator-role updates to the same fields bypass this reset — the operator *is* performing the verification.

### 5.3 `horse`

```sql
ALTER TABLE horse ENABLE ROW LEVEL SECURITY;

-- Public read of active horses
CREATE POLICY horse_public_active ON horse FOR SELECT
  USING (status = 'active' AND deleted_at IS NULL);

-- Syndicator members can read/write their own horses
CREATE POLICY horse_owner_rw ON horse FOR ALL
  USING (EXISTS (
    SELECT 1 FROM syndicator_user su
    WHERE su.syndicator_id = horse.syndicator_id AND su.user_id = auth.uid() AND su.accepted_at IS NOT NULL
  ));

-- Operators can read/write all (incl. drafts)
CREATE POLICY horse_operator ON horse FOR ALL
  USING (EXISTS (SELECT 1 FROM user_profile op WHERE op.id = auth.uid() AND op.role = 'operator'));
```

### 5.4 `enquiry`

```sql
ALTER TABLE enquiry ENABLE ROW LEVEL SECURITY;

-- The submitting user can read their own
CREATE POLICY enq_submitter ON enquiry FOR SELECT
  USING (user_id = auth.uid());

-- Syndicator members can read enquiries on their horses
CREATE POLICY enq_syndicator ON enquiry FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM syndicator_user su
    WHERE su.syndicator_id = enquiry.syndicator_id AND su.user_id = auth.uid() AND su.accepted_at IS NOT NULL
  ));

-- Syndicator admins can update outcome only
CREATE POLICY enq_syndicator_outcome ON enquiry FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM syndicator_user su
    WHERE su.syndicator_id = enquiry.syndicator_id AND su.user_id = auth.uid() AND su.is_admin = true
  ));

-- Operators read/write all
CREATE POLICY enq_operator ON enquiry FOR ALL
  USING (EXISTS (SELECT 1 FROM user_profile op WHERE op.id = auth.uid() AND op.role = 'operator'));

-- INSERT is done via API route with service role, not directly.
```

### 5.5 `saved_search`, `consent_ledger`, `lead_score`

Self-only: `USING (user_id = auth.uid())`. Operators can read via a dedicated `operator_read` policy.

### 5.6 `view_event`

- INSERT: allowed for any authenticated or anonymous (service-role-only API route writes it).
- SELECT: operators only. Users do not read their own view log.

### 5.7 `listing_tier`, `payment`, `subscription`

- `listing_tier`: public SELECT (catalog is public), no direct write (operator-only via admin route).
- `subscription` / `payment`: syndicator members read their own; operators read all; writes service-role only (Stripe webhook handler).

### 5.8 `audit_log`

- Operators only. No direct writes; triggers populate it via service role.

---

## 6. Triggers

- `updated_at` auto-maintenance: single `bump_updated_at()` function attached to every table with an `updated_at` column.
- `horse_active_gate` (§4.1) and `syndicator_afsl_cascade` (§4.1).
- `audit_log` population: `AFTER INSERT/UPDATE/DELETE` on `syndicator`, `horse`, `enquiry` using a shared `write_audit()` trigger function that captures `auth.uid()`, `current_setting('app.change_reason', true)`, and row snapshots.
- `horse.total_shares_remaining` maintenance: trigger on `share_tier` (insert/update) recomputes remaining from sum of unavailable tiers.
- `enquiry_count` / `view_count` / `wishlist_count` on horse: trigger-maintained from enquiry and view_event. Not a hot path — fine on write.

---

## 7. Functions

- `current_consent(user UUID) RETURNS TABLE(consent_type TEXT, granted BOOLEAN, granted_at TIMESTAMPTZ)` — resolves the live consent state from `consent_ledger`.
- `record_consent(user UUID, consent_type TEXT, granted BOOLEAN, source TEXT) RETURNS UUID` — appends a `consent_ledger` row. Called from API routes, never direct SQL.
- `recompute_lead_score(user UUID) RETURNS lead_score` — per-user scoring. Details in `docs/db/scoring.md`.

---

## 8. Migration plan

Migrations ship as timestamp-prefixed SQL files under `supabase/migrations/` (Supabase convention):

```
supabase/migrations/
  20260422120000_extensions_and_types.sql  -- pgcrypto, citext, pg_trgm, btree_gin + enums
  20260422120100_core_tables.sql           -- user_profile, syndicator, trainer, horse, share_tier, enquiry, saved_search, listing_tier, subscription, payment
  20260422120200_support_tables.sql        -- winner_archive, view_event, consent_ledger, lead_score, audit_log
  20260422120300_triggers_and_functions.sql -- updated_at, audit, counter maintenance, consent helpers
  20260422120400_rls_policies.sql          -- RLS enable + policies
  20260422120500_afsl_gate.sql             -- §4 enforcement + AFSL re-verify + consent append-only
  20260422120600_seed_listing_tiers.sql    -- basic/premium/platinum/partner rows (placeholder prices)
```

Seed data for dev (30 horses, 5 syndicators) lives in `supabase/seed.sql` and is only applied to non-production environments (Phase 2 `[SONNET]` task, blocked on Supabase project provisioning).

---

## 9. Open items (resolved later)

- **Typesense mirror schema** — Phase 3. Not a DB table but an index; will mirror the active-horse projection.
- **Full-text search on horse description** — deferred; Typesense handles it. If we need Postgres FTS as backstop, add a `tsvector` generated column on `horse`.
- **Partitioning `view_event`** — currently a plain table. Partition by month if it exceeds ~10M rows.
- **Schema versioning of `preferences` / `filter_json`** — document the JSON shape in a separate zod schema file (`lib/db/filters.ts`) and version it with a `$schemaVersion` field in the payload.

---

*— architect (v1, 2026-04-22)*
