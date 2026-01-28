-- Pending invitations table for tracking user invites
CREATE TABLE pending_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  role user_role NOT NULL DEFAULT 'client',
  invited_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  temporary_password_hash TEXT,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(email, company_id)
);

-- Index for looking up invitations by email
CREATE INDEX idx_pending_invitations_email ON pending_invitations(email);
CREATE INDEX idx_pending_invitations_company_id ON pending_invitations(company_id);
CREATE INDEX idx_pending_invitations_invited_by ON pending_invitations(invited_by);

-- Enable RLS
ALTER TABLE pending_invitations ENABLE ROW LEVEL SECURITY;

-- Admins can view invitations for companies they own/admin
CREATE POLICY "Admins can view pending invitations for their companies"
  ON pending_invitations FOR SELECT
  USING (
    company_id IN (
      SELECT company_id FROM user_companies
      WHERE user_id = auth.uid()
      AND role IN ('owner', 'admin')
    )
  );

-- Owners can insert pending invitations for their companies
CREATE POLICY "Owners can insert pending invitations"
  ON pending_invitations FOR INSERT
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM user_companies
      WHERE user_id = auth.uid()
      AND role = 'owner'
    )
  );

-- Owners can update pending invitations for their companies
CREATE POLICY "Owners can update pending invitations"
  ON pending_invitations FOR UPDATE
  USING (
    company_id IN (
      SELECT company_id FROM user_companies
      WHERE user_id = auth.uid()
      AND role = 'owner'
    )
  );

-- Owners can delete pending invitations for their companies
CREATE POLICY "Owners can delete pending invitations"
  ON pending_invitations FOR DELETE
  USING (
    company_id IN (
      SELECT company_id FROM user_companies
      WHERE user_id = auth.uid()
      AND role = 'owner'
    )
  );

-- Service role can manage all invitations (for API routes)
CREATE POLICY "Service role can manage all pending invitations"
  ON pending_invitations FOR ALL
  USING (auth.role() = 'service_role');

-- Function to process pending invitations when a user signs up
CREATE OR REPLACE FUNCTION process_pending_invitations()
RETURNS TRIGGER AS $$
DECLARE
  invitation RECORD;
BEGIN
  -- Look for pending invitations for this user's email
  FOR invitation IN
    SELECT id, company_id, role
    FROM pending_invitations
    WHERE LOWER(email) = LOWER(NEW.email)
    AND accepted_at IS NULL
    AND expires_at > NOW()
  LOOP
    -- Create user_company relationship
    INSERT INTO user_companies (user_id, company_id, role)
    VALUES (NEW.id, invitation.company_id, invitation.role)
    ON CONFLICT (user_id, company_id) DO NOTHING;

    -- Mark invitation as accepted
    UPDATE pending_invitations
    SET accepted_at = NOW(), updated_at = NOW()
    WHERE id = invitation.id;
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to process invitations on user creation
-- Note: This trigger fires on auth.users which requires special setup
-- We'll handle this in the application code instead for Supabase compatibility

-- Alternative: Create a trigger on the first login check
-- The callback route will handle processing invitations
