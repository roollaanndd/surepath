# SurePath — Technical Architecture Specification

**Version:** 1.0  
**Date:** June 2026

---

## 1. Architecture Overview

```
┌─────────────────────────────────────────────────┐
│               Browser / Android App              │
│  React 19 SPA  +  Capacitor 6 (native bridge)   │
└────────────────┬────────────────────────────────┘
                 │  HTTPS + Supabase JWT (anon)
        ┌────────▼────────┐
        │  Vercel CDN/Edge │  (global, atomic deploys)
        └────────┬────────┘
                 │
        ┌────────▼────────────────────────────────────┐
        │          Supabase (us-east-1)               │
        │  ┌──────────┐  ┌──────────┐  ┌──────────┐  │
        │  │PostgreSQL│  │  GoTrue  │  │ Storage  │  │
        │  │  + RLS   │  │  (Auth)  │  │ (S3-like)│  │
        │  └──────────┘  └──────────┘  └──────────┘  │
        │  ┌─────────────────────────────────────┐    │
        │  │        Deno Edge Functions          │    │
        │  │  ai-proxy | xendit-* | ocr-scan     │    │
        │  │  send-insurer-email | ai-*-review   │    │
        │  └─────────────────────────────────────┘    │
        └──────────────────┬──────────────────────────┘
                           │
        ┌──────────────────▼──────────────────────────┐
        │              External APIs                   │
        │  Xendit (payments)  |  OpenRouter (LLMs)    │
        │  Google Vision (OCR)|  Resend (email)       │
        └─────────────────────────────────────────────┘
```

---

## 2. Frontend

### 2.1 Stack
| Layer | Technology | Version |
|-------|-----------|---------|
| Framework | React | 19 |
| Language | TypeScript | 5.x |
| Build | Vite | 6 |
| Styles | TailwindCSS | 3.x |
| Icons | Lucide React | latest |
| PDF | jsPDF | 2.x |
| Mobile | Capacitor | 6 |
| Analytics | Vercel Analytics | auto |

### 2.2 Routing
Custom hash-free SPA router using `window.history.pushState()`:
- No React Router dependency — routes managed by `currentPath` state in `App.tsx`
- `vercel.json` rewrites all paths to `index.html`
- Route guards: `ADMIN_ROLES` check before admin routes; `PKCE_LOADING` guard for OAuth redirect

### 2.3 Code Splitting
All portal chunks are lazy-loaded via `React.lazy()`:
```
AuthGate.tsx        ~45 kB   (auth flows)
AdminPortal.tsx     ~120 kB  (admin dashboard)
AgentPortal.tsx     ~90 kB   (agent dashboard)
CustomerPortal.tsx  ~60 kB   (customer dashboard)
B2BPortal.tsx       ~70 kB   (B2B dashboard)
InsurerPortal.tsx   ~50 kB   (insurer dashboard)
PlatformLanding.tsx ~80 kB   (public landing)
```

### 2.4 State Management
- No Redux — component state + props
- `SessionStorage` for authenticated user object (clears on tab close)
- `LocalStorage` for language preference and saved login
- Supabase realtime subscriptions: not used yet (polling on portal mount)

---

## 3. Backend

### 3.1 Supabase Project
- **Project ID:** `uyjgeteelnswphyzkjwi`
- **Region:** ap-southeast-1 (Singapore)
- **Plan:** Pro

### 3.2 Database Schema (key tables)

| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `sp_users` | Agents, admins, customers | `id, email, role, agent_code, upline_id` |
| `sp_policy_orders` | All insurance applications | `order_number, status, product_type, agent_id, client_id` |
| `sp_claims` | Claims against policies | `claim_number, status, order_id, photos[]` |
| `sp_payments` | Xendit invoice/payment records | `external_id, status, amount, paid_at` |
| `sp_wallet_transactions` | Append-only commission ledger | `agent_id, amount, type, ref_order_id` |
| `sp_withdrawals` | Withdrawal requests | `agent_id, amount, status, bank_code` |
| `sp_notifications` | Agent in-app notifications | `agent_id, type, message, read` |
| `sp_admin_notifications` | Admin in-app notifications | `type, message, read, order_id` |
| `sp_insurers` | Registered insurer companies | `name, code, admin_email, admin_name` |
| `sp_insurer_auth_tokens` | Magic-link portal tokens | `token, insurer_id, expires_at, used_at` |
| `sp_insurer_review_tokens` | Per-order review tokens | `token, order_id, expires_at` |
| `sp_insurer_products` | Products per insurer | `insurer_id, product_type, base_premium` |
| `sp_b2b_submissions` | B2B corporate applications | `company_name, product_type, status` |
| `sp_b2b_quotes` | Insurer quotes for B2B | `submission_id, premium_amount, status` |
| `sp_endorsements` | Mid-term policy changes | `order_id, type, status` |
| `sp_renewals` | Policy renewal tracking | `original_order_id, reminder_sent_at` |
| `sp_life_applications` | Life insurance applications | `applicant info, beneficiaries, status` |
| `sp_coin_ledger` | Agent gamification points | `agent_id, coins, type` |

