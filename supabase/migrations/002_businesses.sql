CREATE TABLE businesses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  name text NOT NULL,
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email text,
  phone text,
  address text,
  city text,
  state text,
  zip text,
  country text DEFAULT 'US',
  logo_url text,
  timezone text DEFAULT 'America/New_York',
  currency text DEFAULT 'USD',
  stripe_customer_id text,
  stripe_subscription_id text,
  plan text DEFAULT 'starter',
  plan_status text DEFAULT 'trialing',
  trial_ends_at timestamptz DEFAULT (now() + interval '14 days')
);

CREATE TRIGGER set_businesses_updated_at
  BEFORE UPDATE ON businesses
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE businesses ENABLE ROW LEVEL SECURITY;

-- Owners can only see and manage their own business
CREATE POLICY "business_owner_access" ON businesses
  FOR ALL USING (owner_id = auth.uid());
