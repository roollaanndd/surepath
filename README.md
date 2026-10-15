# SurePath — Insurtech Mobile Platform

**Current version: v1.23.0** (2026-07-07). See `docs/CHANGELOG.md` for full history.

SurePath is a full-stack insurtech platform for Indonesian markets. Agents sell motor/car insurance to customers, premiums are collected via Xendit, and commissions are credited to agent wallets and disbursed on request. As of v1.23.0 the platform spans **5 portal apps** (Customer / Agent / Operator / Insurer / Admin CMS) plus a public website and B2B portal.

---

## Stack

| Layer | Technology |
|---|---|
| Frontend | React 19 + TypeScript, Vite 6, TailwindCSS, VitePWA |
| Backend | Supabase (Postgres + Edge Functions on Deno + Realtime, since v1.21) |
| Payments | Xendit (Invoice + Disbursement APIs) |
| Auth | Supabase Auth (Google OAuth, Email OTP) for Customer/Agent/Admin/Operator; bearer-token auth for Insurer app; single-use review tokens for `/review/:uuid` |
| Deploy | Vercel (frontend) + Supabase (functions + DB) |
| Notifications | Telegram bot, Supabase `sp_notifications`, Supabase Realtime channels (operator + insurer apps) |
| Rate limiting + audit | `sp_rate_limits` + `sp_insurer_activity_log` (v1.23.0) |

---

## Key Features

### For Agents
- Car & motorcycle insurance quoting wizard with OJK-compliant rate tables
- AI visual audit of vehicle photos (damage scoring)
- Client management (prospects → policies)
- Real-time commission wallet — balance credited automatically on payment confirmation
- Withdrawal requests to any Indonesian bank with multi-level approval
- Coin rewards per policy sold

### For Customers
- Insurance purchase flow with Xendit invoice payment (VA, e-wallet, QRIS, credit card)
- Claim submission with photo uploads
- Policy status tracking with order detail sheet
- Order cancellation (SUBMITTED/UNDER_REVIEW orders)
- Accessibility font scale (0.85×–1.25×) + manual dark/light mode
- PWA installable — update notification toast on new version

### For Admins
- Policy order queue — review, approve, issue, reject (accessible to ADMIN + INSURANCE_ADMIN + MASTER_ADMIN)
- Xendit payment ledger (PAID / PENDING / EXPIRED)
- Agent commission ledger
- Agent withdrawal queue with tiered approval
- Financial reports (GWP, commissions, claims)
- AI policy review and AI finance review agents
- User / agent management with live refresh
- Telegram alerts on new orders, payments, claims
- Dashboard stats auto-refresh every 2 minutes + manual refresh button
- Admin-managed promo banner (headline, image, visibility toggle)
- Role-based menu permissions configurable per role (MASTER_ADMIN only)
- **Insurer CMS** (v1.21+) — manage insurers, generate/revoke auth tokens, send/resend review links, view insurer activity log, edit per-insurer API config (`sp_insurer_api_configs`)

### Operator App (v1.18.0+, `/operatorapp`)
- Dedicated 5-tab bottom-nav PWA for internal ops staff (Antrean / Polis / Klaim / Penarikan / Profil)
- `OPERATOR` role with scoped gateway actions (`admin_queue_summary`, `admin_verify_agent`, `admin_mark_all_notifications_read`, …)
- Agent verification queue — review KTP + agreement, approve newly-registered agents before they can sell
- Realtime notifications via Supabase Realtime subscription to `sp_admin_notifications`
- Polis detail bottom-sheet with inline document viewer (image + PDF)

### Insurer App + Review Flow (v1.20.0 → v1.23.0)
- **Token-based insurer portal** (`/insurerapp`, v1.21.0) — 5-tab bottom-nav: Beranda (dashboard), Polis (review queue), Klaim, Bayar (payments), Profil; auth via bearer tokens in `sp_insurer_auth_tokens` (no Supabase Auth)
- **Single-order review page** (`/review/:uuid`, v1.20.0) — operator approves → email sent → insurer lands on a token-gated page with 3 decisions (Approve / Reject / Request Info); decision persisted to `sp_policy_orders`
- **Reminder cron** (v1.22.0) — `insurer-reminder-cron` edge function runs every 4h via Supabase Cron, emailing insurers with pending review links (`reminder_count` + `last_reminded_at` tracked on `sp_review_tokens` to avoid spamming)
- **Activity logging** (v1.23.0) — every insurer action appended to `sp_insurer_activity_log` for full audit trail
- **API config management** (v1.23.0) — admins store per-insurer integration credentials (endpoint, key, headers) in `sp_insurer_api_configs`

### Multi-App Login (v1.19.0+)
- `sp_users.allowed_apps` (text array) controls which portal apps a user may enter; when >1 entry, the user lands on `/select-app` to pick after login
- Editable from User Management in Admin CMS

### Rate Limiting & Security (v1.22.0 → v1.23.0)
- IP-based rate limiting at the gateway (60 req/hr) + insurer-token-based limit (200 req/hr) — tracked in `sp_rate_limits` via the `increment_rate_limit()` RPC; over-limit returns HTTP 429
- `is_operator()` + `is_staff()` SECURITY DEFINER helpers hardened (search_path fixed, EXECUTE revoked from anon)
- Security audit pass covering all new token-based endpoints (expiry + revocation + scope checks)

---

## Payment Flow

```
Agent submits order
    ↓
Admin creates Xendit invoice  (create-xendit-invoice edge fn)
    ↓
Customer pays via Xendit (VA / e-wallet / QRIS / CC)
    ↓
Xendit fires webhook  (xendit-webhook edge fn)
    ↓
sp_payments.status → PAID
sp_policy_orders.status → UNDER_REVIEW
Agent wallet credited with commission_amount  (credit_agent_wallet SQL fn)
Admin + agent notified
    ↓
Admin reviews & issues policy
```

