-- supabase/migrations/20260425130200_syndicator_horse_rls.sql
-- Syndicator users can insert/update their own horses.

CREATE POLICY horse_syndicator_insert ON horse
  FOR INSERT TO authenticated
  WITH CHECK (
    syndicator_id IN (
      SELECT syndicator_id FROM syndicator_user WHERE user_id = auth.uid()
    )
  );

CREATE POLICY horse_syndicator_update ON horse
  FOR UPDATE TO authenticated
  USING (
    syndicator_id IN (
      SELECT syndicator_id FROM syndicator_user WHERE user_id = auth.uid()
    )
  );
