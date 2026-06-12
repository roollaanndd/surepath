# SurePath — Database State Reference
> Supabase project `uyjgeteelnswphyzkjwi` · ap-southeast-1 (Singapore)

---

## Supabase Tables

| Table | Purpose | Notes |
|-------|---------|-------|
| `sp_users` | Customer and agent profiles | Linked to `auth.users` |
| `sp_policy_orders` | Policy purchase orders | Watched by `notify-admin` edge function |
| `sp_insurers` | Partner insurer records | Columns: `admin_email`, `admin_name`, `pic_name`, `pic_phone`; `pic_email` migration pending |
| `sp_admin_notifications` | In-app notification records for admin users | Feeds notification bell in AdminPortal |
| `auth.users` | Supabase built-in auth | Managed by Supabase Auth |

---

## RLS (Row Level Security)

- **17 scoped policies** across tables
- `is_admin()` — SECURITY DEFINER helper function; used in policies that gate admin-only rows
- Policies are per-table, per-operation (SELECT / INSERT / UPDATE / DELETE)

---

## UserRole Enum

Defined in `types.ts` and enforced via RLS + app-level checks:

```
MASTER_ADMIN
ADMIN
FINANCE
FINANCE_MANAGER
FINANCE_DIRECTOR
INSURANCE_ADMIN
AGENT
CUSTOMER
B2B_CLIENT
```

---

## sp_insurers Columns

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid | PK |
| `admin_email` | text | Primary contact email |
| `admin_name` | text | Admin contact name |
| `pic_name` | text | Person-in-charge name |
| `pic_phone` | text | Person-in-charge phone |
| `pic_email` | text | **Pending migration** — not yet in schema |

---

## sp_admin_notifications Columns

Stores in-app notifications surfaced by the AdminPortal notification bell.

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid | PK |
| `created_at` | timestamptz | Auto-set |
| `type` | text | Notification category |
| `message` | text | Human-readable notification body |
| `read` | boolean | False = unread |
| `user_id` | uuid | Target admin user (nullable = all admins) |

---

## Dexie (IndexedDB) Tables

Local client-side storage — defined in `db.ts`.

| Table | Contents |
|-------|----------|
| `users` | Admin/agent accounts with hashed passwords |
| `policies` | Customer policies |
| `claims` | Claim records |
| `orders` | Purchase orders |
| `agents` | Agent profiles |
| `products` | Base insurance products |
| `customProducts` | Admin-created custom products |
| `websiteConfig` | CMS config for landing page sections |
| `vehiclePricelist` | 2025 vehicle prices (Halalins MV4) |

---

*Last updated: June 2026 · SurePath Engineering*
