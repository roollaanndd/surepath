# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

SurePath (myinsurepath.com) is a full-stack insurtech platform for the Indonesian market: agents sell motor/car insurance, customers pay via Xendit, commissions are credited to agent wallets. **One React SPA serves 5 portal apps** (Customer `/custapp`, Agent `/agapps`, Operator `/operatorapp`, Insurer `/insurerapp`, Admin CMS `/admin`) plus the public marketing site, a B2B portal, and an Android APK (Capacitor wrapping the same web bundle). Routing is **hand-rolled on the History API**, not a router library: `currentPath` is seeded from `window.location.pathname`, `navigate()` calls `history.pushState`, and a `popstate` listener keeps them in sync (`App.tsx`). URLs are plain paths — `/admin`, `/agapps` — and `vercel.json` rewrites everything to `index.html` so deep links resolve.

> **There is no router library.** Routing is the hand-rolled History API code described above, and nothing else. `index.tsx` used to wrap `<App />` in a `<HashRouter>` whose API no file ever touched — no `Route`, no `Link`, no hook — so `react-router-dom` shipped in the main entry chunk for nothing; it was removed in v2.6.14 and the package is gone from `package.json`. This file previously claimed URLs like `/#/admin`, which is wrong and fails silently: `/#/agapps` leaves `pathname` at `/`, misses every route branch, and lands on the `if (currentUser)` catch-all — rendering the **Customer** portal to an agent with no error at all. Verified end-to-end in `tests/agentApp.spec.ts`.

UI copy and most documentation are in **Bahasa Indonesia** — keep user-facing strings in Indonesian.

## Commands

```bash
npm run dev          # tsx server.ts — Express + Vite middleware + local AI gateway (port 3000)
npm run build        # vite build + esbuild-bundle server.ts → dist/
npm run lint         # tsc --noEmit && eslint . && vitest run  (full quality gate)
npm run lint:ts      # TypeScript only
npm run lint:es      # ESLint only
npm run test:unit    # vitest run (services/__tests__/**/*.test.ts, jsdom)
npm run test:watch   # vitest watch mode
npm run test:e2e     # playwright test — local by default (boots `npm run dev` on 127.0.0.1:3000)
```

Run a single unit test: `npx vitest run services/__tests__/wallet.test.ts` or filter by name with `npx vitest run -t "test name"`.

CI (`.github/workflows/ci.yml`): `tsc --noEmit --skipLibCheck` and `npm run build` are **blocking**; ESLint and unit tests are `continue-on-error` (warn only). Lint scope is `components/ services/ src/ App.tsx` — `server.ts`, `supabase/functions/`, `scripts/`, and `android/` are excluded from both tsconfig and ESLint.

Optional pre-commit hook: `ln -sf ../../scripts/pre-commit.sh .git/hooks/pre-commit`.

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

`npm run dev` runs an Express server with Vite middleware plus a local "AI Gateway" (caching, PII-leak/hallucination validation layers) for the AI agents (ClaimSense, etc.). Its `/api/ai-gateway` route exists **only in dev** — `vercel.json` excludes `api/` from the SPA rewrite and there is no `api/` directory, so in production that path is always a 404; `services/aiGateway.ts` therefore only tries it when `import.meta.env.DEV`. In production the equivalent lives in the `ai-proxy` edge function. It is excluded from tsconfig/ESLint.

**Pathy** does not go through either of those: it runs on its own `pathy-agent` edge function — a tool-calling assistant that reads the caller's own policies/claims/quotes, prices motor premiums off the active OJK rate set, and can save a draft quote. See `docs/PATHY_AGENT.md`. Its rate tables in `supabase/functions/_shared/ojk.ts` mirror `services/ojkRates.ts`; change one and you must change the other (`services/__tests__/pathy.test.ts` asserts parity).

## Deployment (three independent surfaces)

| Surface | How |
|---|---|
| Web | merge to `main` → Vercel auto-deploys (config + CSP headers in `vercel.json`) |
| Edge functions | **MANUAL** — `supabase functions deploy <name> --project-ref uyjgeteelnswphyzkjwi` (or Supabase MCP `deploy_edge_function`). Vercel does NOT deploy these. |
| DB schema | migrations in `supabase/migrations/` — **not all are applied to production**; check `docs/DATABASE_STATE.md` before assuming live schema matches the repo |
| Android APK | `npm run build && npx cap sync android`, then build in Android Studio |

Changing anything under `supabase/functions/` without deploying it does nothing in production — say so explicitly or deploy.

## Conventions

- **Version bumps**: `src/version.ts` (`APP_VERSION`) is the source of truth and drives the PWA update toast; add a matching entry at the top of `docs/CHANGELOG.md`. `package.json` version and older docs lag behind — don't trust them for the current version. The `1.x` series ended at v1.57.0; numbering continues from **2.1.0** (owner's decision, 2026-09-07).
- **Docs live in `docs/`** — root-level `DATA_GATEWAY.md`, `DATABASE_STATE.md`, `DEPLOYMENT.md`, `HANDOVER.md` are stubs pointing there. Key references: `docs/ARCHITECTURE.md`, `docs/DATA_GATEWAY.md` (gateway action list), `docs/DATABASE_STATE.md` (live vs repo schema), `docs/AUTH_FLOW.md`. Update the relevant doc when changing what it describes.
- **`.memory/CONTEXT.md`** is printed by the SessionStart hook as session context — refresh it after significant sessions (current state, what was done, backlog).
- New gateway actions: add to the right `actions/*.ts` domain module, enforce role checks there, document in `docs/DATA_GATEWAY.md`, and remember to deploy.
- Supabase project ref: `uyjgeteelnswphyzkjwi`. The same project hosts another app's objects (`public.profiles`, `handle_new_user` trigger, `generate-daily-renungan`/`backup-daily` functions) — do not drop them; breaking the trigger breaks all signups.
- Secrets: client env is only `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` / optional `VITE_SENTRY_DSN`; Xendit and AI keys live in Supabase Vault/function secrets, never in code.
