import { test, expect } from '@playwright/test';
import { installGatewayMocks } from './support/gatewayMock';

test.describe('Insurer app', () => {
  test.beforeEach(async ({ page }) => {
    await installGatewayMocks(page, 'admin'); // role is irrelevant — insurer auth is token-based, not JWT
    await page.addInitScript(() => {
      localStorage.setItem('SP_ONBOARDED_INSURER', '1');
    });
  });

  test('shows the token entry gate with no token', async ({ page }) => {
    await page.goto('/insurerapp');
    await expect(page.getByText(/Token/i).first()).toBeVisible({ timeout: 15000 });
  });

  test('loads the dashboard when a token is present in the URL', async ({ page }) => {
    await page.goto('/insurerapp?token=e2e-mock-token');

    await expect(page.getByText('Beranda').first()).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('Polis').first()).toBeVisible();
    await expect(page.getByText('Klaim').first()).toBeVisible();
    await expect(page.getByText('Bayar').first()).toBeVisible();
    await expect(page.getByText('Profil').first()).toBeVisible();
  });

  test('navigates through the bottom nav tabs without crashing', async ({ page }) => {
    await page.goto('/insurerapp?token=e2e-mock-token');
    await expect(page.getByText('Beranda').first()).toBeVisible({ timeout: 15000 });

    for (const tab of ['Polis', 'Klaim', 'Bayar', 'Profil']) {
      await page.getByText(tab).first().click();
      await page.waitForTimeout(300);
      await expect(page.locator('body')).not.toContainText('⚠️');
    }
  });
});
