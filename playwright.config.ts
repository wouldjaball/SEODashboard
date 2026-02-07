import { defineConfig, devices } from '@playwright/test';
import path from 'path';
import fs from 'fs';

// Load .env.local into process.env for test helpers (Supabase admin client)
const envPath = path.resolve(__dirname, '.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  for (const line of envContent.split('\n')) {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      const value = match[2].trim().replace(/^["']|["']$/g, '');
      if (!process.env[key]) process.env[key] = value;
    }
  }
}

const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;
const baseURL = `http://localhost:${PORT}`;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : 2,
  reporter: process.env.CI
    ? [['html', { open: 'never' }], ['github']]
    : [['html', { open: 'on-failure' }]],

  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  projects: [
    // Setup project: creates test users, authenticates, saves storageState
    {
      name: 'setup',
      testMatch: /auth\.setup\.ts/,
    },

    // Tests that need owner auth
    {
      name: 'authenticated-owner',
      use: {
        ...devices['Desktop Chrome'],
        storageState: path.join(__dirname, 'playwright/.auth/owner.json'),
      },
      dependencies: ['setup'],
      testMatch: /\/(dashboard|auth|admin)\/.+\.spec\.ts/,
      testIgnore: /(rbac|protection)\.spec\.ts$/,
    },

    // Tests that need viewer auth (for RBAC viewer tests)
    {
      name: 'authenticated-viewer',
      use: {
        ...devices['Desktop Chrome'],
        storageState: path.join(__dirname, 'playwright/.auth/viewer.json'),
      },
      dependencies: ['setup'],
      testMatch: /rbac\.spec\.ts$/,
    },

    // Tests that need NO auth (middleware protection)
    {
      name: 'unauthenticated',
      use: {
        ...devices['Desktop Chrome'],
        storageState: { cookies: [], origins: [] },
      },
      testMatch: /protection\.spec\.ts/,
    },
  ],

  webServer: {
    command: 'npm run dev',
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
