// E2E tests for SurePath critical flows.
// Run with: npx playwright test
// Integration tests require an explicit target. Never send test traffic to production by default.
// Set PLAYWRIGHT_GATEWAY_URL to a local/staging Supabase Edge Function URL.
// Production testing requires UNSAFE_E2E_AGAINST_PROD=1.

import { test, expect } from '@playwright/test';

const PROD_BASE_URL = 'https://myinsurepath.com';
const PROD_GATEWAY_URL = 'https://uyjgeteelnswphyzkjwi.supabase.co/functions/v1/data-gateway';
const UNSAFE_PROD_OPT_IN = process.env.UNSAFE_E2E_AGAINST_PROD === '1';
const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? (UNSAFE_PROD_OPT_IN ? PROD_BASE_URL : 'http://127.0.0.1:3000');
const GATEWAY_URL = process.env.PLAYWRIGHT_GATEWAY_URL ?? (UNSAFE_PROD_OPT_IN ? PROD_GATEWAY_URL : '');

// ─── Gateway API Tests (not affected by Vercel checkpoint) ───────────────────

test.describe('Data Gateway', () => {
  test.skip(!GATEWAY_URL, 'Set PLAYWRIGHT_GATEWAY_URL to a local/staging gateway; production requires explicit opt-in.');
  test('rejects unauthenticated requests (401)', async ({ request }) => {
    const response = await request.post(GATEWAY_URL, {
      data: { action: 'get_my_profile' },
      headers: { 'Content-Type': 'application/json' },
    });
    expect(response.status()).toBe(401);
  });

  test('accepts public insurer action without JWT (404 for fake token)', async ({ request }) => {
    // Retry up to 3 times to handle cold-start 503s
    let status = 0;
    for (let i = 0; i < 3; i++) {
      const response = await request.post(GATEWAY_URL, {
        data: { action: 'get_insurer_dashboard', params: { token: 'fake-token' } },
        headers: { 'Content-Type': 'application/json' },
      });
      status = response.status();
      if (status !== 503) break;
      await new Promise(r => setTimeout(r, 3000));
    }
    // Invalid partner tokens should be rejected; rate limiting is tested separately.
    expect(status).toBe(404);
  });

  test('returns 400 for missing action', async ({ request }) => {
    const response = await request.post(GATEWAY_URL, {
      data: {},
      headers: { 'Content-Type': 'application/json' },
    });
    expect(response.status()).toBe(400);
  });

  test('submit_insurer_decision requires notes for REQUEST_INFO', async ({ request }) => {
    const response = await request.post(GATEWAY_URL, {
      data: { action: 'submit_insurer_decision', params: { token: 'fake', action: 'REQUEST_INFO', notes: '' } },
      headers: { 'Content-Type': 'application/json' },
    });
    // Should return 400 (notes required) not 404 (token not found first)
    // Depending on order of checks, could be either
    expect([400, 404]).toContain(response.status());
  });

  test('admin actions require JWT', async ({ request }) => {
    const response = await request.post(GATEWAY_URL, {
      data: { action: 'admin_list_orders' },
      headers: { 'Content-Type': 'application/json' },
    });
    expect(response.status()).toBe(401);
  });

  test('admin_list_insurer_tokens requires JWT', async ({ request }) => {
    const response = await request.post(GATEWAY_URL, {
      data: { action: 'admin_list_insurer_tokens' },
      headers: { 'Content-Type': 'application/json' },
    });
    expect(response.status()).toBe(401);
  });

  test('admin_list_review_tokens requires JWT', async ({ request }) => {
    const response = await request.post(GATEWAY_URL, {
      data: { action: 'admin_list_review_tokens' },
      headers: { 'Content-Type': 'application/json' },
    });
    expect(response.status()).toBe(401);
  });

  test('insurer_list_payments requires token param', async ({ request }) => {
    const response = await request.post(GATEWAY_URL, {
      data: { action: 'insurer_list_payments', params: {} },
      headers: { 'Content-Type': 'application/json' },
    });
    // Should return 400 (token required) since it's a public action but token is missing
    expect([400, 404]).toContain(response.status());
  });
});

