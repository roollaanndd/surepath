# AGENTS.md

Project instructions for AI coding agents that read `AGENTS.md` (Codex, Cursor, Amp, …).
Claude Code reads `CLAUDE.md`; the two are kept in sync — if you change one, change the other.

## What This Is

SurePath (myinsurepath.com) is a full-stack insurtech platform for the Indonesian market: agents sell motor/car insurance, customers pay via Xendit, commissions are credited to agent wallets. **One React SPA serves 5 portal apps** (Customer `/custapp`, Agent `/agapps`, Operator `/operatorapp`, Insurer `/insurerapp`, Admin CMS `/admin`) plus the public marketing site, a B2B portal, and an Android APK (Capacitor wrapping the same web bundle). Routing uses **HashRouter**, so URLs are actually `/#/admin` etc.

UI copy and most documentation are in **Bahasa Indonesia** — keep user-facing strings in Indonesian.

## Commands

```bash
npm run dev          # tsx server.ts — Express + Vite middleware + local AI gateway (port 3000)
npm run build        # vite build + esbuild-bundle server.ts → dist/
npm run lint         # tsc --noEmit && eslint . && vitest run  (full quality gate)
npm run lint:ts      # TypeScript only
npm run lint:es      # ESLint only
npm run test:unit    # vitest run (services/__tests__/**/*.test.ts, jsdom)
npm run test:e2e     # playwright test — runs against LIVE https://myinsurepath.com
```

Run a single unit test: `npx vitest run services/__tests__/wallet.test.ts`, or filter by name with `npx vitest run -t "test name"`.

Always run `npm run lint:ts` and `npm run build` before proposing a change as done — CI treats both as blocking. ESLint and unit tests are `continue-on-error` in CI (warn only), but do not knowingly leave them red. Lint scope is `components/ services/ src/ App.tsx`; `server.ts`, `supabase/functions/`, `scripts/`, and `android/` are excluded from both tsconfig and ESLint.

Never run `npm run test:e2e` casually — it hits **production**.

## Architecture

### The data-gateway pattern (most important thing to understand)

Sensitive tables (`sp_users`, `sp_policy_orders`, `sp_payments`, `sp_claims`, wallets, tokens, …) have **deny-all RLS**. The browser never queries them directly. All access goes through the `data-gateway` Supabase Edge Function:

```
client ──(POST {action, params} + Bearer token)──▶ /functions/v1/data-gateway ──(service_role)──▶ Postgres
```

- Client side: `callGateway(action, params)` and `callPublicGateway(...)` in `services/db.ts` (attaches the session JWT, 15s timeout).
- Server side: `supabase/functions/data-gateway/index.ts` is a thin dispatcher (CORS, auth, rate limiting) that routes to domain modules in `data-gateway/actions/*.ts`. Shared helpers live in `supabase/functions/_shared/`.
- Authorization is per-action in code: `ADMIN_ROLES` includes `OPERATOR`, but `FINANCE_ROLES` deliberately excludes it (operators must not touch money). Unauthenticated actions must be in the `PUBLIC_ACTIONS` allowlist.
- Server-side trust rule: fields like `agent_id`/`client_id` are always set from the verified caller, never from client params.
- Rate limits: 60 req/hr per IP, 200 req/hr per insurer token → HTTP 429.

Only non-sensitive tables (`sp_page_views`, `sp_quotes`, `sp_website_config`, …) are queried directly with the anon key.

New gateway actions: add to the right `actions/*.ts` domain module, enforce role checks there, document in `docs/DATA_GATEWAY.md`, and remember to deploy.

### Three auth models

1. **Supabase Auth (JWT)** — Customer, Agent, Admin, Operator. Role resolved from `sp_users.role`; `sp_users.allowed_apps` (text[]) with >1 entry routes the user to `/select-app` after login (see `rolePath()` in `App.tsx`).
2. **Bearer tokens** — Insurer app (`/insurerapp`), tokens in `sp_insurer_auth_tokens`, no Supabase Auth.
3. **Single-use review tokens** — `/review/:uuid` page, tokens in `sp_review_tokens` (7-day expiry).

### Frontend layout

