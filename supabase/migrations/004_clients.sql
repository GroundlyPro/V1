CREATE TABLE clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  first_name text NOT NULL,
  last_name text NOT NULL,
  company_name text,
  email text,
  phone text,
  type text NOT NULL DEFAULT 'residential' CHECK (type IN ('residential', 'commercial')),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'lead', 'inactive')),
  lead_source text CHECK (lead_source IN ('google', 'referral', 'social', 'website', 'other')),
  notes text,
  tags text[],
  balance numeric(10,2) DEFAULT 0
);

CREATE INDEX ON clients(business_id);
CREATE INDEX ON clients(business_id, status);

CREATE TRIGGER set_clients_updated_at
  BEFORE UPDATE ON clients
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE clients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "business_isolation" ON clients
  FOR ALL USING (business_id = get_my_business_id());

-- Client addresses
CREATE TABLE client_addresses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  label text,
  street1 text NOT NULL,
  street2 text,
  city text NOT NULL,
  state text NOT NULL,
  zip text NOT NULL,
  country text DEFAULT 'US',
  lat numeric(10,6),
  lng numeric(10,6),
  is_billing boolean DEFAULT false,
  is_primary boolean DEFAULT true,
  tax_rate_id uuid
);

CREATE INDEX ON client_addresses(client_id);
CREATE INDEX ON client_addresses(business_id);

CREATE TRIGGER set_client_addresses_updated_at
  BEFORE UPDATE ON client_addresses
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE client_addresses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "business_isolation" ON client_addresses
  FOR ALL USING (business_id = get_my_business_id());

-- Client contacts (additional contacts per client)
CREATE TABLE client_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  name text NOT NULL,
  email text,
  phone text,
  relationship text
);

CREATE INDEX ON client_contacts(client_id);

ALTER TABLE client_contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "business_isolation" ON client_contacts
  FOR ALL USING (business_id = get_my_business_id());
