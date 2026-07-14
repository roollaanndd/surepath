import { test, expect } from '@playwright/test';
import { installGatewayMocks, loginViaForm, acceptTermsIfShown } from './support/gatewayMock';

test.describe('Customer app', () => {
  test.beforeEach(async ({ page }) => {
    await installGatewayMocks(page, 'customer');
    await page.addInitScript(() => {
      localStorage.setItem('SP_ONBOARDED_CUSTOMER', '1');
    });
  });

  test('logs in and lands on the customer home tab', async ({ page }) => {
    await page.goto('/login');
    await loginViaForm(page, 'customer');
    await acceptTermsIfShown(page);

    await expect(page.getByText('Beranda').first()).toBeVisible({ timeout: 15000 });
    // Bottom nav tabs render for a signed-in customer.
    await expect(page.getByText('Beli').first()).toBeVisible();
    await expect(page.getByText('Klaim').first()).toBeVisible();
    await expect(page.getByText('Riwayat').first()).toBeVisible();
    await expect(page.getByText('Profil').first()).toBeVisible();
  });

  test('navigates through the bottom nav tabs without crashing', async ({ page }) => {
    await page.goto('/login');
    await loginViaForm(page, 'customer');
    await acceptTermsIfShown(page);
    await expect(page.getByText('Beranda').first()).toBeVisible({ timeout: 15000 });

    for (const tab of ['Beli', 'Klaim', 'Riwayat', 'Profil']) {
      await page.getByText(tab).first().click();
      await page.waitForTimeout(300);
      await expect(page.locator('body')).not.toContainText('⚠️');
    }
  });
});
