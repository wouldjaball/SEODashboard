import { test, expect } from '@playwright/test';

test.describe('Middleware Route Protection', () => {
  test('unauthenticated user accessing /dashboard/executive is redirected to /auth/login', async ({ page }) => {
    await page.goto('/dashboard/executive');
    await expect(page).toHaveURL(/\/auth\/login/);
  });

  test('unauthenticated user accessing /dashboard/executive/owner is redirected', async ({ page }) => {
    await page.goto('/dashboard/executive/owner');
    await expect(page).toHaveURL(/\/auth\/login/);
  });

  test('unauthenticated user can access /auth/login', async ({ page }) => {
    const response = await page.goto('/auth/login');
    expect(response?.status()).toBe(200);
    await expect(page).toHaveURL(/\/auth\/login/);
  });

  test('unauthenticated user can access home page /', async ({ page }) => {
    const response = await page.goto('/');
    expect(response?.status()).toBe(200);
    await expect(page.getByTestId('login-email')).toBeVisible();
  });

  test('unauthenticated user can access /auth/sign-up', async ({ page }) => {
    const response = await page.goto('/auth/sign-up');
    expect(response?.status()).toBe(200);
    await expect(page.getByText('Sign Up Not Available')).toBeVisible();
  });
});
