
-- brand: readable by anyone (served through /api/public/brand)
CREATE POLICY "brand_read_all" ON storage.objects FOR SELECT
  TO anon, authenticated USING (bucket_id = 'brand');

-- uploads: user can manage files inside their own folder (path prefix = auth.uid())
CREATE POLICY "uploads_read_own" ON storage.objects FOR SELECT
  TO authenticated USING (bucket_id = 'uploads' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "uploads_insert_own" ON storage.objects FOR INSERT
  TO authenticated WITH CHECK (bucket_id = 'uploads' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "uploads_update_own" ON storage.objects FOR UPDATE
  TO authenticated USING (bucket_id = 'uploads' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "uploads_delete_own" ON storage.objects FOR DELETE
  TO authenticated USING (bucket_id = 'uploads' AND (storage.foldername(name))[1] = auth.uid()::text);
