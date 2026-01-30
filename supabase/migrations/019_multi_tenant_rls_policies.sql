-- Multi-tenant RLS policies
-- Allow company members to READ integration assets owned by others
-- but mapped to their companies, while keeping write access restricted to owners.
-- This enables a multi-tenant dashboard where one master account's integrations
-- serve data to all authorized client users.

-- GA Properties: Add SELECT for company members
CREATE POLICY "Company members can read shared GA properties"
  ON ga_properties FOR SELECT
  USING (
    id IN (
      SELECT ga_property_id FROM company_ga_mappings
      WHERE company_id IN (
        SELECT company_id FROM user_companies
        WHERE user_id = auth.uid()
      )
    )
  );

-- GSC Sites: Add SELECT for company members
CREATE POLICY "Company members can read shared GSC sites"
  ON gsc_sites FOR SELECT
  USING (
    id IN (
      SELECT gsc_site_id FROM company_gsc_mappings
      WHERE company_id IN (
        SELECT company_id FROM user_companies
        WHERE user_id = auth.uid()
      )
    )
  );

-- YouTube Channels: Add SELECT for company members
CREATE POLICY "Company members can read shared YouTube channels"
  ON youtube_channels FOR SELECT
  USING (
    id IN (
      SELECT youtube_channel_id FROM company_youtube_mappings
      WHERE company_id IN (
        SELECT company_id FROM user_companies
        WHERE user_id = auth.uid()
      )
    )
  );

-- LinkedIn Pages: Add SELECT for company members
CREATE POLICY "Company members can read shared LinkedIn pages"
  ON linkedin_pages FOR SELECT
  USING (
    id IN (
      SELECT linkedin_page_id FROM company_linkedin_mappings
      WHERE company_id IN (
        SELECT company_id FROM user_companies
        WHERE user_id = auth.uid()
      )
    )
  );
