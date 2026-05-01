ALTER TABLE businesses
  ADD COLUMN IF NOT EXISTS industry text DEFAULT 'other',
  ADD COLUMN IF NOT EXISTS email_notifications boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS sms_notifications boolean DEFAULT false;

CREATE UNIQUE INDEX IF NOT EXISTS users_business_email_unique
  ON users(business_id, email);
