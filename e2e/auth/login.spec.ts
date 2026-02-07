import { test, expect } from '@playwright/test';
import { TEST_USERS } from '../fixtures/test-users';

test.describe('Login Page', () => {
  // Override storageState to unauthenticated for login tests
  test.use({ storageState: { cookies: [], origins: [] } });

  test('displays login form with email and password fields', async ({ page }) => {
    await page.goto('/auth/login');
    await expect(page.getByTestId('login-email')).toBeVisible();
    await expect(page.getByTestId('login-password')).toBeVisible();
    await expect(page.getByTestId('login-submit')).toBeVisible();
  });

  test('successful login redirects to executive dashboard', async ({ page }) => {
    await page.goto('/auth/login');
    await page.getByTestId('login-email').fill(TEST_USERS.owner.email);
    await page.getByTestId('login-password').fill(TEST_USERS.owner.password);
    await page.getByTestId('login-submit').click();

    await page.waitForURL('**/dashboard/executive', { timeout: 30_000 });
    await expect(page).toHaveURL(/\/dashboard\/executive/);
  });

  test('wrong password shows error message', async ({ page }) => {
    await page.goto('/auth/login');
    await page.getByTestId('login-email').fill(TEST_USERS.owner.email);
    await page.getByTestId('login-password').fill('WrongPassword999!');
    await page.getByTestId('login-submit').click();

    await expect(page.getByTestId('login-error')).toBeVisible({ timeout: 10_000 });
  });

  test('empty fields prevent submission', async ({ page }) => {
    await page.goto('/auth/login');
    await page.getByTestId('login-submit').click();

    // Still on login page because HTML required attribute blocks submission
    await expect(page).toHaveURL(/\/auth\/login/);
  });

  test('home page has a working login form', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByTestId('login-email')).toBeVisible();
    await expect(page.getByTestId('login-password')).toBeVisible();
  });

  test('login form shows loading state during submission', async ({ page }) => {
    await page.goto('/auth/login');
    await page.getByTestId('login-email').fill(TEST_USERS.owner.email);
    await page.getByTestId('login-password').fill(TEST_USERS.owner.password);
    await page.getByTestId('login-submit').click();

    // Button should be disabled during loading
    await expect(page.getByTestId('login-submit')).toBeDisabled();
  });
});
