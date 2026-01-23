-- Add policies for YouTube and LinkedIn tables
ALTER TABLE youtube_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE linkedin_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_youtube_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_linkedin_mappings ENABLE ROW LEVEL SECURITY;

-- YouTube Channels: Users can manage their own channels
CREATE POLICY "Users can manage their own YouTube channels"
  ON youtube_channels FOR ALL
  USING (user_id = auth.uid());

-- LinkedIn Pages: Users can manage their own pages
CREATE POLICY "Users can manage their own LinkedIn pages"
  ON linkedin_pages FOR ALL
  USING (user_id = auth.uid());

-- Company YouTube Mappings
CREATE POLICY "Users can view YouTube mappings for their companies"
  ON company_youtube_mappings FOR SELECT
  USING (
    company_id IN (
      SELECT company_id FROM user_companies
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Owners/admins can manage YouTube mappings"
  ON company_youtube_mappings FOR ALL
  USING (
    company_id IN (
      SELECT company_id FROM user_companies
      WHERE user_id = auth.uid()
      AND role IN ('owner', 'admin')
    )
  );

-- Company LinkedIn Mappings
CREATE POLICY "Users can view LinkedIn mappings for their companies"
  ON company_linkedin_mappings FOR SELECT
  USING (
    company_id IN (
      SELECT company_id FROM user_companies
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Owners/admins can manage LinkedIn mappings"
  ON company_linkedin_mappings FOR ALL
  USING (
    company_id IN (
      SELECT company_id FROM user_companies
      WHERE user_id = auth.uid()
      AND role IN ('owner', 'admin')
    )
  );

-- Allow authenticated users to view all companies (for admin interfaces)
-- This allows the admin pages to show all companies
CREATE POLICY "Authenticated users can view all companies"
  ON companies FOR SELECT
  USING (auth.role() = 'authenticated');
