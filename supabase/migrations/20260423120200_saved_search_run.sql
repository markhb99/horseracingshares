-- Migration: 20260423120200_saved_search_run
-- Phase 3. Observability table for saved-search alert worker runs.
-- See docs/search/saved-search.md §8–9.

CREATE TABLE saved_search_run (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID        NOT NULL REFERENCES user_profile(id) ON DELETE CASCADE,
  saved_search_ids  UUID[]      NOT NULL,
  cadence           search_frequency NOT NULL,
  sent_email        BOOLEAN     NOT NULL DEFAULT false,
  email_message_id  TEXT,                     -- Resend's returned message id
  match_count       INT         NOT NULL,
  ran_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX saved_search_run_user_idx
  ON saved_search_run (user_id, ran_at DESC);

-- ─── RLS ─────────────────────────────────────────────────────────
ALTER TABLE saved_search_run ENABLE ROW LEVEL SECURITY;

-- Users can read their own run history (helpful for "why didn't I get an email?").
CREATE POLICY ssr_self ON saved_search_run
  FOR SELECT USING (user_id = auth.uid());

-- Operators can read and write all rows (for debugging and manual backfill).
CREATE POLICY ssr_operator ON saved_search_run
  FOR ALL USING (is_operator()) WITH CHECK (is_operator());

-- Worker writes via service role — no INSERT policy for authenticated role.
