# Database Protection Strategy

> How SurePath prevents unauthorized data deletion — both at the database level and in code.

## The Problem

Even with RLS (Row-Level Security), anyone with admin role or the `service_role` key can DELETE rows from critical tables. Before this hardening:

- **No soft-delete** — deleted data was GONE forever (no recovery)
- **No audit log** — we didn't know WHO deleted WHAT and WHEN
- **No trigger to block hard DELETE** — even accidental deletes via Supabase Dashboard SQL editor would succeed
- **Storage buckets** — files (KTP photos, STNK photos, policy PDFs) could be deleted by anyone with write access

## The Solution — 4 Layers of Defense

### Layer 1: Audit Log Table (`sp_audit_log`)

Every DELETE and critical UPDATE on protected tables is automatically logged with:
- `table_name` — which table was affected
- `row_id` — which row was deleted/modified
- `action` — DELETE, FORCE_DELETE, UPDATE, or SOFT_DELETE
- `old_data` — full JSON snapshot of the row before deletion (for recovery)
- `new_data` — full JSON snapshot after UPDATE (for diff)
- `actor_id` — the auth.uid() of the caller
- `actor_email` — looked up from sp_users
- `reason` — optional reason (required for force_delete)
- `created_at` — when it happened

**The audit log is immutable** — no UPDATE or DELETE policy exists on it. Even `service_role` can't modify audit entries. Only INSERT is allowed (via triggers).

### Layer 2: Soft-Delete Columns

Added `deleted_at` column to 7 critical tables:
- `sp_policy_orders`
- `sp_payments`
- `sp_claims`
- `sp_commissions`
- `sp_wallet_transactions`
- `sp_withdrawals`
- `sp_agent_agreements`

"Delete" now means `UPDATE deleted_at = now()` — the data is preserved for audit/recovery. Application code filters `WHERE deleted_at IS NULL` on SELECT.

### Layer 3: Block Hard DELETE via Trigger

A `BEFORE DELETE` trigger on each protected table:
1. Checks if `app.allow_hard_delete = 'true'` session variable is set
2. If YES → logs to `sp_audit_log` and lets the DELETE proceed
3. If NO → raises an exception: *"Hard DELETE is blocked. Use soft_delete() instead."*

This means:
- ❌ `DELETE FROM sp_policy_orders WHERE id = '...'` → **BLOCKED** (even by service_role)
- ❌ Supabase Dashboard SQL editor DELETE → **BLOCKED**
- ❌ Accidental cascade deletes → **BLOCKED**
- ✅ `SELECT force_delete('sp_policy_orders', 'uuid', 'duplicate order')` → **ALLOWED** (with audit log)

### Layer 4: `force_delete()` Function

A `SECURITY DEFINER` function that:
1. Verifies the caller is an admin (`is_admin()`)
2. Requires a reason (min 5 chars)
3. Sets `app.allow_hard_delete = 'true'` (lets the trigger through)
4. Sets `app.delete_reason` (recorded in audit log)
5. Performs the DELETE (trigger logs it)
6. Immediately unsets `app.allow_hard_delete` (defense in depth)

```sql
-- Example: force-delete a duplicate order
SELECT public.force_delete('sp_policy_orders', 'uuid-here', 'duplicate order created by bug');
```

### Bonus: Critical UPDATE Audit

An `AFTER UPDATE` trigger on `sp_policy_orders` and `sp_payments` logs when sensitive fields change:
- `status` (e.g., SUBMITTED → APPROVED → ISSUED)
- `total_premium`
- `commission_amount`
- `discount_amount`

This catches manual DB edits that bypass the app — even if someone has Dashboard access and changes a commission amount directly, it's logged.

## Protected Tables

| Table | Soft Delete | Hard DELETE Blocked | UPDATE Audited |
|---|---|---|---|
| `sp_policy_orders` | ✅ | ✅ | ✅ (status, premium, commission, discount) |
| `sp_payments` | ✅ | ✅ | ✅ (status, premium, commission, discount) |
| `sp_claims` | ✅ | ✅ | — |
| `sp_commissions` | ✅ | ✅ | — |
| `sp_wallet_transactions` | ✅ | ✅ | — |
| `sp_withdrawals` | ✅ | ✅ | — |
| `sp_agent_agreements` | ✅ | ✅ | — |

## Storage Bucket Protection (PR #57)

| Bucket | Public Read | Write Access | Delete Access |
|---|---|---|---|
| `agent-docs` (KTP) | ❌ Private | Owner only | Owner + admin |
| `policy-documents` | ❌ Private | Admin only | Admin only |
| `vehicle-images` | ✅ Public | Authenticated only | Admin only |
| `website-assets` | ✅ Public | Admin only | Admin only |
| `agent-profiles` | ✅ Public | Owner only | Owner + admin |
| `b2b-documents` | ❌ Private | Owner only | Admin only |
| `media` | ✅ Public | Admin only | Admin only |

## Code-Level Protections

1. **`service_role` key never exposed to client** — only used in edge functions
2. **All mutations go through `data-gateway`** — which verifies JWT + role + ownership
3. **`VITE_ADMIN_KEY` stripped from production builds** — gated behind `import.meta.env.DEV`
4. **Payment amounts server-validated** — `create-xendit-invoice` fetches from DB, not client
5. **Webhook idempotency** — unique constraints prevent double-crediting on replay
6. **Promo code server-side validation** — blocks client-side discount bypass
7. **Admin role escalation matrix** — only MASTER_ADMIN can assign ADMIN/MASTER_ADMIN
8. **CSP tightened** — `unsafe-eval` removed from script-src
9. **Anti-inspect script removed** — was hostile to developers + accessibility tooling

## What This Means in Practice

| Scenario | Before | After |
|---|---|---|
| Admin accidentally deletes a policy order via Dashboard | ❌ Gone forever | ✅ Blocked by trigger — must use `soft_delete()` or `force_delete()` with reason |
| Rogue admin deletes commission records | ❌ No trace | ✅ Blocked — + if force_delete used, full audit trail in `sp_audit_log` |
| Service role key compromised, attacker tries to wipe tables | ❌ All data gone | ✅ DELETE blocked — attacker can only INSERT/UPDATE (which is also logged on critical fields) |
| Someone changes a commission amount directly in the DB | ❌ No trace | ✅ `sp_audit_log` records old + new values + who did it |
| Customer asks "why was my policy cancelled?" | ❌ No way to know | ✅ Check `sp_audit_log` for the status change |

## How to Use

### Soft-delete a record (safe, reversible):
```sql
SELECT public.soft_delete('sp_policy_orders', 'order-uuid-here', 'customer requested cancellation');
```

### Force-delete a record (permanent, audited):
```sql
SELECT public.force_delete('sp_policy_orders', 'order-uuid-here', 'duplicate order from bug #123');
```

### View the audit log (admin only):
```sql
SELECT * FROM sp_audit_log ORDER BY created_at DESC LIMIT 50;
```

### Recover a soft-deleted record:
```sql
UPDATE sp_policy_orders SET deleted_at = NULL WHERE id = 'order-uuid-here';
```

## Future Improvements

- **PITR (Point-In-Time Recovery)** — requires Supabase Pro plan. Enables recovery to any point in time within the last 7-30 days, even if someone drops an entire table.
- **Read-only admin dashboard replica** — admin views read from a Postgres replica, can't accidentally modify prod.
- **Webhook alert on force_delete** — send a Telegram alert whenever `force_delete()` is called.
- **Column-level encryption** for PII (KTP, NIK) — using `pgcrypto` extension.