### Premium Components

| Item | Amount |
|---|---|
| Base premium | OJK rate × sum insured |
| Add-ons | Flood, earthquake, SRCC, TPL, PA, authorized workshop |
| Admin / policy fee | Per insurer product config |
| Stamp duty | Rp 10,000 |
| **Application fee** | **Rp 5,000** (every transaction, goes to SurePath) |

---

## Agent Wallet

Every agent has one `sp_agent_wallets` row. Balance is credited server-side only — no client can write to it directly.

```
Payment PAID
    → credit_agent_wallet(agent_id, commission_amount)   [SECURITY DEFINER]
    → sp_agent_wallets.balance += commission_amount
    → sp_wallet_transactions INSERT (immutable ledger)
```

### Withdrawal Approval Tiers

| Amount | Approvals required | Notes |
|---|---|---|
| < Rp 10,000,000 | L1 — Finance / Admin | |
| Rp 10,000,000 – 24,999,999 | L1 + L2 — Finance Manager | |
| ≥ Rp 25,000,000 | L1 + L2 + L3 — Finance Director | +24-hour disbursement delay |

**On withdrawal request:**
- Balance deducted **instantly and atomically** via `request_withdrawal_deduct()` SQL function
- If rejected at any level → `reverse_withdrawal()` returns funds to wallet immediately
- If Xendit disbursement API fails → `reverse_withdrawal()` called automatically

**Xendit disbursement fee:** Rp 5,000 per transfer, borne by agent (shown before confirming).

---

## Admin Roles

| Role | Access |
|---|---|
| `MASTER_ADMIN` | Everything |
| `ADMIN` | Orders, users, agents, commissions, payments, withdrawals |
| `FINANCE` | Reports, transactions, commissions, payments, withdrawals (L1) |
| `FINANCE_MANAGER` | Finance + withdrawal L2 approval |
| `FINANCE_DIRECTOR` | Finance + withdrawal L3 approval |
| `INSURANCE_ADMIN` | Policy order queue, claims queue |

---

## Database Tables (key)

| Table | Purpose |
|---|---|
| `sp_users` | All users (agents, admins, customers) |
| `sp_policy_orders` | Insurance purchase orders |
| `sp_payments` | Xendit invoice records |
| `sp_commissions` | Commission records per order |
| `sp_agent_wallets` | Agent IDR balance |
| `sp_wallet_transactions` | Immutable wallet ledger |
| `sp_withdrawals` | Withdrawal requests + approval chain |
| `sp_claims` | Claim submissions |
| `sp_notifications` | Agent in-app notifications |
| `sp_admin_notifications` | Admin-side notifications |
| `sp_review_tokens` | Insurer review links (7-day expiry) |
| `sp_coin_ledger` | Coin earn/redeem history |

---

## Edge Functions

| Function | Purpose |
|---|---|
| `create-xendit-invoice` | Create Xendit invoice for an order; reads API key from Vault |
| `xendit-webhook` | Handle Xendit payment callbacks; credits wallet on PAID |
| `xendit-disburse` | Trigger Xendit disbursement for an approved withdrawal |
| `ai-policy-review` | AI underwriting recommendation for admin |
| `ai-finance-review` | AI financial health summary |
| `notify-admin` | Telegram notifications via `sp_bot_config` |
| `send-insurer-email` | Sends review-link email to insurer (token in `sp_review_tokens`) |
| `insurer-reminder-cron` | Scheduled (Supabase Cron, every 4h) — emails insurers with pending review links; gated by `CRON_SECRET` (v1.22.0+) |

All edge functions read the Xendit API key from **Supabase Vault** (`get_app_secret('XENDIT_SECRET_KEY')`), never from code.

---

## Environment Variables

### Vercel (set in Dashboard — never commit)

| Variable | Description |
|---|---|
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon key |
| `VITE_ADMIN_KEY` | Admin portal access key |

### Supabase Vault (set via SQL / Dashboard)

| Secret | Description |
|---|---|
| `XENDIT_SECRET_KEY` | Xendit secret API key (`xnd_...`) |

### Supabase `sp_bot_config` table

| Key | Description |
|---|---|
| `bot_token` | Telegram bot token |
| `admin_chat_id` | Telegram chat ID for admin alerts |

---

## Local Development

```bash
npm install
npm run dev          # Vite dev server on :5173
npm run build        # Production build (TypeScript checked)
```

### AI coding agent

Konteks proyek untuk AI coding agent ada di `AGENTS.md` (root repo) — dibaca otomatis oleh agent yang memakai konvensi `AGENTS.md`. Claude Code memakai `CLAUDE.md`. Keduanya harus diubah bersamaan.

---

## Demo Accounts

| Role | Email | Password |
|------|-------|----------|
| Customer | [hubungi admin] | [REDACTED — hubungi admin untuk kredensial] |
| Agent | [hubungi admin] | [REDACTED — hubungi admin untuk kredensial] |
| Admin | [hubungi admin] | [REDACTED — hubungi admin untuk kredensial] |

---

## Security Notes

- Wallet balances can only be mutated by `service_role` via SECURITY DEFINER SQL functions
- `sp_wallet_transactions` is append-only — no UPDATE/DELETE policies exist
- Withdrawals deduct balance atomically at request time, preventing overdraw
- `xendit-disburse` marks PROCESSING before the API call to prevent double-trigger
- Xendit webhook token verified via `x-callback-token` header
- All financial tables have RLS enabled (17 scoped policies)
- Order cancellation ownership enforced server-side via `client_id` match
- Admin portal gated by Supabase Auth — role resolved from `sp_users`
