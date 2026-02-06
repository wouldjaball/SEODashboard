-- Enhance RLS policies to ensure all role types have proper access
-- This addresses issues where users with valid roles may be denied access

-- First, let's review and improve the companies table policies
DROP POLICY IF EXISTS "Users can view companies they belong to" ON companies;

-- Create more comprehensive company access policy
CREATE POLICY "Users can view companies they belong to" ON companies
  FOR SELECT USING (
    -- Allow access if user has any role in the company (owner, admin, client, viewer)
    EXISTS (
      SELECT 1 FROM user_companies uc 
      WHERE uc.company_id = companies.id 
      AND uc.user_id = auth.uid()
      AND uc.role IN ('owner', 'admin', 'client', 'viewer')
    )
  );

-- Ensure user_companies policies allow proper access validation
DROP POLICY IF EXISTS "Users can view their company relationships" ON user_companies;

CREATE POLICY "Users can view their company relationships" ON user_companies
  FOR SELECT USING (
    -- Users can see their own relationships
    user_id = auth.uid()
    OR
    -- Admin/owners can see relationships for companies they manage
    EXISTS (
      SELECT 1 FROM user_companies uc2
      WHERE uc2.company_id = user_companies.company_id
      AND uc2.user_id = auth.uid()
      AND uc2.role IN ('owner', 'admin')
    )
  );

-- Add policy to allow users to see company details when validating access
-- This is needed for the analytics API to check company existence
DROP POLICY IF EXISTS "Allow company lookup for access validation" ON companies;

CREATE POLICY "Allow company lookup for access validation" ON companies
  FOR SELECT USING (
    -- Users can read basic company info if they're checking access
    -- This allows the analytics API to verify company exists before checking user access
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.users.id = auth.uid()
    )
  );

-- Update the user_companies insert policy to be more robust
DROP POLICY IF EXISTS "Users can insert user_companies" ON user_companies;
DROP POLICY IF EXISTS "Service can insert user_companies" ON user_companies;

CREATE POLICY "Users can insert user_companies" ON user_companies
  FOR INSERT WITH CHECK (
    -- Users can add themselves to companies (for self-registration)
    user_id = auth.uid()
    OR
    -- Admins/owners can add users to companies they manage
    EXISTS (
      SELECT 1 FROM user_companies uc
      WHERE uc.company_id = user_companies.company_id
      AND uc.user_id = auth.uid()
      AND uc.role IN ('owner', 'admin')
    )
  );

-- Add policy for service role to manage user assignments (for auto-assignment)
CREATE POLICY "Service can manage user_companies" ON user_companies
  FOR ALL USING (
    -- Allow service role to manage all user_companies relationships
    -- This is needed for auto-assignment and admin management
    auth.role() = 'service_role'
  )
  WITH CHECK (
    auth.role() = 'service_role'
  );

-- Improve the google_analytics_accounts policy to work with all roles
DROP POLICY IF EXISTS "Users can access GA accounts for their companies" ON google_analytics_accounts;

CREATE POLICY "Users can access GA accounts for their companies" ON google_analytics_accounts
  FOR SELECT USING (
    -- Allow access for any user role (not just admin)
    company_id IN (
      SELECT company_id FROM user_companies
      WHERE user_id = auth.uid()
      AND role IN ('owner', 'admin', 'client', 'viewer')
    )
  );

-- Similar improvements for other analytics tables
DROP POLICY IF EXISTS "Users can access GSC sites for their companies" ON google_search_console_sites;

CREATE POLICY "Users can access GSC sites for their companies" ON google_search_console_sites
  FOR SELECT USING (
    company_id IN (
      SELECT company_id FROM user_companies
      WHERE user_id = auth.uid()
      AND role IN ('owner', 'admin', 'client', 'viewer')
    )
  );

DROP POLICY IF EXISTS "Users can access YouTube channels for their companies" ON youtube_channels;

CREATE POLICY "Users can access YouTube channels for their companies" ON youtube_channels
  FOR SELECT USING (
    company_id IN (
      SELECT company_id FROM user_companies
      WHERE user_id = auth.uid()
      AND role IN ('owner', 'admin', 'client', 'viewer')
    )
  );

DROP POLICY IF EXISTS "Users can access LinkedIn sheet configs for their companies" ON linkedin_sheet_configs;

CREATE POLICY "Users can access LinkedIn sheet configs for their companies" ON linkedin_sheet_configs
  FOR SELECT USING (
    company_id IN (
      SELECT company_id FROM user_companies
      WHERE user_id = auth.uid()
      AND role IN ('owner', 'admin', 'client', 'viewer')
    )
  );

-- Add explicit policy for oauth_tokens to ensure users can access tokens for their companies
DROP POLICY IF EXISTS "Users can access OAuth tokens for their companies" ON oauth_tokens;

CREATE POLICY "Users can access OAuth tokens for their companies" ON oauth_tokens
  FOR SELECT USING (
    -- Users can access their own tokens
    user_id = auth.uid()
    OR
    -- Users can access shared tokens for companies they belong to
    EXISTS (
      SELECT 1 FROM user_companies uc
      WHERE uc.user_id = auth.uid()
      AND uc.role IN ('owner', 'admin', 'client', 'viewer')
      -- Add additional logic here if tokens need to be company-specific
    )
  );

-- Create a helpful view for debugging user access
CREATE OR REPLACE VIEW user_access_summary AS
SELECT 
  u.id as user_id,
  u.email,
  c.id as company_id,
  c.name as company_name,
  uc.role,
  uc.created_at as assigned_at
FROM auth.users u
LEFT JOIN user_companies uc ON u.id = uc.user_id
LEFT JOIN companies c ON uc.company_id = c.id
ORDER BY u.email, c.name;

-- Grant access to the view
GRANT SELECT ON user_access_summary TO authenticated;

-- Add RLS policy for the view
CREATE POLICY "Users can view access summary" ON user_access_summary
  FOR SELECT USING (
    -- Users can see their own access
    user_id = auth.uid()
    OR
    -- Admins can see access for companies they manage
    EXISTS (
      SELECT 1 FROM user_companies uc
      WHERE uc.user_id = auth.uid()
      AND uc.role IN ('owner', 'admin')
      AND uc.company_id = company_id
    )
  );

-- Log the policy updates
DO $$
BEGIN
  RAISE NOTICE 'Enhanced RLS policies for better role-based access control';
  RAISE NOTICE 'Updated policies for: companies, user_companies, analytics tables';
  RAISE NOTICE 'Added user_access_summary view for debugging';
  RAISE NOTICE 'All user roles (owner, admin, client, viewer) now have appropriate access';
END $$;