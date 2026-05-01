CREATE TABLE services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  category text,
  unit_price numeric(10,2) DEFAULT 0,
  unit_cost numeric(10,2) DEFAULT 0,
  unit text DEFAULT 'flat' CHECK (unit IN ('flat', 'hourly', 'sqft', 'unit')),
  is_active boolean DEFAULT true,
  taxable boolean DEFAULT true
);

CREATE INDEX ON services(business_id);

CREATE TRIGGER set_services_updated_at
  BEFORE UPDATE ON services
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE services ENABLE ROW LEVEL SECURITY;

CREATE POLICY "business_isolation" ON services
  FOR ALL USING (business_id = get_my_business_id());

-- Service extras (add-ons per service)
CREATE TABLE service_extras (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  service_id uuid NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  price numeric(10,2) DEFAULT 0,
  cost numeric(10,2) DEFAULT 0,
  icon text,
  is_active boolean DEFAULT true
);

CREATE INDEX ON service_extras(service_id);

ALTER TABLE service_extras ENABLE ROW LEVEL SECURITY;

CREATE POLICY "business_isolation" ON service_extras
  FOR ALL USING (business_id = get_my_business_id());
