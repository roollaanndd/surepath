# SurePath — Client Handover Guide

This document is the entry point for taking over, deploying, and operating the
SurePath platform. It assumes no prior context.

**Current version: v1.23.0** (2026-07-07). See `docs/CHANGELOG.md` for the full
version history.

---

## 1. What SurePath Is

A full-stack digital insurance (insurtech) platform for the Indonesian market.
As of v1.23.0 the platform is composed of **5 portal apps** plus a public
website and B2B portal:

- **Customer app** (PWA, `/`) — browse products, get OJK-rated quotes, buy
  motor/car insurance, file photo-based claims, manage policies.
- **Agent app** (PWA, `/`) — quote & sell policies, track commissions, manage
  clients and downline network, request wallet withdrawals.
- **Operator app** (PWA, `/operatorapp`, new in v1.18.0) — internal ops staff
  with 5-tab bottom-nav (queue, polis, klaim, withdrawals, profil); manages
  agent verification + realtime notifications; uses the `OPERATOR` role.
- **Insurer app** (PWA, `/insurerapp`, new in v1.21.0) — token-authenticated
  portal for partner insurers; 5-tab bottom-nav (Beranda/Polis/Klaim/Bayar/
  Profil); insurer can approve/reject/request-info on orders, upload policy
  docs, and list payments. No Supabase Auth — auth is via issued bearer tokens
  stored in `sp_insurer_auth_tokens`.
- **Admin CMS** (`/admin`) — approvals, orders, payments, commissions, agents,
  insurers (incl. token + review-link management), product config, website
  editor, audit logs, agent agreements, insurer activity log viewer.
- **Public website** (`/`) — marketing pages, premium calculator, blog.
- **B2B portal** — corporate submissions and quotes.

### Multi-app login (v1.19.0+)

`sp_users.allowed_apps` (array) controls which portal apps a user may enter.
When the field has >1 entry the user lands on `/select-app` to pick after login.
Admins edit the field from User Management. Operators + insurers do NOT use
this mechanism — operators use the `OPERATOR` role, insurers use tokens.

All insurance products are issued by OJK-licensed partner insurers. SurePath is
a technology platform, not an insurer.

---

## 2. Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19 + TypeScript + Vite 6 + TailwindCSS v3 (PWA via vite-plugin-pwa) |
| Backend | Supabase (PostgreSQL + Auth + Storage + Edge Functions/Deno) |
| Payments | Xendit (invoice + disbursement) |
| Hosting | Vercel (production: myinsurepath.com) |
| Error monitoring | Sentry (activates when `VITE_SENTRY_DSN` is set) |

---

## 3. Environment Variables

Copy `.env.example` to `.env` and fill in. Never commit `.env` (already gitignored).

| Variable | Purpose |
|----------|---------|
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon (publishable) key |
| `VITE_SENTRY_DSN` | (optional) Sentry DSN — leave empty to disable |

**Server-side secrets** (set in Supabase → Project Settings → Edge Functions):
`SUPABASE_SERVICE_ROLE_KEY`, `XENDIT_SECRET_KEY`, `OPENROUTER_API_KEY` /
`ANTHROPIC_API_KEY` (AI features). These are never exposed to the client.

---

## 4. Local Development

```bash
npm install
npm run dev        # local dev server
npm run lint       # tsc --noEmit type check
npm run build      # production build
```

CI (`.github/workflows/ci.yml`) runs `lint` + `build` on every PR to `main`.

---

## 5. Deployment

Push to `main` → Vercel auto-deploys to production. The build command and SPA
rewrites are in `vercel.json`. Security headers (CSP, HSTS, X-Frame-Options)
are configured there too.

Edge functions deploy separately via the Supabase CLI or dashboard
(`supabase/functions/*`). The primary function is `data-gateway` — all
sensitive DB access is routed through it using the service-role key. As of
v1.22.0 there is also a scheduled `insurer-reminder-cron` function (every 4h)
that emails insurers with pending review links — see `docs/DEPLOYMENT.md` for
the Supabase Cron schedule + `CRON_SECRET` secret.

### Routes (5 portal apps + auxiliary)

