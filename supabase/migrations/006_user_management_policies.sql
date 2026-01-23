-- User Management Policies
-- Allow owners to update user roles in their companies and remove users

-- Allow owners to update user roles in their companies
CREATE POLICY "Owners can update user company roles"
  ON user_companies FOR UPDATE
  USING (
    company_id IN (
      SELECT company_id FROM user_companies
      WHERE user_id = auth.uid() AND role = 'owner'
    )
  );

-- Allow owners to remove users from their companies
CREATE POLICY "Owners can remove users from companies"
  ON user_companies FOR DELETE
  USING (
    company_id IN (
      SELECT company_id FROM user_companies
      WHERE user_id = auth.uid() AND role = 'owner'
    )
  );

-- Note: INSERT policy already exists in 002_rls_policies.sql (line 41-49)
-- It allows owners to add users to companies they own
