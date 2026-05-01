ALTER TABLE requests
  ADD COLUMN IF NOT EXISTS requested_on date DEFAULT CURRENT_DATE,
  ADD COLUMN IF NOT EXISTS reminder_at timestamptz,
  ADD COLUMN IF NOT EXISTS image_url text;

INSERT INTO storage.buckets (id, name, public)
VALUES ('request-images', 'request-images', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "auth_read_request_images" ON storage.objects
  FOR SELECT USING (bucket_id = 'request-images');

CREATE POLICY "auth_upload_request_images" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'request-images' AND auth.uid() IS NOT NULL
  );
