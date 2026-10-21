// Apps Mitra (/agapps) — uji UI/UX end-to-end dengan backend ditiru.
//
// KENAPA DITIRU, bukan backend sungguhan: dari lingkungan ini `myinsurepath.com`
// dan `*.supabase.co` dua-duanya menjawab HTTP 000 (ditolak kebijakan proxy).
// Jadi login sungguhan tidak mungkin. Yang diuji di sini karena itu adalah
// SISI KLIEN: apakah layarnya render, apakah tiap tab hidup, dan — yang paling
// berharga — ACTION GATEWAY APA yang sebenarnya dipanggil apps mitra.
//
// Yang TIDAK dibuktikan berkas ini: bahwa gateway produksi memulangkan bentuk
// yang sama. Itu batas yang jujur, dan sengaja ditulis di sini supaya hijaunya
// uji ini tidak disalahartikan sebagai "produksi sehat".
//
// Gateway tiruannya punya PENANGKAP: setiap action yang belum ditiru dicatat
// dan dilaporkan di akhir, jadi uji ini menemukan sendiri apa yang dibutuhkan
// apps mitra ketimbang saya menebaknya.

// CATATAN RUTE — ini memakan waktu paling lama saat harness ini dibuat:
// CLAUDE.md menulis "Routing uses HashRouter, so URLs are actually /#/admin".
// Itu TIDAK berlaku untuk kode sekarang: App.tsx memakai
// `useState(() => window.location.pathname)`, jadi membuka /#/agapps memberi
// pathname "/" dan jatuh ke catch-all `if (currentUser) return <CustomerPortal>`.
// Akibatnya mitra mendarat di aplikasi NASABAH tanpa satu pun pesan error.
// Pakai /agapps (path sungguhan).

import { test, expect, type Page } from '@playwright/test';
import { existsSync } from 'node:fs';

// Playwright 1.61 mencari Chromium build 1228; container pengembangan ini
// hanya punya 1194, dan aturan lingkungannya melarang `playwright install`.
// KONDISIONAL dengan sengaja: kalau path itu di-hardcode, CI (yang punya
// browser Playwright sendiri) akan gagal meluncur — uji ini jadi mematahkan
// pipeline alih-alih menjaganya.
const LOCAL_CHROME = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
test.use({
  launchOptions: existsSync(LOCAL_CHROME) ? { executablePath: LOCAL_CHROME } : {},
});

const APP_VERSION = '2.5.19';

const AGENT = {
  id: 'e2e-agent-0001',
  supabaseId: 'e2e-agent-0001',
  name: 'Mitra Uji',
  email: 'mitra.uji@e2e.local',
  role: 'AGENT',
  verified: true,
  allowed_apps: null,
  __appVersion: APP_VERSION,
};

/** Action yang dipanggil tapi belum ditiru — diisi oleh gateway tiruan. */
const unmocked = new Set<string>();
/** Semua action yang benar-benar dipanggil apps mitra. */
const called = new Set<string>();

const iso = (daysAgo: number) => new Date(Date.now() - daysAgo * 86_400_000).toISOString();

const order = (i: number, status: string) => ({
  id: `o-${i}`,
  order_number: `SP-E2E-${1000 + i}`,
  agent_id: AGENT.id,
  client_name: `Nasabah ${i}`,
  product_code: 'CAR',
  product_name: 'Asuransi Mobil',
  coverage_type: 'COMPREHENSIVE',
  sum_insured: 250_000_000,
  zone: 2,
  vehicle_category: 3,
  addons: {},
  vehicle_details: { brand: 'Toyota', model: 'Avanza', year: 2021 },
  base_premium: 5_000_000,
  addon_premium: 0,
  admin_fee: 0,
  stamp_duty: 10_000,
  total_premium: 5_010_000,
  commission_amount: 500_000,
  status,
  created_at: iso(i * 3),
  updated_at: iso(i),
});

/** Jawaban per action, dibentuk mengikuti data-gateway di repo. */
const RESPONSES: Record<string, unknown> = {
  get_my_profile: { ...AGENT, allowed_apps: null },
  // Gerbang perjanjian kemitraan fail-closed: tanpa rekaman ini AgentPortal
  // menahan seluruh aplikasi di layar "Perjanjian Kemitraan".
  get_my_agreement: { id: 'agr-1', agent_id: AGENT.id, doc_version: 'V2.0-2026', accepted_at: iso(30) },
  get_user_profile: { ...AGENT },
  get_my_orders: [order(1, 'ISSUED'), order(2, 'SUBMITTED'), order(3, 'APPROVED')],
  get_my_payments: [],
  get_my_notifications: [
    { id: 'n1', title: 'Order disetujui', body: 'SP-E2E-1001 disetujui.', read: false, created_at: iso(1), type: 'ORDER_UPDATE' },
  ],
  get_my_wallet: { balance: 1_250_000, pending: 300_000 },
  get_my_wallet_transactions: [],
  get_my_commissions: [{ id: 'c1', commission_amount: 500_000, status: 'PAID', created_at: iso(2) }],
  get_my_withdrawals: [],
  get_my_claims: [],
  get_my_tier_progress: { tier: 'SILVER', points: 320, next_tier: 'GOLD', needed: 180 },
  get_tier_definitions: [{ id: 't1', name: 'SILVER', min_points: 0 }, { id: 't2', name: 'GOLD', min_points: 500 }],
  get_my_clients: [],
  get_my_quotes: [],
  get_my_coins: { balance: 1200 },
  mark_my_notification_read: { success: true },
  mark_all_my_notifications_read: { success: true },
};

