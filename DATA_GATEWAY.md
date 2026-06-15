# data-gateway — Edge Function Reference
> Supabase Edge Function · v11 · Project `uyjgeteelnswphyzkjwi`

---

## Overview

`data-gateway` is the primary Supabase Edge Function for the SurePath platform. It handles all browser→Postgres interactions that require elevated privileges, fires push notifications inline, and enforces per-row authorization in code.

**Deployed version:** v11  
**Region:** ap-southeast-1 (Singapore)  
**File:** `supabase/functions/data-gateway/index.ts`

---

## Request Format

```
POST /functions/v1/data-gateway
Authorization: Bearer <supabase JWT>
Content-Type: application/json

{ "action": "<action_name>", "params": { ... } }
```

Response: `{ data }` on success, `{ error }` + HTTP error status on failure.

Client helper: `callGateway(action, params)` in `services/supabaseService.ts` — automatically attaches the session access token.

---

## CORS Origins Allowed

- `https://myinsurepath.com`, `https://www.myinsurepath.com`
- `https://*.vercel.app` (preview deployments)
- `http(s)://localhost[:port]` — dev server and Capacitor Android WebView
- `capacitor://localhost` — iOS WebView

---

## Action Reference

### Self-service (any authenticated user)

| Action | Description |
|--------|-------------|
| `ensure_profile` | Fetch own profile; create from JWT identity if missing (role: CUSTOMER/AGENT, unverified) |
| `get_my_profile` | Own profile (404 if not found) |
| `get_user_profile` | Profile by id — self or admin |
| `update_my_profile` | Update safe fields: name, phone, address, profile_photo_url, ktp_document_url |
| `list_my_clients` | Agent's own clients |
| `get_agent_stats` | Own commissions / clients / policies |
| `get_leaderboard` | Top 10 agents this month |
| `redeem_coins` | Redeem coins — balance checked server-side |
| `create_policy_order` | Create order — `agent_id` ALWAYS set from caller JWT, never from client payload |
| `get_my_orders` | Customer's own orders (scoped to `client_id`) |
| `get_my_claims` | Customer's own claims |
| `get_my_payments` | Customer's own payment records |
| `cancel_my_order` | Cancel own order if status is SUBMITTED or UNDER_REVIEW; ownership enforced via `client_id` |

### Admin-only (ADMIN_ROLES)

| Action | Description |
|--------|-------------|
| `admin_list_users` | List all users; optional `role` filter; max 500 |
| `admin_get_user` | Full profile of a single user |
| `admin_update_user` | Update user role or `is_suspended` |
| `admin_register_agent` | Create agent in `sp_users` |
| `admin_invite_user` | Send magic-link invite via Supabase Auth (MASTER_ADMIN only) |
| `admin_list_clients` | All clients |
| `admin_list_claims` | All claims |
| `admin_update_claim` | Update claim status |
| `admin_list_orders` | All policy orders; optional `status` filter |
| `admin_update_order` | Update order status + extras (reviewer_notes, policy_number, policy_document_url) |
| `admin_list_policies` | Policy records |
| `admin_list_payments` | All payments joined with order info |
| `admin_list_withdrawals` | All withdrawal requests |
| `admin_approve_withdrawal` | L1/L2/L3 approval (≥10M→L2, ≥25M→L3) |
| `admin_reject_withdrawal` | Reject + reverse wallet balance via RPC |
| `award_coins` | Award coins to agent |
| `admin_stats` | Dashboard stats (totalOrders, totalPremiumIssued, totalPremiumPaid, activeAgents, topAgents, pendingCommissions) |
| `admin_transaksi_overview` | totalCustomers, totalOrders, totalPembayaranMasuk, totalKomisiAgen |
| `admin_financial_reports` | GWP / commissions / claims by year |
| `admin_financial_detail` | Detailed financial breakdown with date range filter |
| `admin_analytics_data` | Order + agent + claim + payment data for current year |
| `admin_list_commissions` | All commissions joined with agent name |
| `admin_update_commission` | Update commission status (PENDING/PAID/CANCELLED) |
| `admin_list_notifications` | Admin notification inbox |
| `admin_mark_notification_read` | Mark notification as read |
| `admin_create_notification` | Create admin notification |
| `admin_security_stats` | Failed logins, active sessions, rate-limit blocks |
| `admin_traffic_stats` | Page view analytics (7-day) |

---

## Notification Actions (inline)

Fired within the same invocation — no separate worker:

| Trigger | Action |
|---------|--------|
| New user registration | `sendTelegram()` + `sendInsurerEmail()` to admin |
| New policy order | `sendTelegram()` + `sendInsurerEmail()` to admin |

---

## Required Supabase Secrets

Set via Supabase Dashboard → Edge Functions → Secrets:

| Secret | Used By |
|--------|---------|
| `TELEGRAM_BOT_TOKEN` | `sendTelegram` |
| `TELEGRAM_ADMIN_CHAT_ID` | `sendTelegram` |
| `RESEND_API_KEY` | `sendInsurerEmail` |
| `SUPABASE_SERVICE_ROLE_KEY` | All DB admin operations |
| `SUPABASE_ANON_KEY` | Public client operations |

---

## Deploy

Edge functions do NOT auto-deploy with Vercel. After changing `supabase/functions/data-gateway/index.ts`:

```bash
supabase functions deploy data-gateway --project-ref uyjgeteelnswphyzkjwi
```

Or: Supabase Dashboard → Edge Functions → data-gateway → paste & deploy.

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| v11 | Jun 15, 2026 | + `cancel_my_order` action (customer self-service order cancellation) |
| v8 | Jun 13, 2026 | + `admin_transaksi_overview`, `admin_financial_detail`, `admin_analytics_data`, `admin_list_commissions`, `admin_update_commission`, `admin_security_stats`, `admin_traffic_stats` |
| v4 | Jun 10, 2026 | + `ensure_profile`, CORS `https://localhost` + `capacitor://localhost` |
| v3 | Jun 2026 | Initial action set |

---

*Last updated: June 15, 2026 · SurePath Engineering*
