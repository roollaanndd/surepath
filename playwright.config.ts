import { defineConfig } from '@playwright/test';

// FIX v1.53.0: default was hardcoded https://myinsurepath.com — any e2e that
// clicks "Bayar" or verifies an agent would pollute production. Now takes
// PLAYWRIGHT_BASE_URL from env (typically a Vercel preview URL in CI), only
// falling back to prod for legacy local runs where the human explicitly opts
// in via UNSAFE_E2E_AGAINST_PROD=1.
const PROD_URL = 'https://myinsurepath.com';
const baseURL =
  process.env.PLAYWRIGHT_BASE_URL ??
  (process.env.UNSAFE_E2E_AGAINST_PROD === '1' ? PROD_URL : 'http://127.0.0.1:3000');

export default defineConfig({
  testDir: './tests',
  timeout: 30000,
  retries: 1,
  webServer: {
    command: 'npm run dev -- --host 127.0.0.1',
    url: 'http://127.0.0.1:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
  },
  use: {
    baseURL,
    headless: true,
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { browserName: 'chromium' },
    },
  ],
});
