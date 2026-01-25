-- Migration: Ensure all existing users have owner role for all companies
-- This fixes the "Failed to save mappings" issue caused by missing owner/admin role

-- Update any existing user_companies entries with null or non-admin roles to 'owner'
UPDATE user_companies
SET role = 'owner'
WHERE role IS NULL OR role NOT IN ('owner', 'admin');

-- Insert missing user_companies records for all users and companies
-- This ensures every user can manage every company
INSERT INTO user_companies (user_id, company_id, role)
SELECT
  u.id as user_id,
  c.id as company_id,
  'owner' as role
FROM auth.users u
CROSS JOIN companies c
WHERE NOT EXISTS (
  SELECT 1 FROM user_companies uc
  WHERE uc.user_id = u.id AND uc.company_id = c.id
)
ON CONFLICT (user_id, company_id) DO UPDATE SET role = 'owner';

-- Verify the assignments
DO $$
DECLARE
  assignment_count INTEGER;
  user_count INTEGER;
  company_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO assignment_count FROM user_companies WHERE role = 'owner';
  SELECT COUNT(*) INTO user_count FROM auth.users;
  SELECT COUNT(*) INTO company_count FROM companies;

  RAISE NOTICE 'Owner assignments: % for % users and % companies',
    assignment_count, user_count, company_count;
END $$;
