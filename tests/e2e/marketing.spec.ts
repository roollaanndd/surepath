import { test, expect } from '@playwright/test';
import { installGatewayMocks } from './support/gatewayMock';

// Public site — reachable without auth, still hits the gateway for a few
// things (promo banner, blog list, OJK rates) so mocks stay installed.
test.describe('Public website', () => {
  test.beforeEach(async ({ page }) => {
    await installGatewayMocks(page, 'customer');
  });

  test('homepage loads with SurePath branding', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/SurePath/i, { timeout: 15000 });
    await expect(page.locator('body')).not.toContainText('⚠️');
  });

  test('premium calculator page loads', async ({ page }) => {
    await page.goto('/kalkulator');
    await page.waitForTimeout(1000);
    await expect(page.locator('body')).not.toContainText('⚠️');
  });

  test('blog index loads', async ({ page }) => {
    await page.goto('/blog');
    await page.waitForTimeout(1000);
    await expect(page.locator('body')).not.toContainText('⚠️');
  });

  for (const slug of ['privacy', 'terms', 'security']) {
    test(`static page /${slug} loads`, async ({ page }) => {
      await page.goto(`/${slug}`);
      await page.waitForTimeout(1000);
      await expect(page.locator('body')).not.toContainText('⚠️');
    });
  }

  test('login page renders the auth form', async ({ page }) => {
    await page.goto('/login');
    await expect(page.locator('input[type="email"]').first()).toBeVisible({ timeout: 15000 });
    await expect(page.locator('input[type="password"]').first()).toBeVisible();
  });

  test('admin login page renders the auth form', async ({ page }) => {
    await page.goto('/admin');
    await expect(page.locator('input[type="email"]').first()).toBeVisible({ timeout: 15000 });
    await expect(page.locator('input[type="password"]').first()).toBeVisible();
  });
});
