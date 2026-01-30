-- Create table for manual LinkedIn data overrides
CREATE TABLE IF NOT EXISTS linkedin_manual_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  date_range_start DATE NOT NULL,
  date_range_end DATE NOT NULL,
  visitor_metrics JSONB,
  follower_metrics JSONB, 
  content_metrics JSONB,
  visitor_daily JSONB,
  follower_daily JSONB,
  impression_daily JSONB,
  demographics JSONB,
  updates JSONB,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  -- Ensure only one active manual data per company per date range
  UNIQUE(company_id, date_range_start, date_range_end, is_active) DEFERRABLE INITIALLY DEFERRED
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_linkedin_manual_data_company_id ON linkedin_manual_data(company_id);
CREATE INDEX IF NOT EXISTS idx_linkedin_manual_data_date_range ON linkedin_manual_data(date_range_start, date_range_end);
CREATE INDEX IF NOT EXISTS idx_linkedin_manual_data_active ON linkedin_manual_data(is_active) WHERE is_active = true;

-- Create RLS policy
ALTER TABLE linkedin_manual_data ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only access manual data for companies they have access to
CREATE POLICY linkedin_manual_data_policy ON linkedin_manual_data
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM company_user_access 
    WHERE company_user_access.company_id = linkedin_manual_data.company_id 
    AND company_user_access.user_id = auth.uid()
  )
);