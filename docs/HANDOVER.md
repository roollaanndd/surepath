# SurePath — Client Handover Guide

This document is the entry point for taking over, deploying, and operating the
SurePath platform. It assumes no prior context.

---

## 1. What SurePath Is

A full-stack digital insurance (insurtech) platform for the Indonesian market:

- **Customer app** (PWA) — browse products, get OJK-rated quotes, buy motor/car
  insurance, file photo-based claims, manage policies.
- **Agent app** (PWA) — quote & sell policies, track commissions, manage clients
  and downline network, request wallet withdrawals.
- **Admin CMS** — approvals, orders, payments, commissions, agents, insurers,
  product config, website editor, audit logs, agent agreements.
- **Public website** — marketing pages, premium calculator, blog.
- **B2B portal** — corporate submissions and quotes.

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
sensitive DB access is routed through it using the service-role key.

---

## 6. Architecture Highlights

- **Gateway pattern**: The client never holds the service-role key. Sensitive
  tables (`sp_policy_orders`, `sp_payments`, `sp_claims`, etc.) have RLS enabled
  with **no public policies** — they are deny-by-default and only reachable
  through the `data-gateway` edge function, which authenticates the caller and
  enforces ownership/role checks. This is intentional, not a misconfiguration.
- **OJK rate engine**: `services/ojkRates.ts` is the single source of truth for
  premium rates (SEOJK No. 6/SEOJK.05/2017). `constants.ts` derives from it.
- **Agent legal gate**: New agents must accept the agency agreement
  (`sp_agent_agreements`, immutable, e-signed with name + KTP) before app access.

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
| Customer | demo.customer@myinsurepath.com | Demo1234! |
| Agent | demo.agent@myinsurepath.com | Demo1234! |
| Admin | demo.admin@myinsurepath.com | Demo1234! |

Rotate or remove these before/after go-live.