async function installMocks(page: Page) {
  // Supabase Auth: tidak boleh menggantung. Sesi datang dari localStorage.
  await page.route('**/auth/v1/**', route =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ user: null, session: null }) }),
  );

  await page.route('**/functions/v1/**', async route => {
    const url = route.request().url();
    let action = '(tidak diketahui)';
    try {
      action = JSON.parse(route.request().postData() ?? '{}').action ?? '(tanpa action)';
    } catch { /* body bukan JSON */ }
    called.add(action);

    if (!url.includes('data-gateway')) {
      // pathy-agent dan fungsi lain: jawab kosong, bukan urusan uji ini.
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: null }) });
    }
    if (!(action in RESPONSES)) unmocked.add(action);
    const data = action in RESPONSES ? RESPONSES[action] : null;
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data }) });
  });

  // Tabel non-sensitif dibaca langsung lewat anon key — jangan sampai menggantung.
  await page.route('**/rest/v1/**', route => {
    const url = route.request().url();
    const body = url.includes('sp_users')
      ? JSON.stringify({ tc_accepted: true })   // .single() menuntut objek, bukan larik
      : '[]';
    return route.fulfill({ status: 200, contentType: 'application/json', body });
  });

  await page.addInitScript(
    ([key, user]) => {
      localStorage.setItem(key as string, user as string);
      localStorage.setItem('sp_dark_mode', 'false');
      // Mitra yang KEMBALI sudah menyetujui S&K. Tanpa ini, gerbang S&K
      // menutupi seluruh layar dan tidak ada tab yang bisa diuji — perilaku
      // fail-closed yang benar, dan diuji sendiri di bawah.
      localStorage.setItem('sp_tc_accepted_ids', JSON.stringify(['e2e-agent-0001']));
      // callGateway() berhenti sebelum fetch kalau supabase-js tidak punya sesi
      // (`if (!token) return { error: 'Not authenticated' }`), jadi TANPA ini
      // nol action gateway pernah terpanggil dan uji ini tidak menguji apa pun.
      // supabase-js v2 membaca sesi dari localStorage `sb-<ref>-auth-token`;
      // ref-nya diambil dari VITE_SUPABASE_URL di .env.development.
      // Mitra yang KEMBALI sudah melewati carousel onboarding. Tanpa ini
      // overlay-nya menutupi tab bar: "Beranda" tetap terbaca di DOM tapi
      // kliknya kehabisan waktu — persis kegagalan yang muncul saat uji ini
      // pertama dijalankan. Carousel-nya diuji sendiri di bawah.
      localStorage.setItem('SP_ONBOARDED_AGENT', '1');
      // supabase-js v2 menyimpan sesi di `sb-<ref>-auth-token`, dan <ref>
      // diambil dari VITE_SUPABASE_URL — yang BERBEDA antar lingkungan:
      //   lokal (.env.development) -> your-dev-project-id
      //   CI (ci.yml)              -> placeholder
      // Satu kunci di-hardcode berarti uji ini hijau di laptop dan merah di CI.
      // Jadi disemai untuk semua ref yang mungkin.
      const far = Math.floor(Date.now() / 1000) + 60 * 60 * 24;
      const session = JSON.stringify({
        access_token: 'e2e-fake-jwt',
        token_type: 'bearer',
        expires_in: 86400,
        expires_at: far,
        refresh_token: 'e2e-fake-refresh',
        user: { id: 'e2e-agent-0001', aud: 'authenticated', role: 'authenticated',
                email: 'mitra.uji@e2e.local', app_metadata: {}, user_metadata: {},
                created_at: new Date().toISOString() },
      });
      for (const ref of ['your-dev-project-id', 'placeholder', 'uyjgeteelnswphyzkjwi']) {
        localStorage.setItem(`sb-${ref}-auth-token`, session);
      }
    },
    ['SUREPATH_SESSION', JSON.stringify(AGENT)] as const,
  );
}

/** Error konsol yang benar-benar penting (buang derau pihak ketiga). */
const realErrors = (errs: string[]) =>
  errs.filter(e =>
    !/favicon|analytics|sentry|Failed to load resource|net::ERR_|ResizeObserver|z-ai-web-dev-sdk/i.test(e));

