import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  // tests/e2e/ holds the mocked-backend local suite (playwright.local.config.ts)
  // — it targets localhost, not this file's production baseURL.
  testIgnore: '**/e2e/**',
  timeout: 30000,
  retries: 1,
  use: {
    baseURL: 'https://myinsurepath.com',
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
