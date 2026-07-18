// k6-100-users.js — SurePath load test: 100 new users signing up and using
// the app (customer onboarding + browse flow), against a REAL environment.
//
// WHY THIS FILE EXISTS
// The Claude Code sandbox that authored this test cannot reach
// myinsurepath.com or *.supabase.co (egress policy) — it produced this
// script but never executed it end-to-end. Run it yourself against a real
// target before trusting the numbers.
//
// WHAT IT DOES, PER VIRTUAL USER (VU)
//   1. GET  /                                (homepage — static asset weight)
//   2. POST /auth/v1/signup                  (Supabase Auth — creates a REAL
//                                              auth.users row)
//   3. POST /functions/v1/data-gateway        action=ensure_profile
//                                             (creates the matching sp_users row)
//   4. POST /functions/v1/data-gateway        action=get_my_profile
//   5. POST /functions/v1/data-gateway        action=get_active_ojk_rate_set-ish
//                                             browse: GET /products, /kalkulator
//
// ⚠️ THIS CREATES REAL DATA if pointed at production. Run docs/LOAD_TESTING.md's
// cleanup SQL afterward, or point BASE_URL/SUPABASE_URL at a staging project.
//
// ⚠️ RATE LIMITING IS EXPECTED, NOT A BUG. data-gateway enforces 60 req/hour
// per IP (see docs/DATA_GATEWAY.md). Running 100 VUs from one test machine
// (one IP) WILL start getting HTTP 429 well before 100 completions — that is
// the security control working as designed. Real users each have their own
// IP, so this ceiling does not apply to organic traffic. To load-test past
// it intentionally, run from multiple source IPs/regions or temporarily
// raise the limit in a non-production project.
//
// USAGE
//   k6 run \
//     -e BASE_URL=https://myinsurepath.com \
//     -e SUPABASE_URL=https://uyjgeteelnswphyzkjwi.supabase.co \
//     -e SUPABASE_ANON_KEY=<anon key, safe to embed — it is public> \
//     tests/load/k6-100-users.js
//
// Override VUS / duration for a smaller smoke test:
//   k6 run -e VUS=10 -e DURATION=30s ...

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Counter, Trend } from 'k6/metrics';

const BASE_URL = __ENV.BASE_URL || 'https://myinsurepath.com';
const SUPABASE_URL = __ENV.SUPABASE_URL || 'https://uyjgeteelnswphyzkjwi.supabase.co';
const SUPABASE_ANON_KEY = __ENV.SUPABASE_ANON_KEY || '';
const VUS = Number(__ENV.VUS || 100);
const DURATION = __ENV.DURATION || '2m';
const RUN_ID = __ENV.RUN_ID || `${Date.now()}`;

if (!SUPABASE_ANON_KEY) {
  throw new Error('SUPABASE_ANON_KEY is required — pass -e SUPABASE_ANON_KEY=<anon key> (it is the public anon key, safe to pass on the CLI).');
}

const rateLimited = new Counter('rate_limited_429');
const signupFailures = new Counter('signup_failures');
const gatewayTrend = new Trend('gateway_action_duration', true);

export const options = {
  scenarios: {
    signup_and_browse: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '20s', target: VUS },   // ramp up — mimics a traffic spike, not an instant burst
        { duration: DURATION, target: VUS }, // hold at full load
        { duration: '15s', target: 0 },      // ramp down
      ],
    },
  },
  thresholds: {
    // Static/marketing pages must stay fast even under load.
    'http_req_duration{name:homepage}': ['p(95)<2000'],
    // Explicit failures (5xx, network errors) — 429s are tracked separately
    // and are NOT failures (see rate-limit note above).
    'http_req_failed': ['rate<0.05'],
  },
};

function authHeaders(token) {
  const h = { 'Content-Type': 'application/json', apikey: SUPABASE_ANON_KEY };
  if (token) h.Authorization = `Bearer ${token}`;
  return h;
}

export default function () {
  const vuTag = `${RUN_ID}_${__VU}_${__ITER}`;
  const email = `loadtest_k6_${vuTag}@loadtest.invalid`;
  const password = `LoadTest!${vuTag}Aa1`;

  group('homepage', () => {
    const res = http.get(`${BASE_URL}/`, { tags: { name: 'homepage' } });
    check(res, { 'homepage 200': (r) => r.status === 200 });
  });

  sleep(Math.random() * 1.5); // a human reads the page before signing up

  let accessToken = null;
  group('signup', () => {
    const res = http.post(
      `${SUPABASE_URL}/auth/v1/signup`,
      JSON.stringify({ email, password, data: { name: `K6 Load Test ${vuTag}` } }),
      { headers: authHeaders(), tags: { name: 'auth_signup' } },
    );
    const ok = check(res, { 'signup 200': (r) => r.status === 200 });
    if (res.status === 429) rateLimited.add(1);
    if (!ok && res.status !== 429) signupFailures.add(1);
    try {
      const body = res.json();
      accessToken = body?.access_token || null;
    } catch { /* non-JSON error body */ }
  });

  if (accessToken) {
    sleep(Math.random());

    group('ensure_profile', () => {
      const res = http.post(
        `${SUPABASE_URL}/functions/v1/data-gateway`,
        JSON.stringify({ action: 'ensure_profile', params: { role: 'CUSTOMER', name: `K6 Load Test ${vuTag}` } }),
        { headers: authHeaders(accessToken), tags: { name: 'gateway_ensure_profile' } },
      );
      gatewayTrend.add(res.timings.duration);
      if (res.status === 429) rateLimited.add(1);
      check(res, { 'ensure_profile ok or rate-limited': (r) => r.status === 200 || r.status === 429 });
    });

    sleep(Math.random() * 2);

    group('get_my_profile', () => {
      const res = http.post(
        `${SUPABASE_URL}/functions/v1/data-gateway`,
        JSON.stringify({ action: 'get_my_profile' }),
        { headers: authHeaders(accessToken), tags: { name: 'gateway_get_my_profile' } },
      );
      gatewayTrend.add(res.timings.duration);
      if (res.status === 429) rateLimited.add(1);
      check(res, { 'get_my_profile ok or rate-limited': (r) => r.status === 200 || r.status === 429 });
    });
  }

  sleep(Math.random() * 1.5);

  group('browse_products', () => {
    const res = http.get(`${BASE_URL}/products`, { tags: { name: 'products_page' } });
    check(res, { 'products 200': (r) => r.status === 200 });
  });

  sleep(1 + Math.random() * 2);
}

export function handleSummary(data) {
  const rl = data.metrics.rate_limited_429?.values?.count ?? 0;
  const sf = data.metrics.signup_failures?.values?.count ?? 0;
  const total = data.metrics.iterations?.values?.count ?? 0;
  console.log(`\n=== SurePath 100-user load test summary ===`);
  console.log(`Iterations completed: ${total}`);
  console.log(`Rate-limited (429, expected — see file header): ${rl}`);
  console.log(`Unexpected signup failures: ${sf}`);
  console.log(`Test accounts use email pattern: loadtest_k6_${RUN_ID}_*@loadtest.invalid`);
  console.log(`Run the cleanup query in docs/LOAD_TESTING.md to remove them.\n`);
  return { stdout: JSON.stringify(data, null, 2) };
}
