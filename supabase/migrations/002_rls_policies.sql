-- Enable RLS on all tables
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE oauth_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE ga_properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE gsc_sites ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_ga_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_gsc_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE search_console_cache ENABLE ROW LEVEL SECURITY;

-- Companies: Users can only see companies they belong to
CREATE POLICY "Users can view their companies"
  ON companies FOR SELECT
  USING (
    id IN (
      SELECT company_id FROM user_companies
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Owners/admins can insert companies"
  ON companies FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Owners/admins can update their companies"
  ON companies FOR UPDATE
  USING (
    id IN (
      SELECT company_id FROM user_companies
      WHERE user_id = auth.uid()
      AND role IN ('owner', 'admin')
    )
  );

-- User Companies: Users can see their own relationships
CREATE POLICY "Users can view their company relationships"
  ON user_companies FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Owners can insert user_companies"
  ON user_companies FOR INSERT
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM user_companies
      WHERE user_id = auth.uid()
      AND role = 'owner'
    )
  );

-- OAuth Tokens: Users can only access their own tokens
CREATE POLICY "Users can manage their own OAuth tokens"
  ON oauth_tokens FOR ALL
  USING (user_id = auth.uid());

-- GA Properties: Users can only see their own properties
CREATE POLICY "Users can manage their own GA properties"
  ON ga_properties FOR ALL
  USING (user_id = auth.uid());

-- GSC Sites: Users can only see their own sites
CREATE POLICY "Users can manage their own GSC sites"
  ON gsc_sites FOR ALL
  USING (user_id = auth.uid());

-- Company GA Mappings: Users can see mappings for their companies
CREATE POLICY "Users can view GA mappings for their companies"
  ON company_ga_mappings FOR SELECT
  USING (
    company_id IN (
      SELECT company_id FROM user_companies
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Owners/admins can manage GA mappings"
  ON company_ga_mappings FOR INSERT
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM user_companies
      WHERE user_id = auth.uid()
      AND role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Owners/admins can update GA mappings"
  ON company_ga_mappings FOR UPDATE
  USING (
    company_id IN (
      SELECT company_id FROM user_companies
      WHERE user_id = auth.uid()
      AND role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Owners/admins can delete GA mappings"
  ON company_ga_mappings FOR DELETE
  USING (
    company_id IN (
      SELECT company_id FROM user_companies
      WHERE user_id = auth.uid()
      AND role IN ('owner', 'admin')
    )
  );

-- Company GSC Mappings: Similar to GA mappings
CREATE POLICY "Users can view GSC mappings for their companies"
  ON company_gsc_mappings FOR SELECT
  USING (
    company_id IN (
      SELECT company_id FROM user_companies
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Owners/admins can manage GSC mappings"
  ON company_gsc_mappings FOR INSERT
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM user_companies
      WHERE user_id = auth.uid()
      AND role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Owners/admins can update GSC mappings"
  ON company_gsc_mappings FOR UPDATE
  USING (
    company_id IN (
      SELECT company_id FROM user_companies
      WHERE user_id = auth.uid()
      AND role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Owners/admins can delete GSC mappings"
  ON company_gsc_mappings FOR DELETE
  USING (
    company_id IN (
      SELECT company_id FROM user_companies
      WHERE user_id = auth.uid()
      AND role IN ('owner', 'admin')
    )
  );

-- Analytics Cache: Users can view cache for their companies
CREATE POLICY "Users can view analytics cache for their companies"
  ON analytics_cache FOR SELECT
  USING (
    company_id IN (
      SELECT company_id FROM user_companies
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Service role can manage analytics cache"
  ON analytics_cache FOR ALL
  USING (true);

-- Search Console Cache: Users can view cache for their companies
CREATE POLICY "Users can view search console cache for their companies"
  ON search_console_cache FOR SELECT
  USING (
    company_id IN (
      SELECT company_id FROM user_companies
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Service role can manage search console cache"
  ON search_console_cache FOR ALL
  USING (true);
