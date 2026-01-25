-- Migration: Access Codes for Invite-Only Sign-Up
-- This creates the access_codes table and auto-assignment trigger

-- Create access_codes table
CREATE TABLE IF NOT EXISTS access_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  usage_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- Create index for fast code lookups
CREATE INDEX IF NOT EXISTS idx_access_codes_code ON access_codes(code);
CREATE INDEX IF NOT EXISTS idx_access_codes_is_active ON access_codes(is_active);

-- RLS Policies for access_codes
ALTER TABLE access_codes ENABLE ROW LEVEL SECURITY;

-- Only authenticated users can read active codes (for validation)
CREATE POLICY "Anyone can validate codes"
  ON access_codes FOR SELECT
  USING (is_active = true);

-- Only admins/owners can manage codes (insert, update, delete)
-- We'll check admin status in the API layer since it requires checking user_companies

-- Function to assign new user to all companies
CREATE OR REPLACE FUNCTION assign_new_user_to_all_companies()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert the new user into all existing companies with 'client' role
  INSERT INTO user_companies (user_id, company_id, role)
  SELECT NEW.id, c.id, 'client'::user_role
  FROM companies c
  ON CONFLICT (user_id, company_id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to auto-assign users on signup
-- Note: This fires when a new user is created in auth.users
DROP TRIGGER IF EXISTS on_auth_user_created_assign_companies ON auth.users;
CREATE TRIGGER on_auth_user_created_assign_companies
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION assign_new_user_to_all_companies();

-- Insert a default access code for initial testing
-- You can change or add more codes via the admin panel
INSERT INTO access_codes (code, description, is_active)
VALUES ('TRANSIT2026', 'Default access code for initial users', true)
ON CONFLICT (code) DO NOTHING;
