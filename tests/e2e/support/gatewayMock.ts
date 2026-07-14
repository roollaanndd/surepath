// Mocks the Supabase Auth + data-gateway network surface so the app's portals
// can be driven end-to-end without a live Supabase backend.
//
// The whole app talks to Supabase through exactly two URL shapes
// (services/db.ts): `${SUPABASE_URL}/auth/v1/*` for auth, and a single
// `${SUPABASE_URL}/functions/v1/data-gateway` POST endpoint carrying an
// `{ action, params }` body for everything else. Intercepting those two
// shapes with page.route() covers every portal without needing per-screen
// mocks — requests are fulfilled inside the browser and never reach the
// network, so this works even where the real Supabase host is unreachable.
import type { Page } from '@playwright/test';

export const SUPABASE_URL = 'https://uyjgeteelnswphyzkjwi.supabase.co';

export type DemoRole = 'customer' | 'agent' | 'admin' | 'operator';

export interface MockUser {
  id: string;
  email: string;
  role: string;
  name: string;
  agent_code?: string | null;
  allowed_apps?: string[] | null;
}

export const DEMO_USERS: Record<DemoRole, MockUser> = {
  customer: { id: 'e2e-customer-id', email: 'demo.customer@myinsurepath.com', role: 'CUSTOMER', name: 'Demo Customer' },
  agent: { id: 'e2e-agent-id', email: 'demo.agent@myinsurepath.com', role: 'AGENT', name: 'Demo Agent', agent_code: 'SP-DEMOAGENT' },
  admin: { id: 'e2e-admin-id', email: 'demo.admin@myinsurepath.com', role: 'MASTER_ADMIN', name: 'Demo Admin' },
  operator: { id: 'e2e-operator-id', email: 'demo.operator@myinsurepath.com', role: 'OPERATOR', name: 'Demo Operator' },
};

function authTokenResponse(user: MockUser) {
  const now = Math.floor(Date.now() / 1000);
  return {
    access_token: `mock-access-token-${user.role.toLowerCase()}`,
    token_type: 'bearer',
    expires_in: 3600,
    expires_at: now + 3600,
    refresh_token: 'mock-refresh-token',
    user: {
      id: user.id,
      aud: 'authenticated',
      role: 'authenticated',
      email: user.email,
      email_confirmed_at: new Date().toISOString(),
      app_metadata: { provider: 'email', providers: ['email'] },
      user_metadata: { name: user.name },
      created_at: new Date().toISOString(),
    },
  };
}

function profileFor(user: MockUser) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    agent_code: user.agent_code ?? null,
    trust_score: 85,
    allowed_apps: user.allowed_apps ?? null,
  };
}

// Canned shapes for actions whose consumers destructure specific fields
// without defensive fallbacks. Everything else falls through to a generic
// array/object response based on the action name's prefix.
function knownActionResponse(action: string, user: MockUser): { data: unknown } | null {
  switch (action) {
    case 'get_my_profile':
    case 'ensure_profile':
    case 'get_user_profile':
      return { data: profileFor(user) };
    case 'admin_queue_summary':
      return {
        data: {
          pendingOrders: 3, pendingClaims: 1, pendingWithdrawals: 1, pendingAgents: 2,
          unreadNotifications: 4, paidPayments: 20, pendingPayments: 2,
        },
      };
    case 'admin_stats':
      return {
        data: {
          totalOrders: 0,
          ordersByStatus: { SUBMITTED: 0, UNDER_REVIEW: 0, APPROVED: 0, ISSUED: 0, REJECTED: 0 },
          totalPremiumIssued: 0, totalPremiumPaid: 0, activeAgents: 0, pendingCommissions: 0, topAgents: [],
        },
      };
    case 'get_insurer_dashboard':
      return {
        data: {
          insurer: { id: 'e2e-insurer-id', name: 'Demo Insurer', logo_url: null, admin_name: 'Demo Insurer Admin', admin_email: 'insurer@example.com', pic_name: null, pic_email: null, pic_phone: null },
          orders: [],
          kpi: { total: 0, pending: 0, approved: 0, request_info: 0, declined: 0, issued: 0 },
          token_expires_at: new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString(),
        },
      };
    case 'get_leaderboard':
    case 'get_my_orders':
    case 'get_my_claims':
    case 'get_my_notifications':
      return { data: [] };
    case 'get_my_tier_progress':
      return { data: { current_tier: null, next_tier: null, progress_pct: 0 } };
    case 'get_tier_definitions':
      return { data: [] };
    case 'admin_financial_reports':
      return { data: { orders: [], commissions: [], claims: [] } };
    case 'admin_transaksi_overview':
      return { data: { totalCustomers: 0, totalOrders: 0, totalPembayaranMasuk: 0, totalKomisiAgen: 0 } };
    default:
      return null;
  }
}

function fallbackResponse(action: string) {
  if (/^(get_|list_|admin_list_)/.test(action)) return { data: [] };
  return { data: {} };
}

/**
 * Installs route interceptors on `page` that make the app believe it's
 * talking to a real Supabase backend as `role`. Call before navigating.
 */
export async function installGatewayMocks(page: Page, role: DemoRole, overrides?: Partial<MockUser>) {
  const user = { ...DEMO_USERS[role], ...overrides };

  await page.route(`${SUPABASE_URL}/auth/v1/token**`, route =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(authTokenResponse(user)) }));

  await page.route(`${SUPABASE_URL}/auth/v1/user**`, route =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(authTokenResponse(user).user) }));

  await page.route(`${SUPABASE_URL}/functions/v1/data-gateway`, async route => {
    let action = '';
    try {
      action = (route.request().postDataJSON() as { action?: string })?.action ?? '';
    } catch {
      // non-JSON body — fall through to generic empty response
    }
    const body = knownActionResponse(action, user) ?? fallbackResponse(action);
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
  });

  await page.route(`${SUPABASE_URL}/rest/v1/**`, route =>
    route.fulfill({ status: 200, contentType: 'application/json', body: '[]' }));

  // Realtime subscriptions would otherwise try (and fail) to open a
  // websocket to the unreachable host — close it immediately instead of
  // leaving it to retry noisily in the background.
  await page.routeWebSocket(`${SUPABASE_URL}/realtime/**`, ws => ws.close());
}

/** Logs in through the given form (email/password inputs + submit button) using a mocked session. */
export async function loginViaForm(page: Page, role: DemoRole) {
  const user = DEMO_USERS[role];
  await page.locator('input[type="email"]').first().fill(user.email);
  await page.locator('input[type="password"]').first().fill('Demo1234!');
  await page.locator('button[type="submit"]').first().click();
}

/**
 * New customers/agents hit a one-time Terms & Conditions modal
 * (components/TermsModal.tsx) before the portal renders. Accepts it if
 * present; no-ops otherwise.
 */
export async function acceptTermsIfShown(page: Page) {
  const agreeButton = page.getByRole('button', { name: 'Setuju & Lanjutkan' });
  const appeared = await agreeButton
    .waitFor({ state: 'visible', timeout: 8000 })
    .then(() => true)
    .catch(() => false);
  if (!appeared) return;
  await page.getByText('Saya telah membaca dan menyetujui').click();
  await agreeButton.click();

  const continueButton = page.getByRole('button', { name: 'Mulai Gunakan SurePath' });
  await continueButton.waitFor({ state: 'visible', timeout: 10000 }).catch(() => {});
  if (await continueButton.count()) await continueButton.click();
}
