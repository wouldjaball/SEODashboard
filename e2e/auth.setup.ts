import { test as setup, expect } from '@playwright/test';
import {
  createTestUser,
  assignUserToCompany,
  getFirstCompanyId,
  cleanupTestUsers,
  cleanupTestCompanies,
  cleanupTestAccessCodes,
  cleanupTestInvitations,
} from './helpers/supabase-admin';
import { interceptAnalyticsAPIs } from './helpers/mock-api';
import { TEST_USERS, AUTH_FILES } from './fixtures/test-users';
import fs from 'fs';
import path from 'path';

const authDir = path.join(__dirname, '..', 'playwright', '.auth');

setup.beforeAll(async () => {
  // Ensure auth directory exists
  fs.mkdirSync(authDir, { recursive: true });

  // Clean up any leftover test data from previous runs
  await cleanupTestUsers();
  await cleanupTestCompanies();
  await cleanupTestAccessCodes();
  await cleanupTestInvitations();
});

setup('create test users and assign roles', async () => {
  const companyId = await getFirstCompanyId();

  // Create owner user
  const ownerId = await createTestUser(
    TEST_USERS.owner.email,
    TEST_USERS.owner.password
  );
  await assignUserToCompany(ownerId, companyId, 'owner');

  // Create admin user
  const adminId = await createTestUser(
    TEST_USERS.admin.email,
    TEST_USERS.admin.password
  );
  await assignUserToCompany(adminId, companyId, 'admin');

  // Create viewer user
  const viewerId = await createTestUser(
    TEST_USERS.viewer.email,
    TEST_USERS.viewer.password
  );
  await assignUserToCompany(viewerId, companyId, 'viewer');

  // Create temp-password user (must_change_password flag)
  const tempId = await createTestUser(
    TEST_USERS.tempPassword.email,
    TEST_USERS.tempPassword.password,
    { must_change_password: true }
  );
  await assignUserToCompany(tempId, companyId, 'viewer');

  // Create fresh user with NO company assignment (for auto-assignment test)
  await createTestUser(
    TEST_USERS.freshUser.email,
    TEST_USERS.freshUser.password
  );
});

setup('authenticate as owner', async ({ page }) => {
  await interceptAnalyticsAPIs(page);

  await page.goto('/auth/login');
  await page.getByTestId('login-email').fill(TEST_USERS.owner.email);
  await page.getByTestId('login-password').fill(TEST_USERS.owner.password);
  await page.getByTestId('login-submit').click();

  await page.waitForURL('**/dashboard/**', { timeout: 30_000 });
  await expect(page.getByTestId('dashboard-header')).toBeVisible({ timeout: 30_000 });

  await page.context().storageState({ path: AUTH_FILES.owner });
});

setup('authenticate as viewer', async ({ page }) => {
  await interceptAnalyticsAPIs(page);

  await page.goto('/auth/login');
  await page.getByTestId('login-email').fill(TEST_USERS.viewer.email);
  await page.getByTestId('login-password').fill(TEST_USERS.viewer.password);
  await page.getByTestId('login-submit').click();

  await page.waitForURL('**/dashboard/**', { timeout: 30_000 });
  await expect(page.getByTestId('dashboard-header')).toBeVisible({ timeout: 30_000 });

  await page.context().storageState({ path: AUTH_FILES.viewer });
});

setup('authenticate as admin', async ({ page }) => {
  await interceptAnalyticsAPIs(page);

  await page.goto('/auth/login');
  await page.getByTestId('login-email').fill(TEST_USERS.admin.email);
  await page.getByTestId('login-password').fill(TEST_USERS.admin.password);
  await page.getByTestId('login-submit').click();

  await page.waitForURL('**/dashboard/**', { timeout: 30_000 });
  await expect(page.getByTestId('dashboard-header')).toBeVisible({ timeout: 30_000 });

  await page.context().storageState({ path: AUTH_FILES.admin });
});
