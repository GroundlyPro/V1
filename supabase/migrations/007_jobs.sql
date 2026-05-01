CREATE TABLE jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES clients(id),
  address_id uuid REFERENCES client_addresses(id),
  quote_id uuid REFERENCES quotes(id),
  job_number text NOT NULL DEFAULT ('JOB-' || nextval('job_number_seq')::text),
  title text NOT NULL,
  type text NOT NULL DEFAULT 'one_off' CHECK (type IN ('one_off', 'recurring')),
  status text NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'in_progress', 'completed', 'closed', 'cancelled')),
  frequency text CHECK (frequency IN ('one_time', 'weekly', 'biweekly', 'monthly')),
  start_date date,
  end_date date,
  instructions text,
  internal_notes text,
  billing_type text DEFAULT 'on_completion'
    CHECK (billing_type IN ('on_completion', 'on_visit', 'custom')),
  auto_payments boolean DEFAULT false,
  total_price numeric(10,2) DEFAULT 0,
  total_cost numeric(10,2) DEFAULT 0,
  profit numeric(10,2) DEFAULT 0,
  profit_margin numeric(5,2) DEFAULT 0,
  created_by uuid REFERENCES users(id)
);

CREATE INDEX ON jobs(business_id);
CREATE INDEX ON jobs(business_id, status);
CREATE INDEX ON jobs(client_id);

CREATE TRIGGER set_jobs_updated_at
  BEFORE UPDATE ON jobs
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "business_isolation" ON jobs
  FOR ALL USING (business_id = get_my_business_id());

-- Job line items
CREATE TABLE job_line_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  job_id uuid NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  service_id uuid REFERENCES services(id),
  name text NOT NULL,
  description text,
  quantity numeric(10,2) DEFAULT 1,
  unit_cost numeric(10,2) DEFAULT 0,
  unit_price numeric(10,2) DEFAULT 0,
  total numeric(10,2) DEFAULT 0,
  sort_order int DEFAULT 0
);

CREATE INDEX ON job_line_items(job_id);

ALTER TABLE job_line_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "business_isolation" ON job_line_items
  FOR ALL USING (business_id = get_my_business_id());

-- Job visits (scheduled appointments)
CREATE TABLE job_visits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  job_id uuid NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT 'Visit',
  instructions text,
  scheduled_date date,
  start_time time,
  end_time time,
  status text NOT NULL DEFAULT 'scheduled'
    CHECK (status IN ('scheduled', 'in_progress', 'completed', 'skipped')),
  completed_at timestamptz,
  checklist_completed boolean DEFAULT false
);

CREATE INDEX ON job_visits(business_id);
CREATE INDEX ON job_visits(scheduled_date, business_id);
CREATE INDEX ON job_visits(job_id);

CREATE TRIGGER set_job_visits_updated_at
  BEFORE UPDATE ON job_visits
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE job_visits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "business_isolation" ON job_visits
  FOR ALL USING (business_id = get_my_business_id());

-- Visit assignments (which team members are on a visit)
CREATE TABLE visit_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  visit_id uuid NOT NULL REFERENCES job_visits(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE
);

CREATE INDEX ON visit_assignments(visit_id);

ALTER TABLE visit_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "business_isolation" ON visit_assignments
  FOR ALL USING (business_id = get_my_business_id());
