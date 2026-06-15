# SurePath — Database State Reference
> Supabase project `uyjgeteelnswphyzkjwi` · ap-southeast-1 (Singapore)
> Last updated: June 15, 2026

---

## Supabase Tables (sp_*)

| Table | Purpose | Access |
|-------|---------|--------|
| `sp_users` | All user profiles — customers, agents, admins, B2B | via data-gateway |
| `sp_clients` | Clients owned by agents | via data-gateway |
| `sp_policy_orders` | Insurance purchase orders (status: SUBMITTED→CANCELLED) | deny-all → gateway only |
| `sp_payments` | Xendit invoice records | deny-all → gateway only |
| `sp_commissions` | Per-order commission records | via gateway |
| `sp_claims` | Claim submissions | deny-all → gateway only |
| `sp_agent_wallets` | Agent IDR balance (one row per agent) | SECURITY DEFINER RPC only |
| `sp_wallet_transactions` | Immutable wallet ledger — append-only | via gateway |
| `sp_withdrawals` | Withdrawal requests + multi-level approval chain | via gateway |
| `sp_notifications` | Agent in-app notifications | via gateway |
| `sp_admin_notifications` | Admin notification inbox | via gateway |
| `sp_review_tokens` | Insurer review links (7-day expiry) | via gateway |
| `sp_coin_ledger` | Coin earn/redeem history | via gateway |
| `sp_user_sessions` | Session heartbeats (security monitoring) | client write, admin read |
| `sp_page_views` | Traffic analytics | anon insert, admin read |
| `sp_quotes` | Public quote calculations | public |
| `sp_product_configs` | Insurer product rate configs | public read, admin write |
| `sp_website_config` | CMS config for landing page / promo banner | public read, admin write |
| `sp_insurers` | Partner insurer records | via gateway |
| `sp_bot_config` | Telegram bot token + chat ID | edge function only |

---

## sp_policy_orders Status Flow

```
SUBMITTED → UNDER_REVIEW → APPROVED → ISSUED
                         ↘ REJECTED
SUBMITTED → CANCELLED (customer self-service)
UNDER_REVIEW → CANCELLED (customer self-service)
```

---

## RLS Status (post June 11, 2026)

- **17 scoped policies** applied across tables
- `is_admin()` — SECURITY DEFINER helper used in admin-gating policies
- `sp_policy_orders`, `sp_payments`, `sp_claims` — deny-all; access only via data-gateway with service_role
- `sp_agent_wallets`, `sp_wallet_transactions` — no direct client access; only mutated by `credit_agent_wallet()` and `request_withdrawal_deduct()` SECURITY DEFINER SQL functions

---

## UserRole Enum

Defined in `types.ts` and enforced via RLS + app-level checks:

```
MASTER_ADMIN    — full access
ADMIN           — orders, users, agents, commissions, payments, withdrawals, approvals
FINANCE         — reports, transactions, commissions, payments, withdrawals (L1)
FINANCE_MANAGER — finance + withdrawal L2 approval
FINANCE_DIRECTOR— finance + withdrawal L3 approval
INSURANCE_ADMIN — policy orders, claims queue
AGENT           — own clients + orders + wallet
CUSTOMER        — own orders + claims + payments
B2B_CLIENT      — B2B portal
```

---

## Key SQL Functions (SECURITY DEFINER)

| Function | Purpose |
|----------|---------|
| `is_admin()` | Returns true if caller's role is in ADMIN_ROLES — used in RLS policies |
| `credit_agent_wallet(agent_id, amount)` | Credit wallet balance atomically; appends to `sp_wallet_transactions` |
| `request_withdrawal_deduct(agent_id, amount)` | Deduct balance atomically at withdrawal request time |
| `reverse_withdrawal(withdrawal_id)` | Restore balance if withdrawal rejected or Xendit fails |

---

## Dexie (IndexedDB) — Legacy / Local Only

Used for `customProducts` (admin-created) and some local CMS config. Actively being replaced by Supabase tables.

| Table | Contents |
|-------|----------|
| `customProducts` | Admin-created custom insurance products |
| `websiteConfig` | Local CMS config (some features still use this) |

---

*Last updated: June 15, 2026 · SurePath Engineering*
