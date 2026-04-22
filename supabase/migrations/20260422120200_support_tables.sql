-- Migration: 20260422120200_support_tables
-- Phase 2. winner_archive, view_event, consent_ledger, lead_score, audit_log.
-- See docs/db/schema.md §3.14–3.18.

-- ─── winner_archive ──────────────────────────────────────────
CREATE TABLE winner_archive (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  horse_id         UUID REFERENCES horse(id),
  horse_name       TEXT NOT NULL,
  race_name        TEXT NOT NULL,
  race_date        DATE NOT NULL,
  track            TEXT NOT NULL,
  position         SMALLINT,
  prizemoney_cents INTEGER,
  field_size       SMALLINT,
  black_type       TEXT,
  distance_m       INTEGER,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX winner_archive_horse_idx     ON winner_archive(horse_id);
CREATE INDEX winner_archive_race_date_idx ON winner_archive(race_date DESC);

-- ─── view_event ──────────────────────────────────────────────
CREATE TABLE view_event (
  id          BIGSERIAL PRIMARY KEY,
  user_id     UUID REFERENCES user_profile(id),
  session_id  TEXT NOT NULL,
  horse_id    UUID REFERENCES horse(id),
  event_type  TEXT NOT NULL CHECK (event_type IN (
                'view','save','enquiry_start','enquiry_submit','cost_calc','pds_download'
              )),
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  dwell_ms    INTEGER,
  source      TEXT
);

CREATE INDEX view_event_user_time_idx  ON view_event(user_id, occurred_at DESC) WHERE user_id IS NOT NULL;
CREATE INDEX view_event_horse_time_idx ON view_event(horse_id, occurred_at DESC);
CREATE INDEX view_event_session_idx    ON view_event(session_id, occurred_at DESC);

-- ─── consent_ledger (append-only) ────────────────────────────
CREATE TABLE consent_ledger (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES user_profile(id) ON DELETE CASCADE,
  consent_type TEXT NOT NULL CHECK (consent_type IN (
                 'marketing_email',
                 'marketing_sms',
                 'share_with_syndicator_on_enquiry',
                 'share_with_regal_partner_matches',
                 'analytics_session_replay'
               )),
  granted      BOOLEAN NOT NULL,
  source       TEXT NOT NULL,
  ip_address   INET,
  user_agent   TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX consent_ledger_user_type_idx
  ON consent_ledger(user_id, consent_type, created_at DESC);

-- No UPDATE / DELETE on consent_ledger — enforced by policy in the RLS migration.

-- ─── lead_score (1:1 with user_profile) ──────────────────────
CREATE TABLE lead_score (
  user_id               UUID PRIMARY KEY REFERENCES user_profile(id) ON DELETE CASCADE,
  score                 INTEGER NOT NULL DEFAULT 0 CHECK (score >= 0 AND score <= 100),
  band                  TEXT NOT NULL DEFAULT 'cold' CHECK (band IN ('cold','warm','hot','fire')),
  last_enquiry_at       TIMESTAMPTZ,
  last_view_at          TIMESTAMPTZ,
  view_count_30d        INTEGER NOT NULL DEFAULT 0,
  enquiry_count_90d     INTEGER NOT NULL DEFAULT 0,
  declared_budget_cents INTEGER,
  computed_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX lead_score_band_idx  ON lead_score(band);
CREATE INDEX lead_score_score_idx ON lead_score(score DESC);

-- ─── audit_log (compliance-critical writes) ──────────────────
CREATE TABLE audit_log (
  id            BIGSERIAL PRIMARY KEY,
  table_name    TEXT NOT NULL,
  row_id        UUID NOT NULL,
  action        TEXT NOT NULL CHECK (action IN ('INSERT','UPDATE','DELETE')),
  changed_by    UUID REFERENCES user_profile(id),
  change_reason TEXT,
  old_row       JSONB,
  new_row       JSONB,
  occurred_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX audit_log_target_idx ON audit_log(table_name, row_id, occurred_at DESC);
CREATE INDEX audit_log_actor_idx  ON audit_log(changed_by, occurred_at DESC);
