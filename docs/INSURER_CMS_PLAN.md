# Insurer CMS + Insurer App — Build Plan

## Executive Summary

This document outlines the complete build plan for a dedicated **Insurer CMS** and **Insurer App** — a secure, realtime platform where insurance partners can manage policy applications, upload policy documents, track payments, and communicate with SurePath operators — all branded with SurePath's design system v3.

Currently, insurers interact with SurePath via:
1. **Single-use review links** (`/review/:token`) — token-based, 7-day expiry, one decision per link
2. **Insurer Portal** (`/insurer-portal?token=authToken`) — dashboard-style, multi-order, rolling auth

This plan consolidates and upgrades both into a unified **Insurer App** with bottom-nav UX (matching customer/agent/operator apps), plus a full **Insurer CMS** for SurePath admins to manage insurer companies, PICs, API configs, and product mappings.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    SurePath Platform                             │
├─────────────────────────────────────────────────────────────────┤
│  Customer App  │  Agent App  │  Operator App  │  Admin CMS     │
│  /custapp      │  /agapps    │  /operatorapp  │  /admin        │
├─────────────────────────────────────────────────────────────────┤
│                    Data Gateway (Edge Function)                  │
│  JWT-authenticated actions for all internal users               │
├─────────────────────────────────────────────────────────────────┤
│  Insurer App (NEW)     │  Insurer Review Page (EXISTING)        │
│  /insurerapp           │  /review/:token                         │
│  Auth: rolling 7-day   │  Auth: per-order review token           │
│  token (no Supabase    │  (no login required)                    │
│  Auth account)         │                                         │
├─────────────────────────────────────────────────────────────────┤
│              Supabase (Postgres + Realtime + Storage)            │
│  sp_insurers, sp_insurer_auth_tokens, sp_review_tokens,          │
│  sp_policy_orders, sp_payments, sp_insurer_api_configs           │
└─────────────────────────────────────────────────────────────────┘
```

### Auth Model

Insurers **do not** have Supabase Auth accounts. They authenticate via:
- **Rolling 7-day auth token** stored in `sp_insurer_auth_tokens` (multi-use, auto-renewed on each visit)
- Token is passed as URL param: `/insurerapp?token=<auth_token>`
- Token can be revoked by SurePath admin from the CMS
- Optional: add PIN/biometric lock for PWA (client-side, no server session)

### Security Layers

| Layer | Mechanism |
|---|---|
| Transport | HTTPS only (Vercel enforces) |
| Auth | Rolling 7-day token (UUID, stored hashed) |
| Authorization | All gateway actions check `insurer_id` match |
| RLS | `sp_policy_orders` deny-all to anon/authenticated — only gateway (service_role) can read |
| Token revocation | Admin can revoke via `admin_revoke_insurer_token` action |
| Audit log | Every insurer action logged in `sp_admin_notifications` |
| Rate limiting | Gateway-level (future: per-insurer rate limits) |

---

## Phase 1: Insurer App (Dedicated Portal) — Week 1-2

### 1.1 Routes & Navigation

**Route:** `/insurerapp` (new) + keep `/review/:token` (single-order, no-login)

**Bottom nav (5 tabs, matching operator app pattern):**
| Tab | Label | Purpose |
|---|---|---|
| Beranda | Home | KPI dashboard (pending/approved/issued counts) + recent activity |
| Polis | Policies | All policy orders for this insurer, filterable by status |
| Klaim | Claims | Claims assigned to this insurer (future) |
| Bayar | Payments | Payment notifications + reconciliation |
| Profil | Profile | Insurer info + logout + PWA install |

### 1.2 Beranda (Dashboard)

- **Hero card**: Insurer name + logo + "X pengajuan menunggu review"
- **KPI grid** (2x2): Pending Review / Approved / Requested Info / Issued
- **Recent activity feed**: Last 10 actions across all orders
- **Quick action**: "Review Pending" button → navigate to Polis tab filtered by SUBMITTED

### 1.3 Polis (Policy Orders)

- **Status tabs**: Baru / Ditinjau / Disetujui / Request Info / Diterbitkan / Ditolak
- **Search**: by order number, client name, plate number
- **Order cards**: Order #, client name, product, premium, status badge, time
- **Detail sheet** (same pattern as operator app):
  - Customer info (name, phone, KTP)
  - Vehicle details (make, model, year, plate, chassis, engine)
  - Document viewer (vehicle photo, STNK if uploaded)
  - Coverage & premium breakdown
  - AI review section (if present)
  - **3 decision buttons**: Setujui / Minta Info / Tolak (with notes)
  - **Policy upload section** (when status = APPROVED): upload PDF + enter policy number → status becomes ISSUED
- **Realtime**: Supabase Realtime subscription on `sp_policy_orders` where `insurer_id = this_insurer` — new orders appear instantly

### 1.4 Bayar (Payments)

- **Payment notifications**: When a customer pays, insurer sees the payment record
- **Reconciliation table**: Order #, client, amount, payment method, status, date
- **Export CSV**: for insurer's internal reconciliation
- **Future**: Integration with insurer's finance system via API

### 1.5 Profil

- Insurer company name + logo
- PIC name + email + phone
- Auth token info (expiry date, last access)
- **Logout** (clears token from localStorage)
- **PWA install** menu (matching operator app)
- Dark mode toggle

### 1.6 Gateway Actions (New)

| Action | Auth | Purpose |
|---|---|---|
| `insurer_get_dashboard` | Insurer auth token | KPI counts + recent activity |
| `insurer_list_orders` | Insurer auth token | Paginated orders for this insurer |
| `insurer_get_order_detail` | Insurer auth token | Full order detail + documents |
| `insurer_submit_decision` | Insurer auth token | APPROVED / REQUEST_INFO / DECLINED + notes |
| `insurer_upload_policy` | Insurer auth token | Upload policy PDF + policy number → ISSUED |
| `insurer_list_payments` | Insurer auth token | Payments for this insurer's orders |
| `insurer_get_profile` | Insurer auth token | Insurer company info + PIC details |
| `insurer_renew_token` | Insurer auth token | Auto-renew 7-day rolling token |

All actions verify that the order/payment belongs to the authenticated insurer (`insurer_id` match).

---

## Phase 2: Insurer CMS (Admin Module) — Week 3

### 2.1 CMS Module: Insurer Management

**Location:** `/admin` → sidebar → "Mitra Asuransi" (already exists as `InsurerAdmin`)

**Upgrade existing features:**
- **Insurer list**: name, code, logo, active status, # of products, # of orders
- **Add/Edit insurer**: name, code, logo upload, description, is_active
- **PIC management**: pic_name, pic_email, pic_phone (NEW — currently missing in UI)
- **API config**: endpoint URL, API key, webhook secret (for future automated submissions)
- **Product mapping**: which SurePath products this insurer covers (sp_insurer_products)
- **Rate config**: commission rate, max discount, max vehicle age (existing)

### 2.2 CMS Module: Insurer Token Management

**New sub-tab under Insurer Management:**

- **Active tokens**: list all active `sp_insurer_auth_tokens` with insurer name, email, expiry, last access
- **Revoke token**: admin can revoke any insurer's auth token (instant logout)
- **Generate new token**: admin can generate a new auth token + get the magic link to send to insurer
- **Token analytics**: access count, last access IP, actions taken

### 2.3 CMS Module: Review Link Management

- **Active review tokens**: all `sp_review_tokens` with order #, insurer, status, expiry
- **Resend link**: regenerate + resend email for expired/acted tokens
- **Manual send**: generate a review link for a specific order + copy to clipboard
- **Token analytics**: accessed count, reminder count, action taken

### 2.4 CMS Module: Insurer Activity Feed

- Realtime feed of all insurer actions (approvals, rejections, info requests, policy uploads)
- Filterable by insurer, date range, action type
- Export to CSV for compliance

---

## Phase 3: Realtime & Notifications — Week 3

### 3.1 Realtime Subscriptions

| Table | Event | Who receives | Action |
|---|---|---|---|
| `sp_policy_orders` | INSERT (new order assigned to insurer) | Insurer app | Toast + dashboard refresh |
| `sp_policy_orders` | UPDATE (status change) | Insurer app, Operator app, Customer app | Toast + list refresh |
| `sp_review_tokens` | UPDATE (insurer_action set) | Operator app, Admin CMS | Toast + notification |
| `sp_payments` | INSERT/UPDATE (payment status change) | Insurer app, Operator app | Toast + payment list refresh |
| `sp_admin_notifications` | INSERT | Operator app, Admin CMS | Popup toast + bell badge |

### 3.2 Notification Flows

**When operator approves order → insurer gets email + app notification:**
1. Operator clicks "Setujui" in operator app
2. Gateway: `admin_update_order` (status → APPROVED) + `admin_send_insurer_review_link`
3. Email sent to insurer PIC via Resend
4. Admin notification: "INSURER_REVIEW_SENT"
5. Insurer opens email → clicks review link → `/review/:token` page
6. Insurer selects APPROVE / REQUEST_INFO / DECLINE + notes
7. Gateway: `submit_insurer_decision` → updates order + creates notifications
8. **Notifications auto-propagate:**
   - Customer app: "Polis Disetujui/Perlu Info/Ditolak Penanggung"
   - Agent app: same notification
   - Operator app: popup toast + bell badge
   - Admin CMS: notification in activity feed

**When insurer uploads policy PDF:**
1. Insurer uploads PDF + enters policy number in insurer app
2. Gateway: `insurer_upload_policy` → status → ISSUED + `policy_document_url` set
3. **Notifications:**
   - Customer app: "Polis Anda telah diterbitkan" + download link
   - Agent app: same
   - Operator app: popup toast
   - Admin CMS: notification

### 3.3 Reminder System

**Scheduled edge function** (runs every 4 hours via Supabase Cron):
- For each `sp_review_tokens` where `insurer_action IS NULL` AND `expires_at > now()`:
  - If `created_at < now() - 24h` AND `reminder_count = 0`: send first reminder email
  - If `created_at < now() - 72h` AND `reminder_count = 1`: send second reminder email
  - If `created_at < now() - 120h` AND `reminder_count = 2`: send final reminder + admin notification "Insurer hasn't responded"
- For each order in `UNDER_REVIEW` (REQUEST_INFO) > 48h: notify customer "Please complete the requested info"

---

## Phase 4: Insurer App UI Build — Week 2 (parallel with Phase 1)

### 4.1 Design System Reuse

- **100% reuse** of SurePath design system v3 (ClayCard, Button, UnderlineTabs, Skeleton, useToast, etc.)
- **Color accent:** Violet/purple (to differentiate from customer=emerald, agent=blue, operator=amber)
- **Bottom nav:** Same floating glass nav pattern as operator app
- **Detail sheets:** Same dark-mode-safe sheet pattern (bg-white dark:bg-[#0F1829])
- **Document viewer:** Same lightbox pattern (clickable thumbnail → fullscreen)

### 4.2 Component Structure

```
components/insurer/
├── InsurerPortal.tsx          (new — replaces old InsurerPortal.tsx)
├── InsurerLogin.tsx           (new — token-based auth gate)
├── InsurerDashboard.tsx       (Beranda tab)
├── InsurerOrders.tsx          (Polis tab — list + detail + decisions)
├── InsurerClaims.tsx          (Klaim tab — future)
├── InsurerPayments.tsx        (Bayar tab)
├── InsurerProfile.tsx         (Profil tab + PWA install)
└── InsurerNotifications.tsx   (slide-in drawer)
```

### 4.3 Key UX Flows

**Flow 1: Insurer receives email → reviews → approves**
1. Insurer PIC receives email with "Review Pengajuan Ini" button
2. Clicks → lands on `/review/:token` (single-order page, no login)
3. Reviews all details + documents
4. Clicks "Setujui" → optional notes → "Konfirmasi Persetujuan"
5. Done page: "Pengajuan Disetujui"
6. **NEW:** After approval, show link to "Buka Dashboard Insurer" → `/insurerapp?token=<auth_token>`
7. In dashboard, order now shows "Upload Polis" action

**Flow 2: Insurer logs into dashboard → reviews pending → requests info**
1. Insurer PIC bookmarks `/insurerapp?token=<auth_token>`
2. Opens → sees dashboard with pending count
3. Goes to Polis tab → clicks order → detail sheet
4. Clicks "Minta Info" → types notes ("Foto STNK kurang jelas") → confirm
5. Order status → UNDER_REVIEW
6. Customer + agent + operator get notification

**Flow 3: Insurer uploads policy PDF**
1. Order status = APPROVED (insurer already approved)
2. Insurer clicks "Upload Polis" in detail sheet
3. Selects PDF file → enters policy number → submit
4. Gateway: `insurer_upload_policy` → status → ISSUED
5. PDF stored in `policy-documents` bucket (private, signed URLs)
6. Customer + agent + operator get "Polis Diterbitkan" notification
7. Customer can download policy PDF from their app

---

## Phase 5: Migration & Integration — Week 3

### 5.1 Database Migrations

**Already applied:**
- `sp_review_tokens` table (per-order, 7-day expiry)
- `sp_insurer_auth_tokens` table (rolling 7-day, multi-use)
- `sp_insurers` table (with pic_email column)
- Gateway actions: `get_insurer_review`, `submit_insurer_decision`, `get_insurer_dashboard`, `insurer_upload_policy`

**New migrations needed:**
- Add `reminder_count` column to `sp_review_tokens` (for reminder system)
- Add `last_reminder_at` column to `sp_review_tokens`
- Create `sp_insurer_activity_log` table (audit trail of all insurer actions)

### 5.2 Frontend Migration

**Replace:**
- Old `InsurerPortal.tsx` (510 lines, client-side queries) → new `InsurerPortal.tsx` (gateway-based, bottom-nav)
- `InsuranceReviewPage.tsx` → keep as-is (single-order review, token-based, no login) but wire to gateway `get_insurer_review` + `submit_insurer_decision`

**New routes in App.tsx:**
- `/insurerapp` → `InsurerPortal` (token-authenticated, bottom-nav)
- `/review/:uuid` → `InsuranceReviewPage` (single-order, token-based, no login)
- Keep `/insurer-portal` as redirect to `/insurerapp` (backward compat)

### 5.3 Email Template Updates

**Fix inline `sendInsurerEmail` in data-gateway:**
- Change review URL from `myinsurepath.com/insurer/orders/${orderId}` → `myinsurepath.com/review/${token}`
- Change dashboard URL from `myinsurepath.com/insurer/dashboard` → `myinsurepath.com/insurerapp?token=${authToken}`

**New email templates:**
- Reminder email (24h, 72h, 120h after review link sent)
- Policy issued email (to customer when insurer uploads policy PDF)
- Info request email (to customer when insurer requests additional info)

---

## Phase 6: Testing & Security — Week 4

### 6.1 Security Testing

- **Token brute-force**: review tokens are UUIDs (2^122 entropy) — not brute-forceable
- **Token expiry**: 7-day hard expiry, checked server-side
- **Insurer isolation**: every gateway action verifies `order.insurer_id === token.insurer_id`
- **RLS verification**: confirm insurers can't read other insurers' orders via direct Supabase queries
- **Rate limiting**: add per-insurer rate limit (max 100 gateway calls per hour)
- **Audit log**: verify every insurer action is logged in `sp_admin_notifications`

### 6.2 E2E Test Flows

1. **Happy path**: operator approve → insurer email → review link → approve → upload policy → customer notified
2. **Request info**: operator approve → insurer email → request info → customer notified → customer updates → re-review
3. **Decline**: operator approve → insurer email → decline → customer notified
4. **Token expiry**: review token expires after 7 days → insurer can't access → admin generates new link
5. **Token revocation**: admin revokes insurer auth token → insurer can't access dashboard
6. **Multi-insurer**: two insurers can't see each other's orders
7. **Realtime**: new order assigned to insurer → insurer app shows toast within 1s

---

## Timeline Summary

| Phase | Week | Deliverable |
|---|---|---|
| 1. Insurer App backend | Week 1 | Gateway actions + migrations |
| 2. Insurer App frontend | Week 2 | 5-tab bottom-nav app with realtime |
| 3. Insurer CMS upgrade | Week 3 | PIC management + token management + activity feed |
| 4. Realtime + notifications | Week 3 | All notification flows + reminder system |
| 5. Migration + email fixes | Week 3 | Migrate old portal + fix email URLs |
| 6. Testing + security | Week 4 | E2E tests + security audit |

**Total: 4 weeks** (can be compressed to 3 if phases overlap)

---

## Current Status (as of v1.19.2)

### ✅ Already Done
- Gateway actions: `get_insurer_review`, `submit_insurer_decision`, `admin_send_insurer_review_link`
- `sp_review_tokens` table with 7-day expiry
- `sp_insurer_auth_tokens` table with rolling 7-day
- `InsuranceReviewPage` with 3 decisions (APPROVED/REQUEST_INFO/DECLINED) + notes
- Operator approve triggers email to insurer PIC
- Email template with correct `/review/:token` URL
- Admin notification on insurer decision
- Customer + agent notification on insurer decision
- SpReviewToken interface updated for 3 actions

### 🔲 To Build (this plan)
- Dedicated `/insurerapp` with bottom-nav (5 tabs)
- Insurer CMS module for token/PIC management
- Realtime subscriptions for insurer app
- Reminder system (scheduled edge function)
- Policy PDF upload flow in insurer app
- Migration of old `InsurerPortal.tsx` to new gateway-based version
- Fix inline `sendInsurerEmail` URLs in data-gateway
- E2E security testing

---

## Next Immediate Action

Build the **Insurer App** (`/insurerapp`) as a 5-tab bottom-nav app matching the operator app pattern. Reuse 100% of the design system. Wire to existing gateway actions. Add policy PDF upload. This is the highest-impact deliverable that unblocks the full insurer review flow end-to-end.