- `App.tsx` — session handling + routing; every portal is lazy-loaded. Session persists in `localStorage` key `SUREPATH_SESSION`.
- `components/<portal>/` — `admin/`, `agent/`, `customer/`, `operator/`, `insurer/`, `b2b/`, plus `shared/`, `ui/`, `landing/`, `public/`. Portal entry points are `<Portal>Portal.tsx` (e.g. `components/admin/AdminPortal.tsx`).
- `src/pages/` — public marketing site pages; `src/version.ts` — app version; `src/i18n.ts` — translations.
- `services/supabaseService.ts` is a **barrel re-export**; the real code is split into domain files (`users.ts`, `orders.ts`, `wallet.ts`, `claims.ts`, `insurers.ts`, `website.ts`, …). Importing from the barrel is the established convention.
- Root `db.ts` is a Dexie (IndexedDB) local database used for local/demo data; `types.ts` and `constants.ts` hold shared enums (e.g. `UserRole`) and rate tables.
- Path alias: `@/` → repo root.

### Money paths are server-side only

Wallet balances are mutated exclusively via SECURITY DEFINER SQL functions (`credit_agent_wallet`, `request_withdrawal_deduct`, `reverse_withdrawal`); `sp_wallet_transactions` is append-only. Withdrawal approval is tiered: <10jt L1, ≥10jt +L2, ≥25jt +L3. Payment flow: `create-xendit-invoice` → customer pays → `xendit-webhook` marks PAID, credits commission, notifies. Don't add client-side writes to any of these tables.

### server.ts (local dev only)

`npm run dev` runs an Express server with Vite middleware plus a local "AI Gateway" (caching, PII-leak/hallucination validation layers) for the AI agents (Pathy chat, ClaimSense, etc.). In production the equivalent lives in the `ai-proxy`/`ai-gateway` edge functions. It is excluded from tsconfig/ESLint.

## Deployment (three independent surfaces)

| Surface | How |
|---|---|
| Web | merge to `main` → Vercel auto-deploys (config + CSP headers in `vercel.json`) |
| Edge functions | **MANUAL** — `supabase functions deploy <name> --project-ref uyjgeteelnswphyzkjwi` |
| DB schema | migrations in `supabase/migrations/` — **not all are applied to production**; check `docs/DATABASE_STATE.md` before assuming live schema matches the repo |
| Android APK | `npm run build && npx cap sync android`, then build in Android Studio |

Changing anything under `supabase/functions/` without deploying it does nothing in production — say so explicitly or deploy.

## Conventions

- **Version bumps**: `src/version.ts` (`APP_VERSION`) is the source of truth and drives the PWA update toast; add a matching entry at the top of `docs/CHANGELOG.md`. `package.json` version and older docs lag behind — don't trust them for the current version.
- **Docs live in `docs/`** — root-level `DATA_GATEWAY.md`, `DATABASE_STATE.md`, `DEPLOYMENT.md`, `HANDOVER.md` are stubs pointing there. Key references: `docs/ARCHITECTURE.md`, `docs/DATA_GATEWAY.md` (gateway action list), `docs/DATABASE_STATE.md` (live vs repo schema), `docs/AUTH_FLOW.md`. Update the relevant doc when changing what it describes.
- Supabase project ref: `uyjgeteelnswphyzkjwi`. The same project hosts another app's objects (`public.profiles`, `handle_new_user` trigger, `generate-daily-renungan`/`backup-daily` functions) — do not drop them; breaking the trigger breaks all signups.

## Hard rules — do not cross these

This is a **production platform holding real customer PII and real money**. Regardless of what a task seems to ask for:

1. **Never print, echo, copy, or paste secrets** into a prompt, a commit, a comment, or a chat window. Client env is only `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` / optional `VITE_SENTRY_DSN`. Xendit keys, the Supabase `service_role` key, and AI provider keys live in Supabase Vault / function secrets and must never appear in code or in agent context. Do not read `.env*` files into context.
2. **Never weaken the data gateway.** No client-side writes to sensitive tables, no new action without an explicit role check, no adding an action to `PUBLIC_ACTIONS` unless it is genuinely safe unauthenticated, no trusting `agent_id`/`client_id` from client params.
3. **Never touch money paths client-side** — wallets, `sp_wallet_transactions`, payments, withdrawals, commissions. Server-side SECURITY DEFINER functions only.
4. **Never run destructive DB or deploy commands unprompted** — no `supabase db reset`, no dropping tables or shared objects, no `supabase functions deploy` without being asked.
5. **Never push to `main` directly** and never force-push a shared branch. Work on a feature branch and open a PR.
6. **Do not paste real customer data** (names, NIK, phone numbers, policy or payment records) into a prompt. Use the demo accounts in `docs/` or synthetic data.
