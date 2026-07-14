// Local E2E config — runs the full app + CMS smoke suite against a locally
// served build with the Supabase network surface mocked (see
// tests/e2e/support/gatewayMock.ts). Separate from playwright.config.ts,
// which targets the live myinsurepath.com deployment.
//
// Run with: npx playwright test --config=playwright.local.config.ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 45000,
  retries: 1,
  fullyParallel: true,
  use: {
    baseURL: 'http://localhost:3000',
    headless: true,
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
    launchOptions: {
      executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH || '/opt/pw-browsers/chromium',
    },
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Pixel 7'] },
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: true,
    timeout: 60000,
  },
});
