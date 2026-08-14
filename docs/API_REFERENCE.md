# SurePath Data Gateway — API Reference

> **Internal API.** This is the RPC endpoint the SurePath portals and the
> Android APK call. Third-party integrations use the **Partner API** or
> **Insurer API** instead — see [`PUBLIC_API.md`](PUBLIC_API.md), with machine-readable
> specs in [`openapi/`](openapi/). A formal spec for *this* endpoint, including
> the full action enum and the three authorisation bands, lives at
> [`openapi/data-gateway.yaml`](openapi/data-gateway.yaml).

> Base URL: `https://uyjgeteelnswphyzkjwi.supabase.co/functions/v1/data-gateway`
> Method: `POST` for all actions
> Auth: `Authorization: Bearer <JWT>` (except PUBLIC_ACTIONS)
> Body: `{ "action": "<action_name>", "params": { ... } }`
> Response: `{ "data": ... }` on success, `{ "error": "..." }` on failure
> Headers: `X-Request-ID` in all responses for tracing
> Health: `GET /functions/v1/data-gateway` → `{ status, service, version, timestamp }`

---

## Public Actions (no JWT required)

These actions use token-based auth (review token or insurer auth token) passed in params.

| Action | Params | Returns | Purpose |
|---|---|---|---|
| `get_insurer_review` | `token` | `{ token, order, insurer }` | Load order details by review token (/review/:uuid) |
| `submit_insurer_decision` | `token, action, notes` | `{ success, order_status, action }` | Submit insurer decision (APPROVED/REQUEST_INFO/DECLINED) via review token |
| `get_insurer_dashboard` | `token` | `{ insurer, orders, kpi, token_expires_at }` | Load insurer dashboard (auto-renews token) |
| `insurer_submit_decision_authed` | `token, order_id, action, notes` | `{ success, order_status, action }` | Submit decision via auth token (dashboard) |
| `insurer_list_payments` | `token` | `{ payments: [...] }` | List payments for insurer's orders |
| `insurer_upload_policy` | `token, order_id, policy_document_url, policy_number` | `{ success, order }` | Upload policy PDF → status ISSUED |

---

## User Actions (JWT required)

| Action | Params | Returns | Purpose |
|---|---|---|---|
| `get_my_profile` | — | `sp_users row` | Get own profile |
| `ensure_profile` | `name?, phone?, role?, ktp?, address?, referral_code?` | `sp_users row` | Create profile if missing |
| `update_my_profile` | `name?, phone?, address?, profile_photo_url?, ktp_document_url?` | `sp_users row` | Update own profile (safe fields only) |
| `get_my_orders` | — | `sp_policy_orders[]` | List own orders |
| `cancel_my_order` | `order_id` | `sp_policy_orders row` | Cancel own order (SUBMITTED/UNDER_REVIEW only) |
| `get_my_claims` | — | `sp_claims[]` | List own claims |
| `submit_claim` | `claim_type, description, location, amount_estimated` | `sp_claims row` | Submit a new claim |
| `get_my_notifications` | — | `sp_notifications[]` | List own notifications |
| `mark_my_notification_read` | `notification_id` | `{ success }` | Mark one notification read |
| `mark_all_my_notifications_read` | — | `{ success }` | Mark all own notifications read |
| `create_notification` | `type, title, body, metadata?, order_id?` | `sp_notifications row` | Create notification in own feed |
| `get_my_payments` | — | `sp_payments[]` | List own payments |
| `get_my_agreement` | — | `sp_agent_agreements row` | Get own signed agreement |
| `accept_agreement` | `full_name, ktp_number` | `{ rec, error }` | Sign agent agreement |
| `apply_referral` | `code` | `{ upline_id }` | Apply referral code |
| `list_my_clients` | — | `sp_clients[]` | List own clients (agents) |
| `get_agent_stats` | `agent_id?` | `{ commissions, clientCount, activePolicies }` | Get agent stats |
| `get_user_profile` | `user_id?` | `sp_users row` | Get user profile (self or admin) |
| `update_fcm_token` | `token` | `{ ok }` | Store FCM push token |
| `award_coins` | `agent_id, coins, order_id, description` | `{ ok }` | Award coins (admin only) |
| `redeem_coins` | `coins, description` | `{ ok }` | Redeem coins (self) |
| `get_leaderboard` | — | `leaderboard[]` | Get agent leaderboard |
| `create_policy_order` | `order data...` | `sp_policy_orders row` | Create new policy order |
| `pathy_chat` | `message` | `{ reply }` | AI chat assistant |

---

## Admin Actions (JWT + isAdmin required)

### User Management
| Action | Params | Purpose |
|---|---|---|
| `admin_list_users` | `role?, limit?` | List all users |
| `admin_get_user` | `user_id` | Get single user |
| `admin_update_user` | `user_id, role?, verified?, tier?, ...` | Update user (role-escalation matrix enforced) |
| `admin_register_agent` | `name, email, phone` | Create new agent |
| `admin_invite_user` | `email, name, role` | Invite user (MASTER_ADMIN only) |

