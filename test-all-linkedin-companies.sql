-- Test All LinkedIn Companies - Native Dashboard Readiness
-- Run this in Supabase SQL Editor to verify all LinkedIn companies are ready

-- 1. Get all companies with LinkedIn mappings
SELECT 
  c.id,
  c.name as company_name,
  clm.linkedin_page_id,
  lp.page_name,
  lp.linkedin_page_id as page_id_value,
  lp.user_id as owner_user_id
FROM companies c
JOIN company_linkedin_mappings clm ON c.id = clm.company_id  
JOIN linkedin_pages lp ON clm.linkedin_page_id = lp.id
ORDER BY c.name;

-- 2. Check OAuth token status for all LinkedIn companies
SELECT 
  c.name as company_name,
  lp.page_name,
  u.email as owner_email,
  CASE 
    WHEN ot.access_token IS NOT NULL AND ot.expires_at > NOW() THEN '✅ Valid Token'
    WHEN ot.access_token IS NOT NULL AND ot.expires_at <= NOW() THEN '⚠️ Token Expired'
    ELSE '❌ No Token'
  END as token_status,
  ot.expires_at,
  ot.updated_at as last_token_update
FROM companies c
JOIN company_linkedin_mappings clm ON c.id = clm.company_id  
JOIN linkedin_pages lp ON clm.linkedin_page_id = lp.id
JOIN users u ON lp.user_id = u.id
LEFT JOIN oauth_tokens ot ON u.id = ot.user_id AND ot.provider = 'linkedin'
ORDER BY c.name;

-- 3. Check recent cache data for all LinkedIn companies
SELECT 
  c.name as company_name,
  ac.created_at,
  ac.expires_at,
  CASE 
    WHEN ac.cached_data ? 'liVisitorMetrics' THEN '✅'
    ELSE '❌'
  END as visitor_metrics,
  CASE 
    WHEN ac.cached_data ? 'liFollowerMetrics' THEN '✅'
    ELSE '❌'
  END as follower_metrics,
  CASE 
    WHEN ac.cached_data ? 'liContentMetrics' THEN '✅'
    ELSE '❌'
  END as content_metrics,
  CASE 
    WHEN ac.cached_data ? 'liSearchAppearanceMetrics' THEN '✅ NEW!'
    ELSE '❌ Missing'
  END as search_appearance_metrics,
  CASE 
    WHEN ac.cached_data ? 'liError' THEN '❌ Error: ' || (ac.cached_data->>'liError')
    ELSE '✅ No Errors'
  END as error_status
FROM companies c
JOIN company_linkedin_mappings clm ON c.id = clm.company_id
LEFT JOIN analytics_cache ac ON c.id = ac.company_id 
  AND ac.data_type = 'daily_snapshot'
  AND ac.expires_at > NOW()
ORDER BY c.name, ac.created_at DESC;

-- 4. Summary: LinkedIn Companies Readiness Report
SELECT 
  COUNT(DISTINCT c.id) as total_linkedin_companies,
  COUNT(DISTINCT CASE WHEN ot.access_token IS NOT NULL AND ot.expires_at > NOW() THEN c.id END) as companies_with_valid_tokens,
  COUNT(DISTINCT CASE WHEN ac.cached_data ? 'liSearchAppearanceMetrics' THEN c.id END) as companies_with_new_search_metrics,
  COUNT(DISTINCT CASE WHEN ac.cached_data IS NOT NULL AND NOT (ac.cached_data ? 'liError') THEN c.id END) as companies_with_working_data
FROM companies c
JOIN company_linkedin_mappings clm ON c.id = clm.company_id  
JOIN linkedin_pages lp ON clm.linkedin_page_id = lp.id
LEFT JOIN oauth_tokens ot ON lp.user_id = ot.user_id AND ot.provider = 'linkedin'
LEFT JOIN analytics_cache ac ON c.id = ac.company_id 
  AND ac.data_type = 'daily_snapshot'
  AND ac.expires_at > NOW();

-- 5. Companies that need attention (expired tokens or missing data)
SELECT 
  c.name as company_name,
  CASE 
    WHEN ot.access_token IS NULL THEN 'No OAuth Token - Re-authenticate needed'
    WHEN ot.expires_at <= NOW() THEN 'Token Expired - Re-authenticate needed'
    WHEN ac.cached_data ? 'liError' THEN 'API Error: ' || (ac.cached_data->>'liError')
    WHEN ac.cached_data IS NULL THEN 'No cached data - Check cron job'
    ELSE 'Unknown issue'
  END as issue,
  u.email as contact_email
FROM companies c
JOIN company_linkedin_mappings clm ON c.id = clm.company_id  
JOIN linkedin_pages lp ON clm.linkedin_page_id = lp.id
JOIN users u ON lp.user_id = u.id
LEFT JOIN oauth_tokens ot ON u.id = ot.user_id AND ot.provider = 'linkedin'
LEFT JOIN analytics_cache ac ON c.id = ac.company_id 
  AND ac.data_type = 'daily_snapshot'
  AND ac.expires_at > NOW()
WHERE 
  ot.access_token IS NULL 
  OR ot.expires_at <= NOW()
  OR ac.cached_data ? 'liError'
  OR ac.cached_data IS NULL
ORDER BY c.name;