import { Page } from '@playwright/test';

/**
 * Intercepts slow analytics API routes with fast mock responses.
 * Use this in any test that navigates to the dashboard so the page
 * loads quickly without waiting for real GA/GSC/YouTube/LinkedIn data.
 */
export async function interceptAnalyticsAPIs(page: Page) {
  // Mock the portfolio analytics endpoint (the slowest call)
  await page.route('**/api/analytics/portfolio**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        cached: true,
        companies: [],
        aggregateMetrics: {
          totalTraffic: 0,
          totalConversions: 0,
          avgConversionRate: 0,
          totalRevenue: 0,
          previousPeriod: {
            totalTraffic: 0,
            totalConversions: 0,
            avgConversionRate: 0,
            totalRevenue: 0,
          },
        },
      }),
    });
  });

  // Mock individual company analytics endpoints
  await page.route('**/api/analytics/*', async (route) => {
    // Don't intercept the portfolio route (already handled above)
    if (route.request().url().includes('/portfolio')) {
      return route.fallback();
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        cached: true,
        gaMetrics: null,
        gscMetrics: null,
        ytMetrics: null,
        liVisitorMetrics: null,
      }),
    });
  });
}
