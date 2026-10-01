import { defineConfig } from '@playwright/test';

/**
 * Phase 5 e2e. `smoke` always runs (no credentials). The full
 * login → upload → dashboard journey needs a test user and skips without
 * E2E_EMAIL / E2E_PASSWORD (runs on manual dispatch with secrets in CI).
 */
export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  retries: process.env.CI ? 1 : 0,
  use: {
    baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:4173/financial-analysis/',
  },
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: 'npm run preview -- --port 4173 --strictPort',
        url: 'http://localhost:4173/financial-analysis/',
        reuseExistingServer: !process.env.CI,
        timeout: 60_000,
      },
});
