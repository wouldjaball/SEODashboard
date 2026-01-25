-- Migration: Support multiple Google identities per user for Brand Account access
-- This allows users to connect multiple Google/Brand accounts to access YouTube Analytics
-- for channels owned by different Brand Accounts

-- Add columns to track the Google identity and associated YouTube channel
ALTER TABLE oauth_tokens ADD COLUMN IF NOT EXISTS google_identity TEXT;
ALTER TABLE oauth_tokens ADD COLUMN IF NOT EXISTS google_identity_name TEXT;
ALTER TABLE oauth_tokens ADD COLUMN IF NOT EXISTS youtube_channel_id TEXT;
ALTER TABLE oauth_tokens ADD COLUMN IF NOT EXISTS youtube_channel_name TEXT;

-- Drop the existing unique constraint (user_id, provider)
-- We need to allow multiple Google connections per user
ALTER TABLE oauth_tokens DROP CONSTRAINT IF EXISTS oauth_tokens_user_id_provider_key;

-- Create new unique constraint that allows multiple identities
-- Each user can have multiple Google connections, but only one per identity
ALTER TABLE oauth_tokens ADD CONSTRAINT oauth_tokens_user_identity_unique
  UNIQUE (user_id, provider, google_identity);

-- Add index for looking up tokens by YouTube channel
CREATE INDEX IF NOT EXISTS idx_oauth_tokens_youtube_channel
  ON oauth_tokens(user_id, youtube_channel_id);

-- Add index for looking up tokens by Google identity
CREATE INDEX IF NOT EXISTS idx_oauth_tokens_google_identity
  ON oauth_tokens(user_id, google_identity);