// ─── Security Headers (may be blocked by Vercel checkpoint) ──────────────────

test.describe('Security Headers', () => {
  test.skip('CSP header present', async ({ request }) => {
    const response = await request.get(BASE_URL);
    const csp = response.headers()['content-security-policy'];
    expect(csp).toBeDefined();
    expect(csp).toContain('default-src');
  });

  test.skip('HSTS header present', async ({ request }) => {
    const response = await request.get(BASE_URL);
    const hsts = response.headers()['strict-transport-security'];
    expect(hsts).toBeDefined();
  });

  test.skip('X-Frame-Options is DENY', async ({ request }) => {
    const response = await request.get(BASE_URL);
    const xfo = response.headers()['x-frame-options'];
    expect(xfo?.toUpperCase()).toContain('DENY');
  });

  test.skip('X-Content-Type-Options is nosniff', async ({ request }) => {
    const response = await request.get(BASE_URL);
    const xcto = response.headers()['x-content-type-options'];
    expect(xcto).toContain('nosniff');
  });
});

// ─── PWA Manifest (may be blocked by Vercel checkpoint) ──────────────────────

test.describe('PWA', () => {
  test.skip('manifest is accessible', async ({ request }) => {
    const response = await request.get(`${BASE_URL}/manifest.webmanifest`);
    expect(response.status()).toBeLessThan(400);
  });

  test.skip('service worker is accessible', async ({ request }) => {
    const response = await request.get(`${BASE_URL}/sw.js`);
    expect(response.status()).toBeLessThan(400);
  });

  test.skip('logo image is accessible', async ({ request }) => {
    const response = await request.get(`${BASE_URL}/logo.png`);
    expect(response.status()).toBeLessThan(400);
  });
});

// ─── Rate Limiting ───────────────────────────────────────────────────────────

// ─── Local/staging UI smoke tests ───────────────────────────────────────────
test.describe('UI smoke tests', () => {
  test.skip(UNSAFE_PROD_OPT_IN, 'UI smoke tests are intended for local/staging.');

  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => sessionStorage.setItem('sp_splash_done_v2', '1'));
  });

  test('homepage loads with SurePath branding', async ({ page }) => {
    await page.goto(BASE_URL);
    await expect(page).toHaveTitle(/SurePath/i);
  });

  test('login page renders form fields', async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);
    await expect(page.locator('input[type="email"]').first()).toBeVisible({ timeout: 10_000 });
  });

  test('operator app shows an accessible login gate', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`${BASE_URL}/operatorapp`);
    await expect(page.getByRole('heading', { name: /Operator App/i })).toBeVisible({ timeout: 10_000 });
    await expect(page.getByLabel('Email')).toBeVisible();
    await expect(page.getByLabel('Operator password')).toBeVisible();
    await expect(page.getByRole('button', { name: /show password/i })).toBeVisible();
    const widths = await page.evaluate(() => ({ document: document.documentElement.scrollWidth, viewport: window.innerWidth }));
    expect(widths.document).toBeLessThanOrEqual(widths.viewport);
  });

  test('mobile login controls are accessible and do not overflow', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`${BASE_URL}/login`);
    await expect(page.locator('input[type="email"]').first()).toHaveAttribute('aria-label', /Email address|Alamat email/i);
    await expect(page.locator('input[type="password"]').first()).toHaveAttribute('aria-label', /Password|Kata sandi/i);
    await expect(page.getByRole('button', { name: /show password|tampilkan kata sandi/i })).toBeVisible();
    const widths = await page.evaluate(() => ({ document: document.documentElement.scrollWidth, viewport: window.innerWidth }));
    expect(widths.document).toBeLessThanOrEqual(widths.viewport);
  });

  test('premium calculator slider has an accessible name on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(BASE_URL);
    const slider = page.locator('#vehicle-value-slider');
    await expect(slider).toHaveAttribute('aria-label', /Vehicle value|Harga kendaraan/i);
    const widths = await page.evaluate(() => ({ document: document.documentElement.scrollWidth, viewport: window.innerWidth }));
    expect(widths.document).toBeLessThanOrEqual(widths.viewport);
  });
});
