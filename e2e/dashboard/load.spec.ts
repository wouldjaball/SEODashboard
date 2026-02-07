import { test, expect } from '@playwright/test';
import { interceptAnalyticsAPIs } from '../helpers/mock-api';

test.describe('Dashboard Loading', () => {
  test.beforeEach(async ({ page }) => {
    await interceptAnalyticsAPIs(page);
  });

  test('executive dashboard loads and shows header', async ({ page }) => {
    await page.goto('/dashboard/executive');

    // Header should be visible
    await expect(page.getByTestId('dashboard-header')).toBeVisible({ timeout: 30_000 });

    // Should show "Executive Overview" heading
    await expect(page.getByText('Executive Overview')).toBeVisible({ timeout: 30_000 });
  });

  test('/dashboard redirects to /dashboard/executive', async ({ page }) => {
    await page.goto('/dashboard');

    await page.waitForURL('**/dashboard/executive', { timeout: 15_000 });
    await expect(page).toHaveURL(/\/dashboard\/executive/);
  });

  test('dashboard header shows user menu', async ({ page }) => {
    await page.goto('/dashboard/executive');

    await expect(page.getByTestId('dashboard-header')).toBeVisible({ timeout: 30_000 });
    await expect(page.getByTestId('user-menu-trigger')).toBeVisible();
  });
});
