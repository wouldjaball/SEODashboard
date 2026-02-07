import { test, expect } from '@playwright/test';
import { interceptAnalyticsAPIs } from '../helpers/mock-api';
import {
  cleanupTestAccessCodes,
  getAccessCodeByCode,
} from '../helpers/supabase-admin';

test.describe('Admin Access Codes Management', () => {
  test.beforeEach(async ({ page }) => {
    await interceptAnalyticsAPIs(page);
  });

  test.afterEach(async () => {
    await cleanupTestAccessCodes();
  });

  test('page loads with codes table', async ({ page }) => {
    await page.goto('/admin/access-codes');
    await expect(page.getByRole('heading', { name: 'Access Codes', level: 1 })).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId('access-codes-table')).toBeVisible();
  });

  test('open create dialog', async ({ page }) => {
    await page.goto('/admin/access-codes');
    await expect(page.getByTestId('create-code-button')).toBeVisible({ timeout: 15_000 });

    await page.getByTestId('create-code-button').click();
    await expect(page.getByTestId('create-code-dialog')).toBeVisible();
    await expect(page.getByTestId('new-code-input')).toBeVisible();
  });

  test('create access code', async ({ page }) => {
    const codeValue = `E2E-TEST-${Date.now().toString(36).toUpperCase()}`;

    await page.goto('/admin/access-codes');
    await expect(page.getByTestId('create-code-button')).toBeVisible({ timeout: 15_000 });

    // Open dialog
    await page.getByTestId('create-code-button').click();
    await expect(page.getByTestId('create-code-dialog')).toBeVisible();

    // Fill form
    await page.getByTestId('new-code-input').fill(codeValue);
    await page.getByTestId('new-description-input').fill('E2E test code');

    // Submit
    await page.getByTestId('create-code-submit').click();

    // Dialog should close
    await expect(page.getByTestId('create-code-dialog')).not.toBeVisible({ timeout: 10_000 });

    // Code should appear in table
    await expect(page.getByText(codeValue)).toBeVisible({ timeout: 10_000 });

    // Verify in database
    const dbCode = await getAccessCodeByCode(codeValue);
    expect(dbCode).not.toBeNull();
    expect(dbCode!.is_active).toBe(true);
  });

  test('generate random code', async ({ page }) => {
    await page.goto('/admin/access-codes');
    await expect(page.getByTestId('create-code-button')).toBeVisible({ timeout: 15_000 });

    // Open dialog
    await page.getByTestId('create-code-button').click();
    await expect(page.getByTestId('create-code-dialog')).toBeVisible();

    // Input should be empty initially
    await expect(page.getByTestId('new-code-input')).toHaveValue('');

    // Click generate
    await page.getByTestId('generate-random-code').click();

    // Input should have an 8-character uppercase value
    const value = await page.getByTestId('new-code-input').inputValue();
    expect(value).toHaveLength(8);
    expect(value).toMatch(/^[A-Z0-9]+$/);
  });

  test('deactivate code', async ({ page }) => {
    const codeValue = `E2E-TEST-DEACT${Date.now().toString(36).toUpperCase()}`.slice(0, 20);

    // Create code via UI to avoid RLS issues
    await page.goto('/admin/access-codes');
    await expect(page.getByTestId('create-code-button')).toBeVisible({ timeout: 15_000 });
    await page.getByTestId('create-code-button').click();
    await expect(page.getByTestId('create-code-dialog')).toBeVisible();
    await page.getByTestId('new-code-input').fill(codeValue);
    await page.getByTestId('create-code-submit').click();
    await expect(page.getByTestId('create-code-dialog')).not.toBeVisible({ timeout: 10_000 });
    await expect(page.getByText(codeValue)).toBeVisible({ timeout: 10_000 });

    // Click toggle (deactivate)
    await page.getByTestId(`toggle-code-${codeValue}`).click();

    // Status should change to Inactive
    const row = page.getByTestId(`code-row-${codeValue}`);
    await expect(row.getByText('Inactive', { exact: true })).toBeVisible({ timeout: 10_000 });

    // Verify in database
    const dbCode = await getAccessCodeByCode(codeValue);
    expect(dbCode).not.toBeNull();
    expect(dbCode!.is_active).toBe(false);
  });

  test('reactivate code', async ({ page }) => {
    const codeValue = `E2E-TEST-REACT${Date.now().toString(36).toUpperCase()}`.slice(0, 20);

    // Create the code via UI
    await page.goto('/admin/access-codes');
    await expect(page.getByTestId('create-code-button')).toBeVisible({ timeout: 15_000 });
    await page.getByTestId('create-code-button').click();
    await expect(page.getByTestId('create-code-dialog')).toBeVisible();
    await page.getByTestId('new-code-input').fill(codeValue);
    await page.getByTestId('create-code-submit').click();
    await expect(page.getByTestId('create-code-dialog')).not.toBeVisible({ timeout: 10_000 });
    await expect(page.getByText(codeValue)).toBeVisible({ timeout: 10_000 });

    const row = page.getByTestId(`code-row-${codeValue}`);

    // Deactivate it first — wait for API response to complete
    const deactivateResponse = page.waitForResponse(
      (resp) => resp.url().includes('/api/admin/access-codes') && resp.request().method() === 'DELETE'
    );
    await page.getByTestId(`toggle-code-${codeValue}`).click();
    await deactivateResponse;
    await expect(row.getByText('Inactive', { exact: true })).toBeVisible({ timeout: 10_000 });

    // Reactivate — wait for API response to complete
    const reactivateResponse = page.waitForResponse(
      (resp) => resp.url().includes('/api/admin/access-codes') && resp.request().method() === 'PATCH'
    );
    await page.getByTestId(`toggle-code-${codeValue}`).click();
    await reactivateResponse;
    await expect(row.getByText('Active', { exact: true })).toBeVisible({ timeout: 10_000 });

    // Verify in database
    const dbCode = await getAccessCodeByCode(codeValue);
    expect(dbCode).not.toBeNull();
    expect(dbCode!.is_active).toBe(true);
  });

  test('copy code shows feedback', async ({ page }) => {
    const codeValue = `E2E-TEST-COPY${Date.now().toString(36).toUpperCase()}`.slice(0, 20);

    // Create code via UI to avoid RLS issues
    await page.goto('/admin/access-codes');
    await expect(page.getByTestId('create-code-button')).toBeVisible({ timeout: 15_000 });
    await page.getByTestId('create-code-button').click();
    await expect(page.getByTestId('create-code-dialog')).toBeVisible();
    await page.getByTestId('new-code-input').fill(codeValue);
    await page.getByTestId('create-code-submit').click();
    await expect(page.getByTestId('create-code-dialog')).not.toBeVisible({ timeout: 10_000 });
    await expect(page.getByText(codeValue)).toBeVisible({ timeout: 10_000 });

    // Grant clipboard permissions for the test
    await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);

    // Click copy button
    await page.getByTestId(`copy-code-${codeValue}`).click();

    // Check icon should appear (green feedback) — the Check icon replaces Copy icon
    const copyButton = page.getByTestId(`copy-code-${codeValue}`);
    await expect(copyButton.locator('.text-green-500')).toBeVisible({ timeout: 5_000 });
  });
});
