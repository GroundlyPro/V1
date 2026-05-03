ALTER TABLE businesses
  ADD COLUMN IF NOT EXISTS job_reminders_enabled boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS job_reminder_24h boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS job_reminder_1h boolean DEFAULT true;

ALTER TABLE jobs
  ADD COLUMN IF NOT EXISTS client_confirmation_sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS cleaner_confirmation_sent_at timestamptz;
