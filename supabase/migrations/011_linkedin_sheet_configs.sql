-- Migration: Add LinkedIn Google Sheets configuration table
-- This allows storing Power My Analytics Google Sheets IDs per company for LinkedIn data

-- Create table to store sheet configurations per company
CREATE TABLE IF NOT EXISTS linkedin_sheet_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  -- Page analytics sheet (page views, visitors, followers, demographics)
  page_analytics_sheet_id TEXT,
  page_analytics_range TEXT DEFAULT 'A:Z',
  -- Post/content analytics sheet (posts, engagement, impressions)
  post_analytics_sheet_id TEXT,
  post_analytics_range TEXT DEFAULT 'A:Z',
  -- Campaign/ads analytics sheet (paid campaigns)
  campaign_analytics_sheet_id TEXT,
  campaign_analytics_range TEXT DEFAULT 'A:Z',
  -- Demographics sheet (optional, if in separate sheet)
  demographics_sheet_id TEXT,
  demographics_range TEXT DEFAULT 'A:Z',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(company_id)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_linkedin_sheet_configs_company_id
ON linkedin_sheet_configs(company_id);

-- Enable RLS
ALTER TABLE linkedin_sheet_configs ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view configs for companies they belong to
CREATE POLICY "Users can view linkedin sheet configs for their companies"
ON linkedin_sheet_configs
FOR SELECT
USING (
  company_id IN (
    SELECT company_id FROM user_companies WHERE user_id = auth.uid()
  )
);

-- Policy: Only admins/owners can update configs
CREATE POLICY "Admins can manage linkedin sheet configs"
ON linkedin_sheet_configs
FOR ALL
USING (
  company_id IN (
    SELECT company_id FROM user_companies
    WHERE user_id = auth.uid()
    AND role IN ('admin', 'owner')
  )
)
WITH CHECK (
  company_id IN (
    SELECT company_id FROM user_companies
    WHERE user_id = auth.uid()
    AND role IN ('admin', 'owner')
  )
);

-- Add trigger to update updated_at
CREATE OR REPLACE FUNCTION update_linkedin_sheet_configs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_linkedin_sheet_configs_updated_at
BEFORE UPDATE ON linkedin_sheet_configs
FOR EACH ROW
EXECUTE FUNCTION update_linkedin_sheet_configs_updated_at();

-- Add comment for documentation
COMMENT ON TABLE linkedin_sheet_configs IS
'Stores Google Sheets IDs for Power My Analytics LinkedIn data exports per company';
