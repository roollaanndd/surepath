import { test, expect } from '@playwright/test';
import { installGatewayMocks, loginViaForm, acceptTermsIfShown } from './support/gatewayMock';

test.describe('Agent app', () => {
  test.beforeEach(async ({ page }) => {
    await installGatewayMocks(page, 'agent');
    await page.addInitScript(() => {
      localStorage.setItem('SP_ONBOARDED_AGENT', '1');
    });
  });

  test('logs in and lands on the agent home tab', async ({ page }) => {
    await page.goto('/login');
    await loginViaForm(page, 'agent');
    await acceptTermsIfShown(page);

    await expect(page).toHaveURL(/\/agapps|\/agentapp/, { timeout: 15000 });
    await expect(page.getByText('Beranda').first()).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('Polis').first()).toBeVisible();
    await expect(page.getByText('Dompet').first()).toBeVisible();
    await expect(page.getByText('Profil').first()).toBeVisible();
  });

  test('navigates through the bottom nav tabs without crashing', async ({ page }) => {
    await page.goto('/login');
    await loginViaForm(page, 'agent');
    await acceptTermsIfShown(page);
    await expect(page.getByText('Beranda').first()).toBeVisible({ timeout: 15000 });

    for (const tab of ['Polis', 'Dompet', 'Profil']) {
      await page.getByText(tab).first().click();
      await page.waitForTimeout(300);
      await expect(page.locator('body')).not.toContainText('⚠️');
    }
  });
});
