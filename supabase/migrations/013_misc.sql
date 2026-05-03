-- Chemical treatments (lawn/pest businesses)
CREATE TABLE chemical_treatments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  job_id uuid NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  treatment text NOT NULL,
  chemical_name text,
  amount text,
  unit text,
  date date NOT NULL,
  applicator_id uuid REFERENCES users(id),
  notes text
);

CREATE INDEX ON chemical_treatments(job_id);

ALTER TABLE chemical_treatments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "business_isolation" ON chemical_treatments
  FOR ALL USING (business_id = get_my_business_id());

-- Internal notes (polymorphic — jobs, clients, visits, invoices)
CREATE TABLE notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  author_id uuid REFERENCES users(id),
  entity_type text NOT NULL CHECK (entity_type IN ('job', 'client', 'visit', 'invoice')),
  entity_id uuid NOT NULL,
  body text NOT NULL,
  is_pinned boolean DEFAULT false
);

CREATE INDEX ON notes(business_id);
CREATE INDEX ON notes(entity_type, entity_id);

ALTER TABLE notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "business_isolation" ON notes
  FOR ALL USING (business_id = get_my_business_id());

-- Reminders (email / SMS / in-app)
CREATE TABLE reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  entity_type text NOT NULL CHECK (entity_type IN ('job', 'invoice', 'client')),
  entity_id uuid NOT NULL,
  message text NOT NULL,
  remind_at timestamptz NOT NULL,
  channel text NOT NULL DEFAULT 'in_app' CHECK (channel IN ('email', 'sms', 'in_app')),
  sent boolean DEFAULT false,
  sent_at timestamptz
);

CREATE INDEX ON reminders(business_id, sent);
CREATE INDEX ON reminders(remind_at) WHERE sent = false;

ALTER TABLE reminders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "business_isolation" ON reminders
  FOR ALL USING (business_id = get_my_business_id());

-- In-app notification feed
CREATE TABLE notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type text NOT NULL,
  title text NOT NULL,
  body text,
  link text,
  read boolean DEFAULT false,
  read_at timestamptz
);

CREATE INDEX ON notifications(user_id, read);
CREATE INDEX ON notifications(business_id);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "business_isolation" ON notifications
  FOR ALL USING (business_id = get_my_business_id());

-- Audit log
CREATE TABLE audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  user_id uuid REFERENCES users(id),
  action text NOT NULL CHECK (action IN ('created', 'updated', 'deleted', 'sent', 'paid')),
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  diff jsonb,
  ip_address text
);

CREATE INDEX ON audit_log(business_id);
CREATE INDEX ON audit_log(entity_type, entity_id);

ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "business_isolation" ON audit_log
  FOR ALL USING (business_id = get_my_business_id());
