-- Allow a newly authenticated business owner to create their initial app user row.
-- Existing business_isolation policy cannot cover this first insert because
-- get_my_business_id() returns NULL until the users row exists.
CREATE POLICY "owner_can_create_initial_profile" ON users
  FOR INSERT
  WITH CHECK (
    auth_user_id = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM businesses
      WHERE businesses.id = users.business_id
        AND businesses.owner_id = auth.uid()
    )
  );
