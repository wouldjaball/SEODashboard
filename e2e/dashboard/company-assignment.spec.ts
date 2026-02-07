import { test, expect } from '@playwright/test';
import { TEST_USERS } from '../fixtures/test-users';
import { interceptAnalyticsAPIs } from '../helpers/mock-api';

test.describe('Company Auto-Assignment', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test('new user with no company assignment gets auto-assigned on first dashboard visit', async ({ page }) => {
    // Intercept slow analytics so dashboard loads fast after login
    await interceptAnalyticsAPIs(page);

    // Login as fresh user (no company assignments)
    await page.goto('/auth/login');
    await page.getByTestId('login-email').fill(TEST_USERS.freshUser.email);
    await page.getByTestId('login-password').fill(TEST_USERS.freshUser.password);
    await page.getByTestId('login-submit').click();

    // Should reach the dashboard (not get stuck)
    await page.waitForURL('**/dashboard/executive', { timeout: 30_000 });

    // The CompanyProvider calls /api/companies which auto-assigns all companies
    // with 'viewer' role. Wait for the dashboard to finish loading.
    await expect(page.getByTestId('dashboard-header')).toBeVisible({ timeout: 30_000 });

    // Should show "Executive Overview" meaning companies were loaded
    await expect(page.getByText('Executive Overview')).toBeVisible({ timeout: 30_000 });
  });
});