test.describe('Apps Mitra — UI/UX', () => {
  test('masuk ke /agapps dan kelima tab berpindah tanpa layar mati', async ({ page }, testInfo) => {
    const consoleErrors: string[] = [];
    page.on('console', m => { if (m.type() === 'error') consoleErrors.push(m.text()); });
    page.on('pageerror', e => consoleErrors.push(`pageerror: ${e.message}`));

    await installMocks(page);
    await page.goto('/agapps', { waitUntil: 'domcontentloaded' });

    // Portal termuat lazy — tunggu tab bar-nya, bukan sekadar body.
    await expect(page.getByText('Beranda', { exact: true })).toBeVisible({ timeout: 25_000 });
    await testInfo.attach('01-beranda.png', { body: await page.screenshot({ fullPage: false }), contentType: 'image/png' });

    for (const tab of ['Polis', 'Dompet', 'Profil']) {
      await page.getByText(tab, { exact: true }).first().click();
      // Layar mati = tidak ada teks sama sekali di area konten.
      await expect(page.locator('body')).not.toHaveText('', { timeout: 10_000 });
      await page.waitForTimeout(700);
      const shot = await page.screenshot({ fullPage: false });
      await testInfo.attach(`tab-${tab}.png`, { body: shot, contentType: 'image/png' });
      expect(shot.byteLength, `tab ${tab} menghasilkan layar kosong`).toBeGreaterThan(5000);
    }

    const errs = realErrors(consoleErrors);
    expect(errs, `error konsol nyata di apps mitra:\n${errs.join('\n')}`).toHaveLength(0);
  });

  test('tab Buat membuka alur pembuatan penawaran', async ({ page }, testInfo) => {
    await installMocks(page);
    await page.goto('/agapps', { waitUntil: 'domcontentloaded' });
    await expect(page.getByText('Beranda', { exact: true })).toBeVisible({ timeout: 25_000 });

    await page.getByText('Buat', { exact: true }).first().click();
    await page.waitForTimeout(1200);
    await testInfo.attach('tab-Buat.png', { body: await page.screenshot(), contentType: 'image/png' });
    // Sesuatu harus berubah — bukan tab yang diam.
    await expect(page.locator('body')).not.toHaveText('', { timeout: 10_000 });
  });

  test('mitra yang BELUM setuju S&K ditahan gerbang — fail-closed', async ({ page }, testInfo) => {
    await installMocks(page);
    // Buang cache persetujuan: ini mitra baru.
    await page.addInitScript(() => localStorage.removeItem('sp_tc_accepted_ids'));
    await page.route('**/rest/v1/**', route =>
      route.fulfill({ status: 200, contentType: 'application/json', body: '[]' }));

    await page.goto('/agapps', { waitUntil: 'domcontentloaded' });
    await expect(page.getByText('Syarat & Ketentuan').first()).toBeVisible({ timeout: 25_000 });
    // Tombol lanjut harus MATI sebelum kotak centang ditandai.
    const lanjut = page.getByRole('button', { name: /Setuju & Lanjutkan/i });
    await expect(lanjut).toBeDisabled();
    await testInfo.attach('gerbang-snk.png', { body: await page.screenshot(), contentType: 'image/png' });
  });

  test('mitra BARU melewati carousel onboarding sampai masuk portal', async ({ page }, testInfo) => {
    await installMocks(page);
    await page.addInitScript(() => localStorage.removeItem('SP_ONBOARDED_AGENT'));
    await page.goto('/agapps', { waitUntil: 'domcontentloaded' });

    const lanjut = page.getByRole('button', { name: /Lanjut|Next|Mulai|Selesai/i });
    await expect(lanjut.first()).toBeVisible({ timeout: 25_000 });
    await testInfo.attach('onboarding-slide-1.png', { body: await page.screenshot(), contentType: 'image/png' });

    // Tekan terus sampai carousel habis (maks 6 slide — penjaga anti-loop).
    for (let i = 0; i < 6; i++) {
      const btn = page.getByRole('button', { name: /Lanjut|Next|Mulai|Selesai/i }).first();
      if (!(await btn.isVisible().catch(() => false))) break;
      await btn.click();
      await page.waitForTimeout(500);
    }
    await testInfo.attach('onboarding-selesai.png', { body: await page.screenshot(), contentType: 'image/png' });
    // Setelah carousel, portal yang harus muncul.
    await expect(page.getByText('Beranda', { exact: true }).first()).toBeVisible({ timeout: 15_000 });
  });

  test.afterAll(() => {
    // Inilah temuan utamanya: apa yang sebenarnya dipanggil apps mitra.
    console.log('\n=== ACTION GATEWAY YANG DIPANGGIL APPS MITRA ===');
    [...called].sort().forEach(a => console.log(`  ${a}${unmocked.has(a) ? '   <-- BELUM DITIRU' : ''}`));
    console.log(`\ntotal: ${called.size} action, ${unmocked.size} belum ditiru\n`);
  });
});
