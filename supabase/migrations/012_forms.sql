CREATE TABLE job_forms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  name text NOT NULL,
  fields jsonb DEFAULT '[]',
  is_active boolean DEFAULT true
);

CREATE INDEX ON job_forms(business_id);

ALTER TABLE job_forms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "business_isolation" ON job_forms
  FOR ALL USING (business_id = get_my_business_id());

CREATE TABLE visit_form_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  visit_id uuid NOT NULL REFERENCES job_visits(id) ON DELETE CASCADE,
  form_id uuid NOT NULL REFERENCES job_forms(id),
  user_id uuid REFERENCES users(id),
  responses jsonb DEFAULT '{}',
  submitted_at timestamptz DEFAULT now()
);

CREATE INDEX ON visit_form_responses(visit_id);

ALTER TABLE visit_form_responses ENABLE ROW LEVEL SECURITY;

-- Inherit access via visit → job → business
CREATE POLICY "business_isolation" ON visit_form_responses
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM job_visits v
      WHERE v.id = visit_id AND v.business_id = get_my_business_id()
    )
  );
