-- Migration: Assign all existing users to all seeded companies as owners
-- This ensures users can see and access the companies in the dashboard

-- Insert user_companies records for all users and all companies
-- Using ON CONFLICT to avoid duplicate key errors if some assignments already exist
INSERT INTO user_companies (user_id, company_id, role)
SELECT
  u.id as user_id,
  c.id as company_id,
  'owner' as role
FROM auth.users u
CROSS JOIN companies c
ON CONFLICT (user_id, company_id) DO NOTHING;

-- Verify the assignments
DO $$
DECLARE
  assignment_count INTEGER;
  user_count INTEGER;
  company_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO assignment_count FROM user_companies;
  SELECT COUNT(*) INTO user_count FROM auth.users;
  SELECT COUNT(*) INTO company_count FROM companies;

  RAISE NOTICE 'Created % user-company assignments for % users and % companies',
    assignment_count, user_count, company_count;
END $$;