### Order Management
| Action | Params | Purpose |
|---|---|---|
| `admin_list_orders` | `status?, limit?` | List all orders |
| `admin_update_order` | `order_id, status, reviewer_notes?, policy_number?` | Update order status |
| `admin_queue_summary` | — | Aggregated queue counts |
| `admin_stats` | — | Dashboard KPIs |

### Claims
| Action | Params | Purpose |
|---|---|---|
| `admin_list_claims` | `status?, limit?` | List all claims |
| `admin_update_claim` | `claim_id, status, adjuster_notes?` | Update claim status |

### Payments & Commissions
| Action | Params | Purpose |
|---|---|---|
| `admin_list_payments` | `limit?` | List all payments |
| `admin_list_commissions` | `limit?` | List all commissions |
| `admin_update_commission` | `commission_id, status` | Update commission status |
| `admin_transaksi_overview` | — | Transaction overview |
| `admin_financial_reports` | `year?` | Financial report data |
| `admin_financial_detail` | `from?, to?` | Detailed financial data |

### Withdrawals
| Action | Params | Purpose |
|---|---|---|
| `admin_list_withdrawals` | `status?, limit?` | List withdrawal requests |
| `admin_approve_withdrawal` | `withdrawal_id, level, approver_id` | Multi-level approval (L1/L2/L3) |
| `admin_reject_withdrawal` | `withdrawal_id, rejector_id, reason` | Reject + reverse wallet |

### Agent Verification
| Action | Params | Purpose |
|---|---|---|
| `admin_list_pending_agents` | `limit?` | List unverified agents (+ agreement info) |
| `admin_get_agent_detail` | `agent_id` | Full agent detail + agreement history |
| `admin_verify_agent` | `agent_id, approve?` | Verify or reject agent |

### Insurer Management
| Action | Params | Purpose |
|---|---|---|
| `admin_create_insurer` | `name, code, ...` | Create insurer |
| `admin_update_insurer` | `insurer_id, ...` | Update insurer |
| `admin_delete_insurer` | `insurer_id` | Delete insurer |
| `admin_save_insurer_product` | `insurer_id, ...` | Create/update insurer product |
| `admin_delete_insurer_product` | `product_id` | Delete insurer product |
| `admin_save_ojk_rate_set` | `version, ...` | Create OJK rate set |
| `admin_activate_ojk_rate_set` | `rate_set_id` | Activate rate set |
| `admin_delete_ojk_rate_set` | `rate_set_id` | Delete rate set |
| `admin_send_insurer_review_link` | `order_id` | Generate review token + send email |
| `admin_list_insurer_tokens` | `limit?` | List insurer auth tokens |
| `admin_revoke_insurer_token` | `token_id` | Revoke insurer token |
| `admin_generate_insurer_token` | `insurer_id` | Generate new insurer token + magic link |
| `admin_list_review_tokens` | `limit?` | List review tokens |
| `admin_get_insurer_api_config` | `insurer_id` | Get API config |
| `admin_save_insurer_api_config` | `insurer_id, endpoint_url, ...` | Save API config (SSRF guarded) |
| `admin_list_insurer_activity` | `insurer_id?, action?, limit?` | List insurer activity log |

### Notifications
| Action | Params | Purpose |
|---|---|---|
| `admin_list_notifications` | `unread_only?, limit?` | List admin notifications |
| `admin_mark_notification_read` | `notification_id` | Mark one read |
| `admin_mark_all_notifications_read` | — | Mark all read |
| `admin_create_notification` | `type, title, body, ...` | Create admin notification |

### Analytics & Security
| Action | Params | Purpose |
|---|---|---|
| `admin_analytics_data` | — | YTD analytics for charts |
| `admin_security_stats` | — | Security/session stats |
| `admin_traffic_stats` | — | Page view traffic (7 days) |
| `admin_list_policies` | `agent_id?, status?` | List policies |
| `admin_list_clients` | `agent_id?` | List clients |

---

## Rate Limiting

| Scope | Limit | Window |
|---|---|---|
| Per IP (public actions) | 60 requests | 1 hour |
| Per insurer token | 200 requests | 1 hour |
| Fail-closed on DB error | ✅ | Blocks on error |

## Error Codes

| Status | Meaning |
|---|---|
| 200 | Success |
| 400 | Bad request (missing/invalid params) |
| 401 | Unauthorized (missing/invalid JWT) |
| 403 | Forbidden (not admin, not owner) |
| 404 | Not found (invalid token, order not found) |
| 409 | Conflict (token already acted on) |
| 410 | Gone (token expired) |
| 429 | Too many requests (rate limited) |
| 500 | Server error |
| 503 | Service unavailable (cold start) |
