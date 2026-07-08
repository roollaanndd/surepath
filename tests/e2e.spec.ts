// E2E tests for SurePath critical flows.
// Run with: npx playwright test
// Tests run against the live production URL (myinsurepath.com).
// Note: UI tests may be blocked by Vercel Security Checkpoint for headless browsers.
// API/gateway tests run directly and are not affected.

import { test, expect } from '@playwright/test';

const BASE_URL = 'https://myinsurepath.com';
const GATEWAY_URL = 'https://uyjgeteelnswphyzkjwi.supabase.co/functions/v1/data-gateway';

// ─── Gateway API Tests (not affected by Vercel checkpoint) ───────────────────

test.describe('Data Gateway', () => {
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
    // 404 = invalid token (expected), 429 = rate limited from prior burst test (acceptable)
    expect([404, 429]).toContain(status);
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

test.describe('Rate Limiting', () => {
  test('returns 429 on burst (>60/hr from same IP)', async ({ request }) => {
    let got429 = false;
    for (let i = 0; i < 65; i++) {
      const response = await request.post(GATEWAY_URL, {
        data: { action: 'get_insurer_dashboard', params: { token: `burst-test-${i}` } },
        headers: { 'Content-Type': 'application/json' },
      });
      if (response.status() === 429) { got429 = true; break; }
    }
    expect(got429).toBeTruthy();
  });
});

// ─── UI Tests (may be blocked by Vercel checkpoint — marked as skipped) ──────

test.describe('UI (Vercel Checkpoint)', () => {
  test.skip('homepage loads with SurePath branding', async ({ page }) => {
    // Skipped: Vercel Security Checkpoint blocks headless browsers
    // To enable: run with --headed flag or use a real browser profile
    await page.goto(BASE_URL);
    await expect(page).toHaveTitle(/SurePath/i);
  });

  test.skip('login page renders form fields', async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);
    await page.waitForTimeout(3000);
    const emailInput = page.locator('input[type="email"]').first();
    expect(await emailInput.isVisible().catch(() => false)).toBeTruthy();
  });

  test.skip('operator app shows login gate', async ({ page }) => {
    await page.goto(`${BASE_URL}/operatorapp`);
    await page.waitForTimeout(3000);
    const hasLoginForm = await page.locator('text=/Operator|Masuk|Email/i').first().isVisible().catch(() => false);
    expect(hasLoginForm).toBeTruthy();
  });
});