### 3.3 PostgreSQL Functions (SECURITY DEFINER)

```sql
credit_agent_wallet(agent_id, amount, description)    -- commission credit
request_withdrawal_deduct(agent_id, amount, ...)      -- atomic balance check + deduct
credit_override_commission(agent_id, amount, ...)     -- upline override
get_wallet_balance(agent_id)                          -- read balance
```

### 3.4 Edge Functions

| Function | Trigger | Purpose |
|----------|---------|---------|
| `create-xendit-invoice` | Browser (agent/customer) | Create Xendit VA/QRIS invoice |
| `xendit-webhook` | Xendit server | Handle payment status, credit wallet |
| `xendit-disburse` | Admin action | Trigger agent withdrawal payout |
| `ai-proxy` | Browser (HealthChat) | Proxy OpenRouter LLM calls |
| `ai-policy-review` | Admin action | Claude risk assessment per order |
| `ai-finance-review` | Admin action | Claude P&L analysis |
| `ocr-scan` | Browser (wizard) | Google Vision KTP/STNK OCR |
| `send-insurer-email` | Admin / system | Resend email to insurer |
| `send-otp` | Browser (auth) | Send SMS OTP |
| `verify-otp` | Browser (auth) | Verify SMS OTP |
| `submit-policy-insurer` | InsuranceReviewPage | Insurer submits review decision |
| `notify-admin` | Various | Send Telegram/admin notification |
| `backup-daily` | Cron (00:00 WIB) | DB backup to storage |
| `generate-daily-renungan` | Cron (06:00 WIB) | Daily devotional content |

---

## 4. Android App

- **Package:** `com.myinsurepath.os`
- **Build tool:** Android Studio + Capacitor CLI
- **OAuth redirect:** `com.myinsurepath.os://auth-callback` (registered in `AndroidManifest.xml`)
- **Min SDK:** 26 (Android 8.0)
- **Target SDK:** 34 (Android 14)
- **Signing:** `surepath-release.jks` (store in secure vault, never commit)

---

## 5. Deployment

### 5.1 Vercel
- **Project:** `prj_MLYVdGeboOTxAO5s0Xf2cwLDGohu`
- **Custom domain:** `myinsurepath.com`
- **Auto-deploy:** on push to `main` branch
- **Vercel.json:** all paths rewritten to `/index.html`
- **Build command:** `npm run build`
- **Output:** `dist/`

### 5.2 Environment Variables (Vercel)
```
VITE_SUPABASE_URL          (currently hardcoded in service — migrate to env)
VITE_SUPABASE_ANON_KEY     (currently hardcoded in service — migrate to env)
VITE_ADMIN_KEY             (admin bypass key — never hardcode)
```

### 5.3 Supabase Edge Function Secrets
```
RESEND_API_KEY             (email sending)
XENDIT_API_KEY             (via Vault)
XENDIT_WEBHOOK_TOKEN       (via Vault)
GOOGLE_VISION_API_KEY      (via Vault)
OPENROUTER_API_KEY         (via Vault)
SUPABASE_SERVICE_ROLE_KEY  (auto-injected by Supabase runtime)
```

---

## 6. Performance Targets

| Metric | Target | Measurement |
|--------|--------|-------------|
| LCP (4G Android) | < 2.5s | WebPageTest |
| TTI (midrange Android) | < 4s | Lighthouse |
| Supabase query p99 | < 200ms | Supabase Logs |
| Edge function cold start | < 1s | Supabase Logs |
| Vite bundle (initial) | < 150 kB gzip | rollup-plugin-visualizer |
| Portal chunk | < 120 kB gzip | per-chunk analysis |

---

## 7. Known Technical Debt

| Item | Impact | Fix |
|------|--------|-----|
| `SUPABASE_ANON_KEY` hardcoded | Low (anon key is public by design) | Migrate to `VITE_SUPABASE_ANON_KEY` env var for best practice |
| `db.ts` (Dexie/IndexedDB) still imported | Bundle bloat | Remove unused Dexie import |
| `server.ts` Express server | Not used in production (Vercel SPA) | Remove or mark as dev-only |
| No Supabase realtime subscriptions | Admin must reload to see updates | Add `supabase.channel()` for notifications |
| Capacitor app not published to Play Store | Android distribution blocked | Complete Play Store listing |
| No end-to-end tests | Regression risk | Playwright test suite |
