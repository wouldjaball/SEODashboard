import { test, expect } from '@playwright/test';
import { interceptAnalyticsAPIs } from '../helpers/mock-api';
import { cleanupTestCompanies } from '../helpers/supabase-admin';

test.describe('Admin Companies Management', () => {
  test.beforeEach(async ({ page }) => {
    await interceptAnalyticsAPIs(page);
  });

  test.afterEach(async () => {
    await cleanupTestCompanies();
  });

  test('page loads with company list', async ({ page }) => {
    await page.goto('/admin/companies');
    await expect(page.getByText('Company Management')).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId('companies-list')).toBeVisible();
  });

  test('toggle add company form', async ({ page }) => {
    await page.goto('/admin/companies');
    await expect(page.getByTestId('add-company-button')).toBeVisible({ timeout: 15_000 });

    // Show form
    await page.getByTestId('add-company-button').click();
    await expect(page.getByTestId('add-company-form')).toBeVisible();

    // Hide form
    await page.getByTestId('add-company-button').click();
    await expect(page.getByTestId('add-company-form')).not.toBeVisible();
  });

  test('create company', async ({ page }) => {
    const companyName = `e2e-test-company-${Date.now()}`;

    await page.goto('/admin/companies');
    await expect(page.getByTestId('add-company-button')).toBeVisible({ timeout: 15_000 });

    // Open form
    await page.getByTestId('add-company-button').click();
    await expect(page.getByTestId('add-company-form')).toBeVisible();

    // Fill form
    await page.getByLabel('Company Name *').fill(companyName);
    await page.getByLabel('Industry *').fill('E2E Test Industry');

    // Submit
    await page.getByTestId('create-company-submit').click();

    // Verify company appears in list
    await expect(page.getByText(companyName)).toBeVisible({ timeout: 10_000 });

    // Verify form closed
    await expect(page.getByTestId('add-company-form')).not.toBeVisible();
  });

  test('required field validation prevents empty submit', async ({ page }) => {
    await page.goto('/admin/companies');
    await expect(page.getByTestId('add-company-button')).toBeVisible({ timeout: 15_000 });

    // Open form and clear fields
    await page.getByTestId('add-company-button').click();
    await page.getByLabel('Company Name *').clear();
    await page.getByLabel('Industry *').clear();

    // Try to submit empty form
    await page.getByTestId('create-company-submit').click();

    // Form should still be visible (HTML5 validation prevents submission)
    await expect(page.getByTestId('add-company-form')).toBeVisible();
  });

  test('delete company', async ({ page }) => {
    // Create company via UI (admin client inserts bypass RLS but page reads use user client)
    const companyName = `e2e-test-delete-${Date.now()}`;

    await page.goto('/admin/companies');
    await expect(page.getByTestId('add-company-button')).toBeVisible({ timeout: 15_000 });

    // Create company through UI
    await page.getByTestId('add-company-button').click();
    await page.getByLabel('Company Name *').fill(companyName);
    await page.getByLabel('Industry *').fill('Delete Test Industry');
    await page.getByTestId('create-company-submit').click();
    await expect(page.getByText(companyName)).toBeVisible({ timeout: 10_000 });

    // Find the company's delete button
    const companyRow = page.locator('[data-testid^="company-item-"]', { hasText: companyName });
    const deleteButton = companyRow.locator('button[data-testid^="delete-company-"]');

    // Handle native confirm dialog
    page.on('dialog', async (dialog) => {
      expect(dialog.type()).toBe('confirm');
      await dialog.accept();
    });

    await deleteButton.click();

    // Verify company removed from list
    await expect(page.getByText(companyName)).not.toBeVisible({ timeout: 10_000 });
  });

  test('cancel delete keeps company', async ({ page }) => {
    // Create company via UI
    const companyName = `e2e-test-cancel-${Date.now()}`;

    await page.goto('/admin/companies');
    await expect(page.getByTestId('add-company-button')).toBeVisible({ timeout: 15_000 });

    // Create company through UI
    await page.getByTestId('add-company-button').click();
    await page.getByLabel('Company Name *').fill(companyName);
    await page.getByLabel('Industry *').fill('Cancel Test Industry');
    await page.getByTestId('create-company-submit').click();
    await expect(page.getByText(companyName)).toBeVisible({ timeout: 10_000 });

    // Find the company's delete button
    const companyRow = page.locator('[data-testid^="company-item-"]', { hasText: companyName });
    const deleteButton = companyRow.locator('button[data-testid^="delete-company-"]');

    // Handle native confirm dialog — dismiss it
    page.on('dialog', async (dialog) => {
      await dialog.dismiss();
    });

    await deleteButton.click();

    // Company should still be in the list
    await expect(page.getByText(companyName)).toBeVisible();
  });
});
