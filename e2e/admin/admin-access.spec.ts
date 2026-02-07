import { test, expect } from '@playwright/test';
import { interceptAnalyticsAPIs } from '../helpers/mock-api';
import { AUTH_FILES } from '../fixtures/test-users';

test.describe('Admin RBAC access control', () => {
  test.beforeEach(async ({ page }) => {
    await interceptAnalyticsAPIs(page);
  });

  test.describe('Viewer denied access', () => {
    test.use({ storageState: AUTH_FILES.viewer });

    test('viewer denied on Users page', async ({ page }) => {
      await page.goto('/admin/users');
      await expect(page.getByTestId('access-denied')).toBeVisible({ timeout: 15_000 });
      await expect(page.getByText('Access Denied')).toBeVisible();
    });

    test('viewer denied on Access Codes page', async ({ page }) => {
      await page.goto('/admin/access-codes');
      await expect(page.getByTestId('access-denied')).toBeVisible({ timeout: 15_000 });
      await expect(page.getByText('Access Denied')).toBeVisible();
    });

    test('viewer can access Companies page', async ({ page }) => {
      await page.goto('/admin/companies');
      await expect(page.getByText('Company Management')).toBeVisible({ timeout: 15_000 });
    });
  });

  test.describe('Owner has full access', () => {
    // Uses default storageState from project (owner)

    test('owner can access Companies page', async ({ page }) => {
      await page.goto('/admin/companies');
      await expect(page.getByTestId('add-company-button')).toBeVisible({ timeout: 15_000 });
    });

    test('owner can access Users page', async ({ page }) => {
      await page.goto('/admin/users');
      await expect(page.getByTestId('invite-user-button')).toBeVisible({ timeout: 15_000 });
    });

    test('owner can access Access Codes page', async ({ page }) => {
      await page.goto('/admin/access-codes');
      await expect(page.getByTestId('create-code-button')).toBeVisible({ timeout: 15_000 });
    });
  });
});
