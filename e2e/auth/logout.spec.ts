import { test, expect } from '@playwright/test';
import { TEST_USERS } from '../fixtures/test-users';
import { interceptAnalyticsAPIs } from '../helpers/mock-api';

test.describe('Logout Flow', () => {
  // Use empty storageState — each test logs in with the admin user.
  // We deliberately use admin (not owner) because supabase.auth.signOut()
  // revokes ALL sessions for the user (global scope). If we used the owner
  // user here, sign-out would invalidate the owner storageState that other
  // test specs depend on.
  test.use({ storageState: { cookies: [], origins: [] } });

  test.beforeEach(async ({ page }) => {
    await interceptAnalyticsAPIs(page);

    // Log in as admin (not owner!) with a fresh session
    await page.goto('/auth/login');
    await page.getByTestId('login-email').fill(TEST_USERS.admin.email);
    await page.getByTestId('login-password').fill(TEST_USERS.admin.password);
    await page.getByTestId('login-submit').click();
    await page.waitForURL('**/dashboard/**', { timeout: 30_000 });
    await expect(page.getByTestId('dashboard-header')).toBeVisible({ timeout: 30_000 });
  });

  test('user can sign out and is redirected to login', async ({ page }) => {
    // Open user menu and click sign out
    await page.getByTestId('user-menu-trigger').click();
    await page.getByTestId('sign-out-button').click();

    // Should redirect to login page
    await page.waitForURL('**/auth/login', { timeout: 15_000 });
    await expect(page).toHaveURL(/\/auth\/login/);
  });

  test('after logout, accessing dashboard redirects to login', async ({ page }) => {
    // Sign out
    await page.getByTestId('user-menu-trigger').click();
    await page.getByTestId('sign-out-button').click();
    await page.waitForURL('**/auth/login', { timeout: 15_000 });

    // Now try to access dashboard again — should redirect back to login
    await page.goto('/dashboard/executive');
    await page.waitForURL('**/auth/login', { timeout: 15_000 });
    await expect(page).toHaveURL(/\/auth\/login/);
  });
});
