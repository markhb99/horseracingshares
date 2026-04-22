-- Migration: 20260422120400_rls_policies
-- Phase 2. Enable RLS + declare policies on every user-data table.
-- See docs/db/schema.md §5.

-- ─── helper: is_operator() ───────────────────────────────────
CREATE OR REPLACE FUNCTION is_operator() RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_profile
    WHERE id = auth.uid() AND role = 'operator' AND deleted_at IS NULL
  );
$$;

-- ─── user_profile ────────────────────────────────────────────
ALTER TABLE user_profile ENABLE ROW LEVEL SECURITY;

CREATE POLICY up_self ON user_profile FOR ALL
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

CREATE POLICY up_operator_read ON user_profile FOR SELECT USING (is_operator());

-- ─── syndicator ──────────────────────────────────────────────
ALTER TABLE syndicator ENABLE ROW LEVEL SECURITY;

CREATE POLICY synd_public_verified ON syndicator FOR SELECT
  USING (afsl_status = 'verified' AND deleted_at IS NULL);

CREATE POLICY synd_member_read ON syndicator FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM syndicator_user su
    WHERE su.syndicator_id = syndicator.id
      AND su.user_id = auth.uid()
      AND su.accepted_at IS NOT NULL
  ));

CREATE POLICY synd_admin_write ON syndicator FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM syndicator_user su
    WHERE su.syndicator_id = syndicator.id
      AND su.user_id = auth.uid()
      AND su.accepted_at IS NOT NULL
      AND su.is_admin = true
  ));

CREATE POLICY synd_operator ON syndicator FOR ALL USING (is_operator()) WITH CHECK (is_operator());

-- ─── syndicator_user ─────────────────────────────────────────
ALTER TABLE syndicator_user ENABLE ROW LEVEL SECURITY;

CREATE POLICY su_self_read ON syndicator_user FOR SELECT USING (user_id = auth.uid());
CREATE POLICY su_operator  ON syndicator_user FOR ALL    USING (is_operator()) WITH CHECK (is_operator());

-- ─── trainer (public reference data) ─────────────────────────
ALTER TABLE trainer ENABLE ROW LEVEL SECURITY;
CREATE POLICY trainer_public_read ON trainer FOR SELECT USING (true);
CREATE POLICY trainer_operator    ON trainer FOR ALL    USING (is_operator()) WITH CHECK (is_operator());

-- ─── horse ───────────────────────────────────────────────────
ALTER TABLE horse ENABLE ROW LEVEL SECURITY;

CREATE POLICY horse_public_active ON horse FOR SELECT
  USING (status = 'active' AND deleted_at IS NULL);

CREATE POLICY horse_owner_all ON horse FOR ALL
  USING (EXISTS (
    SELECT 1 FROM syndicator_user su
    WHERE su.syndicator_id = horse.syndicator_id
      AND su.user_id = auth.uid()
      AND su.accepted_at IS NOT NULL
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM syndicator_user su
    WHERE su.syndicator_id = horse.syndicator_id
      AND su.user_id = auth.uid()
      AND su.accepted_at IS NOT NULL
  ));

CREATE POLICY horse_operator ON horse FOR ALL USING (is_operator()) WITH CHECK (is_operator());

-- ─── horse_trainer / share_tier / horse_image / horse_video ──
ALTER TABLE horse_trainer ENABLE ROW LEVEL SECURITY;
ALTER TABLE share_tier    ENABLE ROW LEVEL SECURITY;
ALTER TABLE horse_image   ENABLE ROW LEVEL SECURITY;
ALTER TABLE horse_video   ENABLE ROW LEVEL SECURITY;

-- Public reads these when the parent horse is active.
CREATE POLICY ht_public_read ON horse_trainer FOR SELECT USING (
  EXISTS (SELECT 1 FROM horse h WHERE h.id = horse_trainer.horse_id AND h.status = 'active' AND h.deleted_at IS NULL)
);
CREATE POLICY st_public_read ON share_tier FOR SELECT USING (
  EXISTS (SELECT 1 FROM horse h WHERE h.id = share_tier.horse_id AND h.status = 'active' AND h.deleted_at IS NULL)
);
CREATE POLICY hi_public_read ON horse_image FOR SELECT USING (
  EXISTS (SELECT 1 FROM horse h WHERE h.id = horse_image.horse_id AND h.status = 'active' AND h.deleted_at IS NULL)
);
CREATE POLICY hv_public_read ON horse_video FOR SELECT USING (
  EXISTS (SELECT 1 FROM horse h WHERE h.id = horse_video.horse_id AND h.status = 'active' AND h.deleted_at IS NULL)
);

-- Syndicator members can write all child rows for their horses.
CREATE POLICY ht_member_rw ON horse_trainer FOR ALL USING (
  EXISTS (
    SELECT 1 FROM horse h JOIN syndicator_user su ON su.syndicator_id = h.syndicator_id
    WHERE h.id = horse_trainer.horse_id AND su.user_id = auth.uid() AND su.accepted_at IS NOT NULL
  )
);
CREATE POLICY st_member_rw ON share_tier FOR ALL USING (
  EXISTS (
    SELECT 1 FROM horse h JOIN syndicator_user su ON su.syndicator_id = h.syndicator_id
    WHERE h.id = share_tier.horse_id AND su.user_id = auth.uid() AND su.accepted_at IS NOT NULL
  )
);
CREATE POLICY hi_member_rw ON horse_image FOR ALL USING (
  EXISTS (
    SELECT 1 FROM horse h JOIN syndicator_user su ON su.syndicator_id = h.syndicator_id
    WHERE h.id = horse_image.horse_id AND su.user_id = auth.uid() AND su.accepted_at IS NOT NULL
  )
);
CREATE POLICY hv_member_rw ON horse_video FOR ALL USING (
  EXISTS (
    SELECT 1 FROM horse h JOIN syndicator_user su ON su.syndicator_id = h.syndicator_id
    WHERE h.id = horse_video.horse_id AND su.user_id = auth.uid() AND su.accepted_at IS NOT NULL
  )
);

