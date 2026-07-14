import { test, expect } from '@playwright/test';
import { installGatewayMocks, loginViaForm, acceptTermsIfShown } from './support/gatewayMock';

test.describe('Operator app', () => {
  test.beforeEach(async ({ page }) => {
    await installGatewayMocks(page, 'operator');
    await page.addInitScript(() => {
      localStorage.setItem('SP_ONBOARDED_OPERATOR', '1');
    });
  });

  test('shows the login gate when signed out', async ({ page }) => {
    await page.goto('/operatorapp');
    await expect(page.locator('input[type="email"]').first()).toBeVisible({ timeout: 15000 });
    await expect(page.locator('input[type="password"]').first()).toBeVisible();
  });

  test('logs in and lands on the operator home tab', async ({ page }) => {
    await page.goto('/operatorapp');
    await loginViaForm(page, 'operator');
    await acceptTermsIfShown(page);

    await expect(page.getByText('Beranda').first()).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('Polis').first()).toBeVisible();
    await expect(page.getByText('Klaim').first()).toBeVisible();
    await expect(page.getByText('Profil').first()).toBeVisible();
  });

  test('navigates through the bottom nav tabs without crashing', async ({ page }) => {
    await page.goto('/operatorapp');
    await loginViaForm(page, 'operator');
    await acceptTermsIfShown(page);
    await expect(page.getByText('Beranda').first()).toBeVisible({ timeout: 15000 });

    for (const tab of ['Polis', 'Klaim', 'Tarik', 'Agen', 'Profil']) {
      await page.getByText(tab).first().click();
      await page.waitForTimeout(300);
      await expect(page.locator('body')).not.toContainText('⚠️');
    }
  });
});
