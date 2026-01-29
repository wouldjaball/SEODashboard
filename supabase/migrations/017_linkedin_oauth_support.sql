-- Add LinkedIn OAuth support to oauth_tokens table

-- Add LinkedIn-specific columns
ALTER TABLE oauth_tokens
ADD COLUMN IF NOT EXISTS linkedin_organization_id TEXT,
ADD COLUMN IF NOT EXISTS linkedin_organization_name TEXT;

-- Create index for LinkedIn organization lookups
CREATE INDEX IF NOT EXISTS idx_oauth_tokens_linkedin_org
ON oauth_tokens(user_id, provider, linkedin_organization_id)
WHERE provider = 'linkedin';

-- Add comment for clarity
COMMENT ON COLUMN oauth_tokens.linkedin_organization_id IS 'LinkedIn organization ID (numeric string from URN)';
COMMENT ON COLUMN oauth_tokens.linkedin_organization_name IS 'LinkedIn organization display name';
