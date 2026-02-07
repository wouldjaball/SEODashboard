import { test, expect } from '@playwright/test';
import { interceptAnalyticsAPIs } from '../helpers/mock-api';

test.describe('RBAC - Viewer Role', () => {
  test.beforeEach(async ({ page }) => {
    await interceptAnalyticsAPIs(page);
  });

  test('viewer does NOT see admin settings menu', async ({ page }) => {
    await page.goto('/dashboard/executive');
    await expect(page.getByTestId('dashboard-header')).toBeVisible({ timeout: 30_000 });

    // Admin menu trigger should NOT be present for viewer
    await expect(page.getByTestId('admin-menu-trigger')).not.toBeVisible();
  });

  test('viewer sees user menu', async ({ page }) => {
    await page.goto('/dashboard/executive');
    await expect(page.getByTestId('dashboard-header')).toBeVisible({ timeout: 30_000 });

    // User menu should be visible
    await page.getByTestId('user-menu-trigger').click();
    await expect(page.getByText('Signed in as')).toBeVisible();
  });
});
