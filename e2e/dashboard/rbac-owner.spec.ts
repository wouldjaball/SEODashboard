import { test, expect } from '@playwright/test';
import { interceptAnalyticsAPIs } from '../helpers/mock-api';

test.describe('RBAC - Owner Role', () => {
  test.beforeEach(async ({ page }) => {
    await interceptAnalyticsAPIs(page);
  });

  test('owner sees admin settings menu', async ({ page }) => {
    await page.goto('/dashboard/executive');
    await expect(page.getByTestId('dashboard-header')).toBeVisible({ timeout: 30_000 });

    // Admin menu trigger SHOULD be present for owner
    await expect(page.getByTestId('admin-menu-trigger')).toBeVisible();
  });

  test('owner can open admin menu and sees all admin options', async ({ page }) => {
    await page.goto('/dashboard/executive');
    await expect(page.getByTestId('dashboard-header')).toBeVisible({ timeout: 30_000 });

    await page.getByTestId('admin-menu-trigger').click();

    // Use menuitem role to avoid matching dashboard text that also contains these words
    await expect(page.getByRole('menuitem', { name: 'Account Assignments' })).toBeVisible();
    await expect(page.getByRole('menuitem', { name: 'Companies' })).toBeVisible();
    await expect(page.getByRole('menuitem', { name: 'Users' })).toBeVisible();
    await expect(page.getByRole('menuitem', { name: 'Access Codes' })).toBeVisible();
  });
});