CREATE POLICY ht_operator ON horse_trainer FOR ALL USING (is_operator()) WITH CHECK (is_operator());
CREATE POLICY st_operator ON share_tier    FOR ALL USING (is_operator()) WITH CHECK (is_operator());
CREATE POLICY hi_operator ON horse_image   FOR ALL USING (is_operator()) WITH CHECK (is_operator());
CREATE POLICY hv_operator ON horse_video   FOR ALL USING (is_operator()) WITH CHECK (is_operator());

-- ─── enquiry ─────────────────────────────────────────────────
ALTER TABLE enquiry ENABLE ROW LEVEL SECURITY;

-- Users see their own enquiries.
CREATE POLICY enq_submitter_read ON enquiry FOR SELECT USING (user_id = auth.uid());

-- Syndicator members see enquiries on their horses.
CREATE POLICY enq_synd_read ON enquiry FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM syndicator_user su
    WHERE su.syndicator_id = enquiry.syndicator_id
      AND su.user_id = auth.uid()
      AND su.accepted_at IS NOT NULL
  ));

-- Syndicator admins can update outcome on their enquiries only.
CREATE POLICY enq_synd_outcome_update ON enquiry FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM syndicator_user su
    WHERE su.syndicator_id = enquiry.syndicator_id
      AND su.user_id = auth.uid()
      AND su.accepted_at IS NOT NULL
      AND su.is_admin = true
  ));

CREATE POLICY enq_operator ON enquiry FOR ALL USING (is_operator()) WITH CHECK (is_operator());

-- INSERT handled by service-role-only API route (POST /api/enquiry).
-- No policy grants direct INSERT to anon / authenticated.

-- ─── saved_search ────────────────────────────────────────────
ALTER TABLE saved_search ENABLE ROW LEVEL SECURITY;
CREATE POLICY ss_self     ON saved_search FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY ss_operator ON saved_search FOR SELECT USING (is_operator());

-- ─── listing_tier (public catalog) ───────────────────────────
ALTER TABLE listing_tier ENABLE ROW LEVEL SECURITY;
CREATE POLICY lt_public_read ON listing_tier FOR SELECT USING (is_active = true);
CREATE POLICY lt_operator    ON listing_tier FOR ALL    USING (is_operator()) WITH CHECK (is_operator());

-- ─── subscription / payment ──────────────────────────────────
ALTER TABLE subscription ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment      ENABLE ROW LEVEL SECURITY;

CREATE POLICY sub_member_read ON subscription FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM syndicator_user su
    WHERE su.syndicator_id = subscription.syndicator_id
      AND su.user_id = auth.uid()
      AND su.accepted_at IS NOT NULL
  ));
CREATE POLICY sub_operator ON subscription FOR ALL USING (is_operator()) WITH CHECK (is_operator());

CREATE POLICY pay_member_read ON payment FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM syndicator_user su
    WHERE su.syndicator_id = payment.syndicator_id
      AND su.user_id = auth.uid()
      AND su.accepted_at IS NOT NULL
  ));
CREATE POLICY pay_operator ON payment FOR ALL USING (is_operator()) WITH CHECK (is_operator());

-- Writes to subscription and payment come exclusively from the Stripe
-- webhook handler using the service role (bypasses RLS).

-- ─── winner_archive (public) ─────────────────────────────────
ALTER TABLE winner_archive ENABLE ROW LEVEL SECURITY;
CREATE POLICY wa_public_read ON winner_archive FOR SELECT USING (true);
CREATE POLICY wa_operator    ON winner_archive FOR ALL    USING (is_operator()) WITH CHECK (is_operator());

-- ─── view_event (operator-only read; writes via service role) ───
ALTER TABLE view_event ENABLE ROW LEVEL SECURITY;
CREATE POLICY ve_operator_read ON view_event FOR SELECT USING (is_operator());
-- No INSERT/UPDATE/DELETE policy for client roles — API route writes via service role.

-- ─── consent_ledger ──────────────────────────────────────────
ALTER TABLE consent_ledger ENABLE ROW LEVEL SECURITY;

CREATE POLICY cl_self_read ON consent_ledger FOR SELECT USING (user_id = auth.uid());
CREATE POLICY cl_operator  ON consent_ledger FOR SELECT USING (is_operator());

-- Append-only: only INSERT allowed for self, never UPDATE or DELETE.
CREATE POLICY cl_self_insert ON consent_ledger FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- ─── lead_score ──────────────────────────────────────────────
ALTER TABLE lead_score ENABLE ROW LEVEL SECURITY;
CREATE POLICY ls_self_read ON lead_score FOR SELECT USING (user_id = auth.uid());
CREATE POLICY ls_operator  ON lead_score FOR ALL    USING (is_operator()) WITH CHECK (is_operator());
-- Worker writes via service role.

-- ─── audit_log (operator-only read) ──────────────────────────
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY al_operator_read ON audit_log FOR SELECT USING (is_operator());
-- Populated by write_audit() trigger via SECURITY DEFINER.
