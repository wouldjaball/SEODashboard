-- Allow admins (owners/admins in any company) to view all YouTube channels
-- This enables the admin dashboard to show all available channels for assignment

CREATE POLICY "Admins can view all YouTube channels"
  ON youtube_channels FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_companies
      WHERE user_id = auth.uid()
      AND role IN ('owner', 'admin')
    )
  );

-- Also add the same policy for LinkedIn pages for consistency
CREATE POLICY "Admins can view all LinkedIn pages"
  ON linkedin_pages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_companies
      WHERE user_id = auth.uid()
      AND role IN ('owner', 'admin')
    )
  );
