-- YouTube channels table
CREATE TABLE youtube_channels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  channel_id TEXT NOT NULL,
  channel_name TEXT NOT NULL,
  channel_handle TEXT,
  thumbnail_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, channel_id)
);

-- LinkedIn pages table
CREATE TABLE linkedin_pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  page_id TEXT NOT NULL,
  page_name TEXT NOT NULL,
  page_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, page_id)
);

-- Company YouTube mappings
CREATE TABLE company_youtube_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  youtube_channel_id UUID NOT NULL REFERENCES youtube_channels(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(company_id, youtube_channel_id)
);

-- Company LinkedIn mappings
CREATE TABLE company_linkedin_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  linkedin_page_id UUID NOT NULL REFERENCES linkedin_pages(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(company_id, linkedin_page_id)
);

-- Indexes for performance
CREATE INDEX idx_youtube_channels_user_id ON youtube_channels(user_id);
CREATE INDEX idx_linkedin_pages_user_id ON linkedin_pages(user_id);
CREATE INDEX idx_company_youtube_mappings_company_id ON company_youtube_mappings(company_id);
CREATE INDEX idx_company_linkedin_mappings_company_id ON company_linkedin_mappings(company_id);
