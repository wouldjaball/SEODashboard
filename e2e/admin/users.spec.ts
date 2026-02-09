import { test, expect } from '@playwright/test';
import { interceptAnalyticsAPIs } from '../helpers/mock-api';
import { TEST_USERS } from '../fixtures/test-users';
import {
  cleanupTestInvitations,
} from '../helpers/supabase-admin';

test.describe('Admin Users Management', () => {
  test.beforeEach(async ({ page }) => {
    await interceptAnalyticsAPIs(page);
  });

  test.afterEach(async () => {
    await cleanupTestInvitations();
  });

  test('page loads with users table', async ({ page }) => {
    await page.goto('/admin/users');
    await expect(page.getByText('User Management')).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId('users-table-card')).toBeVisible();

    // Should show at least the test users (owner, admin, viewer, temp)
    const rows = page.locator('[data-testid^="user-row-"]');
    await expect(rows.first()).toBeVisible({ timeout: 10_000 });
    const count = await rows.count();
    expect(count).toBeGreaterThanOrEqual(3);
  });

  test('search filters users by email', async ({ page }) => {
    await page.goto('/admin/users');
    await expect(page.getByTestId('users-search-input')).toBeVisible({ timeout: 15_000 });

    // Search for owner
    await page.getByTestId('users-search-input').fill('e2e-test-owner');

    // Owner row should be visible
    await expect(page.getByTestId(`user-row-${TEST_USERS.owner.email}`)).toBeVisible({ timeout: 10_000 });

    // Viewer row should NOT be visible
    await expect(page.getByTestId(`user-row-${TEST_USERS.viewer.email}`)).not.toBeVisible();
  });

  test('open invite dialog', async ({ page }) => {
    await page.goto('/admin/users');
    await expect(page.getByTestId('invite-user-button')).toBeVisible({ timeout: 15_000 });

    await page.getByTestId('invite-user-button').click();
    await expect(page.getByTestId('invite-user-dialog')).toBeVisible();
    await expect(page.getByTestId('invite-email-input')).toBeVisible();
    await expect(page.getByTestId('invite-role-select')).toBeVisible();
  });

  test('invite new user', async ({ page }) => {
    const inviteEmail = `e2e-test-invite-${Date.now()}@test.example.com`;

    await page.goto('/admin/users');
    await expect(page.getByTestId('invite-user-button')).toBeVisible({ timeout: 15_000 });

    // Open dialog
    await page.getByTestId('invite-user-button').click();
    await expect(page.getByTestId('invite-user-dialog')).toBeVisible();

    // Fill email
    await page.getByTestId('invite-email-input').fill(inviteEmail);

    // Select just the first company (owner only has ownership of the first company)
    const firstCheckbox = page.getByTestId('invite-user-dialog').locator('button[role="checkbox"]').first();
    await firstCheckbox.click();

    // Handle alert that appears on success/error
    page.on('dialog', async (dialog) => {
      await dialog.accept();
    });

    // Submit
    await page.getByTestId('invite-user-submit').click();

    // Dialog should close after success
    await expect(page.getByTestId('invite-user-dialog')).not.toBeVisible({ timeout: 30_000 });

    // User should appear in the table as pending
    await expect(page.getByTestId(`user-row-${inviteEmail}`)).toBeVisible({ timeout: 10_000 });
  });

  test('revoke invitation', async ({ page }) => {
    const inviteEmail = `e2e-test-revoke-${Date.now()}@test.example.com`;

    await page.goto('/admin/users');
    await expect(page.getByTestId('invite-user-button')).toBeVisible({ timeout: 15_000 });

    // Handle all native dialogs (alerts from invite success/error, and revoke success)
    page.on('dialog', async (dialog) => {
      await dialog.accept();
    });

    // First invite a user
    await page.getByTestId('invite-user-button').click();
    await expect(page.getByTestId('invite-user-dialog')).toBeVisible();
    await page.getByTestId('invite-email-input').fill(inviteEmail);

    // Select just the first company (owner only has ownership of the first company)
    const firstCheckbox = page.getByTestId('invite-user-dialog').locator('button[role="checkbox"]').first();
    await firstCheckbox.click();

    await page.getByTestId('invite-user-submit').click();
    await expect(page.getByTestId('invite-user-dialog')).not.toBeVisible({ timeout: 30_000 });

    // Wait for user to appear
    await expect(page.getByTestId(`user-row-${inviteEmail}`)).toBeVisible({ timeout: 10_000 });

    // Click delete button
    await page.getByTestId(`delete-user-${inviteEmail}`).click();

    // Confirm in delete dialog
    await expect(page.getByTestId('delete-user-dialog')).toBeVisible();
    await page.getByTestId('delete-user-confirm').click();

    // User should be removed from table
    await expect(page.getByTestId(`user-row-${inviteEmail}`)).not.toBeVisible({ timeout: 15_000 });
  });

  test('active users show Manage button', async ({ page }) => {
    await page.goto('/admin/users');
    await expect(page.getByTestId('users-table-card')).toBeVisible({ timeout: 15_000 });

    // The owner row should have a Manage button
    const ownerRow = page.getByTestId(`user-row-${TEST_USERS.owner.email}`);
    await expect(ownerRow).toBeVisible({ timeout: 10_000 });
    await expect(ownerRow.getByRole('button', { name: 'Manage' })).toBeVisible();
  });
});
