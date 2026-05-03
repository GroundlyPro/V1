CREATE TABLE tax_rates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  name text NOT NULL,
  rate numeric(5,2) NOT NULL,
  is_default boolean DEFAULT false
);

CREATE INDEX ON tax_rates(business_id);

CREATE TRIGGER set_tax_rates_updated_at
  BEFORE UPDATE ON tax_rates
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE tax_rates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "business_isolation" ON tax_rates
  FOR ALL USING (business_id = get_my_business_id());
