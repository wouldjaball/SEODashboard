-- Debug LinkedIn Data for Transit Company
-- Run these queries in your Supabase SQL editor

-- 1. Check if Transit company exists and get its ID
SELECT id, name FROM companies WHERE name ILIKE '%transit%';

-- 2. Check LinkedIn page mapping for Transit  
SELECT clm.*, lp.page_name, lp.linkedin_page_id 
FROM company_linkedin_mappings clm
JOIN linkedin_pages lp ON clm.linkedin_page_id = lp.id
JOIN companies c ON clm.company_id = c.id
WHERE c.name ILIKE '%transit%';

-- 3. Check if LinkedIn OAuth tokens exist for users
SELECT DISTINCT u.email, u.id,
  CASE WHEN ot.access_token IS NOT NULL THEN 'Token Exists' ELSE 'No Token' END as token_status,
  ot.expires_at,
  ot.updated_at
FROM users u  
LEFT JOIN oauth_tokens ot ON u.id = ot.user_id AND ot.provider = 'linkedin'
WHERE u.id IN (
  SELECT DISTINCT lp.user_id 
  FROM linkedin_pages lp 
  JOIN company_linkedin_mappings clm ON lp.id = clm.linkedin_page_id
  JOIN companies c ON clm.company_id = c.id
  WHERE c.name ILIKE '%transit%'
);

-- 4. Check analytics cache for LinkedIn data
SELECT 
  ac.company_id,
  c.name,
  ac.data_type,
  ac.date_range_start,
  ac.date_range_end,
  ac.expires_at,
  ac.created_at,
  CASE 
    WHEN ac.cached_data ? 'liVisitorMetrics' THEN 'Has Visitor Data'
    ELSE 'Missing Visitor Data' 
  END as visitor_data,
  CASE 
    WHEN ac.cached_data ? 'liFollowerMetrics' THEN 'Has Follower Data'
    ELSE 'Missing Follower Data' 
  END as follower_data,
  CASE 
    WHEN ac.cached_data ? 'liContentMetrics' THEN 'Has Content Data'  
    ELSE 'Missing Content Data'
  END as content_data
FROM analytics_cache ac
JOIN companies c ON ac.company_id = c.id
WHERE c.name ILIKE '%transit%' 
  AND ac.data_type = 'daily_snapshot'
ORDER BY ac.created_at DESC
LIMIT 5;

-- 5. Check recent cron job logs (if you have logging table)
-- This would show if the LinkedIn data fetching is failing