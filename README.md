# SurePath — Insurtech Mobile Platform

SurePath is a full-stack insurtech platform for Indonesian markets. Agents sell motor/car insurance to customers, premiums are collected via Xendit, and commissions are credited to agent wallets and disbursed on request.

---

## Stack

| Layer | Technology |
|---|---|
| Frontend | React 19 + TypeScript, Vite 6, TailwindCSS, VitePWA |
| Backend | Supabase (Postgres + Edge Functions on Deno) |
| Payments | Xendit (Invoice + Disbursement APIs) |
| Auth | Supabase Auth — Google OAuth, Email OTP |
| Deploy | Vercel (frontend) + Supabase (functions + DB) |
| Notifications | Telegram bot, Supabase `sp_notifications` |

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

---

## Demo Accounts

| Role | Email | Password |
|------|-------|----------|
| Customer | demo.customer@myinsurepath.com | Demo1234! |
| Agent | demo.agent@myinsurepath.com | Demo1234! |
| Admin | demo.admin@myinsurepath.com | Demo1234! |

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
