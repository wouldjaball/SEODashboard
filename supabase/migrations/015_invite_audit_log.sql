-- Migration: Create invite_audit_log table for tracking and rate limiting
-- This table logs all invitation-related actions for audit trail and rate limiting

CREATE TABLE IF NOT EXISTS invite_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action TEXT NOT NULL CHECK (action IN ('invite', 'resend', 'revoke', 'accept')),
  target_email TEXT NOT NULL,
  company_ids UUID[] NOT NULL DEFAULT '{}',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for rate limiting queries (admin actions in last hour)
CREATE INDEX idx_invite_audit_admin_time ON invite_audit_log(admin_id, created_at DESC);

-- Index for looking up actions by target email
CREATE INDEX idx_invite_audit_email ON invite_audit_log(target_email);

-- Index for action type filtering
CREATE INDEX idx_invite_audit_action ON invite_audit_log(action, created_at DESC);

-- RLS Policies
ALTER TABLE invite_audit_log ENABLE ROW LEVEL SECURITY;

-- Admins can view audit logs for companies they own
CREATE POLICY "Admins can view audit logs for their companies"
  ON invite_audit_log FOR SELECT
  USING (
    admin_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM user_companies uc
      WHERE uc.user_id = auth.uid()
      AND uc.role IN ('owner', 'admin')
      AND uc.company_id = ANY(invite_audit_log.company_ids)
    )
  );

-- Service role can insert (used by API routes)
CREATE POLICY "Service role can insert audit logs"
  ON invite_audit_log FOR INSERT
  WITH CHECK (true);

-- No updates or deletes allowed (audit logs are immutable)
-- Service role bypasses RLS anyway for API operations

COMMENT ON TABLE invite_audit_log IS 'Tracks all invitation actions for audit trail and rate limiting';
COMMENT ON COLUMN invite_audit_log.action IS 'Type of action: invite, resend, revoke, or accept';
COMMENT ON COLUMN invite_audit_log.metadata IS 'Additional context like error messages, IP address, etc.';
