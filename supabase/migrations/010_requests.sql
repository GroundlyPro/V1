CREATE TABLE requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  client_id uuid REFERENCES clients(id),
  first_name text NOT NULL,
  last_name text NOT NULL,
  email text,
  phone text,
  address text,
  service_type text,
  message text,
  source text NOT NULL DEFAULT 'manual'
    CHECK (source IN ('booking_widget', 'manual', 'phone', 'referral')),
  status text NOT NULL DEFAULT 'new'
    CHECK (status IN ('new', 'assessment_needed', 'converted', 'declined', 'overdue')),
  converted_to_quote_id uuid REFERENCES quotes(id),
  converted_to_job_id uuid REFERENCES jobs(id),
  assigned_to uuid REFERENCES users(id)
);

CREATE INDEX ON requests(business_id);
CREATE INDEX ON requests(business_id, status);

CREATE TRIGGER set_requests_updated_at
  BEFORE UPDATE ON requests
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "business_isolation" ON requests
  FOR ALL USING (business_id = get_my_business_id());
