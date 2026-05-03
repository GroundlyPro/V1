-- Create Supabase Storage buckets
INSERT INTO storage.buckets (id, name, public)
VALUES
  ('business-logos', 'business-logos', true),
  ('expense-receipts', 'expense-receipts', false),
  ('client-files', 'client-files', false),
  ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Business logos: owners can upload their own logo
CREATE POLICY "owner_upload_logo" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'business-logos' AND auth.uid() IS NOT NULL
  );

CREATE POLICY "public_read_logos" ON storage.objects
  FOR SELECT USING (bucket_id = 'business-logos');

-- Avatars: authenticated users can upload
CREATE POLICY "auth_upload_avatar" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'avatars' AND auth.uid() IS NOT NULL
  );

CREATE POLICY "public_read_avatars" ON storage.objects
  FOR SELECT USING (bucket_id = 'avatars');

-- Expense receipts and client files: private — only authenticated
CREATE POLICY "auth_read_expense_receipts" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'expense-receipts' AND auth.uid() IS NOT NULL
  );

CREATE POLICY "auth_upload_expense_receipts" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'expense-receipts' AND auth.uid() IS NOT NULL
  );

CREATE POLICY "auth_read_client_files" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'client-files' AND auth.uid() IS NOT NULL
  );

CREATE POLICY "auth_upload_client_files" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'client-files' AND auth.uid() IS NOT NULL
  );
