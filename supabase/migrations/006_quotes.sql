CREATE TABLE quotes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES clients(id),
  address_id uuid REFERENCES client_addresses(id),
  quote_number text NOT NULL DEFAULT ('Q-' || nextval('quote_number_seq')::text),
  title text NOT NULL,
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'sent', 'approved', 'changes_requested', 'expired', 'declined')),
  service_id uuid REFERENCES services(id),
  frequency text CHECK (frequency IN ('one_time', 'weekly', 'biweekly', 'monthly')),
  subtotal numeric(10,2) DEFAULT 0,
  discount_amount numeric(10,2) DEFAULT 0,
  tax_amount numeric(10,2) DEFAULT 0,
  total numeric(10,2) DEFAULT 0,
  message_to_client text,
  internal_notes text,
  valid_until date,
  sent_at timestamptz,
  approved_at timestamptz,
  created_by uuid REFERENCES users(id)
);

CREATE INDEX ON quotes(business_id);
CREATE INDEX ON quotes(business_id, status);
CREATE INDEX ON quotes(client_id);

CREATE TRIGGER set_quotes_updated_at
  BEFORE UPDATE ON quotes
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE quotes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "business_isolation" ON quotes
  FOR ALL USING (business_id = get_my_business_id());

-- Quote line items
CREATE TABLE quote_line_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  quote_id uuid NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
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

CREATE INDEX ON quote_line_items(quote_id);

ALTER TABLE quote_line_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "business_isolation" ON quote_line_items
  FOR ALL USING (business_id = get_my_business_id());
