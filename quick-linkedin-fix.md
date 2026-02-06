# Quick LinkedIn Data Fix for Transit

## Immediate Actions:

### 1. Check Company Mapping
1. Log into SEO Dashboard as admin
2. Go to Integrations → LinkedIn 
3. Search for Transit company
4. Verify LinkedIn page is connected (should show company page ID)

### 2. Re-authenticate LinkedIn (if needed)
1. Go to Accounts/Integrations
2. Click "Reconnect LinkedIn"
3. Authorize all required permissions
4. Map to Transit company page

### 3. Force Cron Refresh
1. Open browser to: `https://seo-dashboard-url.vercel.app/api/cron/refresh-cache?secret=8883506154aaf56409681a23025934e1d209ea3e8ca25228a0584b1ffcdcbaad`
2. Should return success message
3. Check dashboard after 1-2 minutes

### 4. Test Analytics Endpoint
1. Open browser dev tools
2. Go to Network tab
3. Refresh dashboard and click LinkedIn tab
4. Check `/api/analytics/[companyId]` response
5. Look for `liVisitorMetrics`, `liFollowerMetrics`, etc.

## Expected Data Structure:
```json
{
  "liVisitorMetrics": {
    "uniqueVisitors": 318,
    "pageViews": 500,
    "previousPeriod": { "uniqueVisitors": 237 }
  },
  "liFollowerMetrics": {
    "newFollowers": 156,
    "totalFollowers": 29220,
    "previousPeriod": { "newFollowers": 145 }
  },
  "liContentMetrics": {
    "impressions": 7172,
    "clicks": 234,
    "previousPeriod": { "impressions": 3735 }
  }
}
```

## If Still No Data:
- LinkedIn API might be failing
- Check server logs for LinkedIn API errors
- May need to switch to manual data entry temporarily