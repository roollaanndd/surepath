import { test, expect } from '@playwright/test';
import { installGatewayMocks, loginViaForm, acceptTermsIfShown } from './support/gatewayMock';

// The CMS is a desktop-oriented shell with a persistent sidebar (hidden
// behind a hamburger on narrow viewports) — override the mobile device
// profile used by the consumer apps.
test.use({ viewport: { width: 1440, height: 900 } });

test.describe('Admin CMS', () => {
  test.beforeEach(async ({ page }) => {
    await installGatewayMocks(page, 'admin');
  });

  test('logs in and lands on the dashboard', async ({ page }) => {
    await page.goto('/admin');
    await loginViaForm(page, 'admin');
    await acceptTermsIfShown(page);

    await expect(page.getByText('Halo, Demo').first()).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('Status Pesanan').first()).toBeVisible();
  });

  test('navigates through the CMS menu without crashing', async ({ page }) => {
    await page.goto('/admin');
    await loginViaForm(page, 'admin');
    await acceptTermsIfShown(page);
    await expect(page.getByText('Halo, Demo').first()).toBeVisible({ timeout: 15000 });

    for (const menuLabel of ['Pesanan Polis', 'Pengguna', 'Laporan', 'Komisi', 'Pembayaran Xendit']) {
      await page.getByText(menuLabel, { exact: true }).first().click();
      await page.waitForTimeout(300);
      await expect(page.locator('body')).not.toContainText('⚠️');
    }
  });
});
