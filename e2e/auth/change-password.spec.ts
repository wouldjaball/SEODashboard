import { test, expect } from '@playwright/test';
import { TEST_USERS } from '../fixtures/test-users';

test.describe('Change Password Flow', () => {
  test.describe.configure({ mode: 'serial' });
  test.use({ storageState: { cookies: [], origins: [] } });

  test('user with temp password is redirected to change-password after login', async ({ page }) => {
    await page.goto('/auth/login');
    await page.getByTestId('login-email').fill(TEST_USERS.tempPassword.email);
    await page.getByTestId('login-password').fill(TEST_USERS.tempPassword.password);
    await page.getByTestId('login-submit').click();

    // Should redirect to change-password page, NOT dashboard
    await page.waitForURL('**/auth/change-password', { timeout: 30_000 });
    await expect(page).toHaveURL(/\/auth\/change-password/);
  });

  test('change password page shows all required fields', async ({ page }) => {
    await page.goto('/auth/login');
    await page.getByTestId('login-email').fill(TEST_USERS.tempPassword.email);
    await page.getByTestId('login-password').fill(TEST_USERS.tempPassword.password);
    await page.getByTestId('login-submit').click();
    await page.waitForURL('**/auth/change-password', { timeout: 30_000 });

    await expect(page.getByTestId('change-current-password')).toBeVisible();
    await expect(page.getByTestId('change-new-password')).toBeVisible();
    await expect(page.getByTestId('change-confirm-password')).toBeVisible();
    await expect(page.getByTestId('change-password-submit')).toBeVisible();
  });

  test('mismatched passwords show error', async ({ page }) => {
    await page.goto('/auth/login');
    await page.getByTestId('login-email').fill(TEST_USERS.tempPassword.email);
    await page.getByTestId('login-password').fill(TEST_USERS.tempPassword.password);
    await page.getByTestId('login-submit').click();
    await page.waitForURL('**/auth/change-password', { timeout: 30_000 });

    await page.getByTestId('change-current-password').fill(TEST_USERS.tempPassword.password);
    await page.getByTestId('change-new-password').fill('NewSecure456!');
    await page.getByTestId('change-confirm-password').fill('DifferentPassword789!');
    await page.getByTestId('change-password-submit').click();

    await expect(page.getByTestId('change-password-error')).toBeVisible();
    await expect(page.getByTestId('change-password-error')).toContainText(/do not match/i);
  });

  test('successful password change redirects to dashboard', async ({ page }) => {
    // This test MUST run last because it changes the temp user's password
    await page.goto('/auth/login');
    await page.getByTestId('login-email').fill(TEST_USERS.tempPassword.email);
    await page.getByTestId('login-password').fill(TEST_USERS.tempPassword.password);
    await page.getByTestId('login-submit').click();
    await page.waitForURL('**/auth/change-password', { timeout: 30_000 });

    await page.getByTestId('change-current-password').fill(TEST_USERS.tempPassword.password);
    await page.getByTestId('change-new-password').fill(TEST_USERS.tempPassword.newPassword);
    await page.getByTestId('change-confirm-password').fill(TEST_USERS.tempPassword.newPassword);
    await page.getByTestId('change-password-submit').click();

    // Should redirect to dashboard after successful change
    await page.waitForURL('**/dashboard**', { timeout: 30_000 });
    await expect(page).toHaveURL(/\/dashboard/);
  });
});
