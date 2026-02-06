// Use fixed emails (no timestamp) so setup and test workers share the same identifiers.
// The cleanup in auth.setup.ts deletes all e2e-test prefixed users before each run.
const TEST_PREFIX = 'e2e-test';

export const TEST_USERS = {
  owner: {
    email: `${TEST_PREFIX}-owner@test.example.com`,
    password: 'TestPassword123!',
    role: 'owner' as const,
  },
  admin: {
    email: `${TEST_PREFIX}-admin@test.example.com`,
    password: 'TestPassword123!',
    role: 'admin' as const,
  },
  viewer: {
    email: `${TEST_PREFIX}-viewer@test.example.com`,
    password: 'TestPassword123!',
    role: 'viewer' as const,
  },
  tempPassword: {
    email: `${TEST_PREFIX}-temp@test.example.com`,
    password: 'TempPass999!',
    newPassword: 'NewSecure456!',
    role: 'viewer' as const,
  },
  freshUser: {
    email: `${TEST_PREFIX}-fresh@test.example.com`,
    password: 'FreshPass789!',
    role: 'viewer' as const,
  },
} as const;

export const STORAGE_STATE_DIR = 'playwright/.auth';

export const AUTH_FILES = {
  owner: `${STORAGE_STATE_DIR}/owner.json`,
  admin: `${STORAGE_STATE_DIR}/admin.json`,
  viewer: `${STORAGE_STATE_DIR}/viewer.json`,
};