| Route | App | Auth |
|-------|-----|------|
| `/` | Customer app / Agent app / Public website | Supabase Auth (role-resolved from `sp_users`) |
| `/admin` | Admin CMS | Supabase Auth (admin roles) |
| `/operatorapp` | Operator app | Supabase Auth (`OPERATOR` role, v1.18.0+) |
| `/insurerapp` | Insurer app | Bearer token (`sp_insurer_auth_tokens`, v1.21.0+) |
| `/select-app` | Multi-app selector | Supabase Auth (shown when `allowed_apps` has >1 entry, v1.19.0+) |
| `/review/:uuid` | Insurer single-order review page | Review token (`sp_review_tokens`, 7-day expiry, v1.20.0+) |
| `/b2b` | B2B portal | Google OAuth |

---

## 6. Architecture Highlights

- **5 portal apps, 3 auth models** — Customer / Agent / Admin CMS / Operator
  use Supabase Auth (JWT verified by the gateway + role resolved from
  `sp_users.role`); the Insurer app uses **token-based auth** (bearer token in
  `sp_insurer_auth_tokens`, no Supabase Auth); the public insurer review page
  (`/review/:uuid`) uses a **single-use review token** in `sp_review_tokens`
  (7-day expiry).
- **Gateway pattern**: The client never holds the service-role key. Sensitive
  tables (`sp_policy_orders`, `sp_payments`, `sp_claims`, etc.) have RLS enabled
  with **no public policies** — they are deny-by-default and only reachable
  through the `data-gateway` edge function, which authenticates the caller and
  enforces ownership/role checks. This is intentional, not a misconfiguration.
- **OJK rate engine**: `services/ojkRates.ts` is the single source of truth for
  premium rates (SEOJK No. 6/SEOJK.05/2017). `constants.ts` derives from it.
- **Agent legal gate**: New agents must accept the agency agreement
  (`sp_agent_agreements`, immutable, e-signed with name + KTP) before app access.
- **Rate limiting** (v1.23.0+) — IP-based (60 req/hr) and insurer-token-based
  (200 req/hr) limits enforced at the gateway via `sp_rate_limits` + the
  `increment_rate_limit()` RPC. Exceeding the limit returns HTTP 429.
- **Activity logging** (v1.23.0+) — every insurer action (login, decision,
  payment, policy upload) is appended to `sp_insurer_activity_log` for audit.
- **Supabase Realtime** (v1.21.0+) — operator + insurer apps subscribe to
  Postgres changes on `sp_admin_notifications` / `sp_insurer_activity_log` for
  live UI updates without polling.

See `docs/ARCHITECTURE.md`, `docs/DATA_GATEWAY.md`, and `docs/DATABASE_STATE.md`
for details.

---

## 7. Security Posture

See `docs/SECURITY_POLICY.md` for the full policy. Summary of the last audit:

- No secrets committed to the repository (`.env` gitignored; only `.env.example`).
- Client build ships no service-role keys; all privileged access via edge functions.
- `is_admin()` hardened: fixed `search_path`, `EXECUTE` revoked from `anon`.
- CSP, HSTS, and anti-clickjacking headers enforced via `vercel.json`.
- Agent agreements are immutable (no UPDATE/DELETE RLS policies).
- **Recommended manual step**: enable Supabase Auth "Leaked Password Protection"
  (HaveIBeenPwned) in the dashboard — it is not enabled by default.

---

## 8. Documentation Index

| Doc | Contents |
|-----|----------|
| `README.md` | Project overview & feature list |
| `docs/ARCHITECTURE.md` | System architecture |
| `docs/DATA_GATEWAY.md` | Edge function API reference |
| `docs/DATABASE_STATE.md` | Schema & RLS reference |
| `docs/AUTH_FLOW.md` | Authentication flows |
| `docs/DEPLOYMENT.md` | Deploy runbook |
| `docs/SECURITY_POLICY.md` | Security policy & controls |
| `docs/DESIGN_SYSTEM.md` | UI tokens & components |
| `docs/CHANGELOG.md` | Version history |

---

## 9. Demo Accounts (staging)

| Role | Email | Password |
|------|-------|----------|
| Customer | [hubungi admin] | [REDACTED — hubungi admin untuk kredensial] |
| Agent | [hubungi admin] | [REDACTED — hubungi admin untuk kredensial] |
| Admin | [hubungi admin] | [REDACTED — hubungi admin untuk kredensial] |

Rotate or remove these before/after go-live.
