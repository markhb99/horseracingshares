-- supabase/migrations/20260426150000_horse_photos_storage.sql
-- Create horse-photos storage bucket and access policies.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'horse-photos',
  'horse-photos',
  true,
  8388608,
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
) ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Authenticated users can upload horse photos"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'horse-photos');

CREATE POLICY "Authenticated users can delete horse photos"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'horse-photos');

CREATE POLICY "Public read horse photos"
  ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'horse-photos');

-- ─── horse_image RLS ──────────────────────────────────────────

ALTER TABLE horse_image ENABLE ROW LEVEL SECURITY;

CREATE POLICY horse_image_public_read ON horse_image FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM horse h
      WHERE h.id = horse_image.horse_id
        AND h.status = 'active'
        AND h.deleted_at IS NULL
    )
  );

CREATE POLICY horse_image_syndicator_read ON horse_image FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM horse h
      JOIN syndicator_user su ON su.syndicator_id = h.syndicator_id
      WHERE h.id = horse_image.horse_id
        AND su.user_id = auth.uid()
    )
  );

CREATE POLICY horse_image_operator_all ON horse_image FOR ALL
  USING (is_operator()) WITH CHECK (is_operator());
