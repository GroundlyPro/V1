CREATE TABLE labor_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  job_id uuid NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  visit_id uuid REFERENCES job_visits(id) ON DELETE SET NULL,
  user_id uuid NOT NULL REFERENCES users(id),
  business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  notes text,
  date date NOT NULL,
  start_time timestamptz,
  end_time timestamptz,
  hours numeric(5,2) DEFAULT 0,
  hourly_rate numeric(10,2) DEFAULT 0,
  total_cost numeric(10,2) DEFAULT 0
);

CREATE INDEX ON labor_entries(job_id);
CREATE INDEX ON labor_entries(business_id);

CREATE TRIGGER set_labor_entries_updated_at
  BEFORE UPDATE ON labor_entries
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE labor_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "business_isolation" ON labor_entries
  FOR ALL USING (business_id = get_my_business_id());

CREATE TABLE expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  job_id uuid NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  user_id uuid REFERENCES users(id),
  item text NOT NULL,
  description text,
  date date NOT NULL,
  amount numeric(10,2) DEFAULT 0,
  receipt_url text,
  category text DEFAULT 'other'
    CHECK (category IN ('materials', 'fuel', 'equipment', 'other'))
);

CREATE INDEX ON expenses(job_id);
CREATE INDEX ON expenses(business_id);

CREATE TRIGGER set_expenses_updated_at
  BEFORE UPDATE ON expenses
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "business_isolation" ON expenses
  FOR ALL USING (business_id = get_my_business_id());
