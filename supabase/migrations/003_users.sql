CREATE TABLE users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  auth_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  first_name text NOT NULL,
  last_name text NOT NULL,
  email text NOT NULL,
  phone text,
  role text NOT NULL DEFAULT 'field_tech' CHECK (role IN ('owner', 'admin', 'field_tech', 'office')),
  avatar_url text,
  hourly_rate numeric(10,2),
  is_active boolean DEFAULT true
);

CREATE INDEX ON users(business_id);
CREATE INDEX ON users(auth_user_id);

CREATE TRIGGER set_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Now that the users table exists, define the helper used by all other RLS policies
CREATE OR REPLACE FUNCTION get_my_business_id()
RETURNS uuid AS $$
  SELECT business_id FROM users
  WHERE auth_user_id = auth.uid()
  LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- SECURITY DEFINER bypasses RLS on users, so no recursion
CREATE POLICY "business_isolation" ON users
  FOR ALL USING (business_id = get_my_business_id());
