CREATE TABLE invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES clients(id),
  job_id uuid REFERENCES jobs(id),
  invoice_number text NOT NULL DEFAULT ('INV-' || nextval('invoice_number_seq')::text),
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'sent', 'upcoming', 'paid', 'past_due', 'void')),
  issue_date date NOT NULL DEFAULT CURRENT_DATE,
  due_date date NOT NULL,
  subtotal numeric(10,2) DEFAULT 0,
  discount_amount numeric(10,2) DEFAULT 0,
  tax_amount numeric(10,2) DEFAULT 0,
  total numeric(10,2) DEFAULT 0,
  amount_paid numeric(10,2) DEFAULT 0,
  balance numeric(10,2) DEFAULT 0,
  payment_method text CHECK (payment_method IN ('card', 'cash', 'check', 'ach')),
  notes text,
  sent_at timestamptz,
  paid_at timestamptz,
  stripe_invoice_id text
);

CREATE INDEX ON invoices(business_id);
CREATE INDEX ON invoices(business_id, status);
CREATE INDEX ON invoices(client_id);
CREATE INDEX ON invoices(due_date) WHERE status = 'past_due';

CREATE TRIGGER set_invoices_updated_at
  BEFORE UPDATE ON invoices
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "business_isolation" ON invoices
  FOR ALL USING (business_id = get_my_business_id());

-- Invoice line items
CREATE TABLE invoice_line_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  invoice_id uuid NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  quantity numeric(10,2) DEFAULT 1,
  unit_price numeric(10,2) DEFAULT 0,
  total numeric(10,2) DEFAULT 0,
  sort_order int DEFAULT 0
);

CREATE INDEX ON invoice_line_items(invoice_id);

ALTER TABLE invoice_line_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "business_isolation" ON invoice_line_items
  FOR ALL USING (business_id = get_my_business_id());

-- Payments
CREATE TABLE payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  invoice_id uuid NOT NULL REFERENCES invoices(id),
  client_id uuid NOT NULL REFERENCES clients(id),
  amount numeric(10,2) NOT NULL,
  method text NOT NULL CHECK (method IN ('card', 'cash', 'check', 'ach')),
  stripe_payment_intent_id text,
  status text NOT NULL DEFAULT 'succeeded'
    CHECK (status IN ('pending', 'succeeded', 'failed', 'refunded')),
  paid_at timestamptz DEFAULT now(),
  notes text
);

CREATE INDEX ON payments(invoice_id);
CREATE INDEX ON payments(business_id);

CREATE TRIGGER set_payments_updated_at
  BEFORE UPDATE ON payments
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "business_isolation" ON payments
  FOR ALL USING (business_id = get_my_business_id());
