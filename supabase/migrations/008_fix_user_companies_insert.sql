-- Fix user_companies INSERT policy to allow users to add themselves to new companies
-- The current policy has a chicken-and-egg problem: you need to be an owner to insert,
-- but you can't be an owner until you're inserted.

-- Drop the old restrictive policy
DROP POLICY IF EXISTS "Owners can insert user_companies" ON user_companies;

-- Create a new policy that allows:
-- 1. Users to add themselves as owner to any company (for company creation flow)
-- 2. Existing owners to add other users to their companies
CREATE POLICY "Users can insert user_companies"
  ON user_companies FOR INSERT
  WITH CHECK (
    -- Allow users to add themselves (for creating new companies and self-assignment)
    (user_id = auth.uid())
    OR
    -- Allow existing owners to add other users to their companies
    (
      company_id IN (
        SELECT company_id FROM user_companies
        WHERE user_id = auth.uid()
        AND role = 'owner'
      )
    )
  );
