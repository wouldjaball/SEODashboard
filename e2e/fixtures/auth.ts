import { test as base, expect } from '@playwright/test';

// Re-export base test and expect as the central import point.
// The storageState is handled at the project level in playwright.config.ts.
// This file can be extended with custom fixtures in later phases.
export const test = base;
export { expect };
