# SurePath — Complete Project Reference

> OJK-licensed Indonesian insurtech platform. Motor vehicle insurance (CAR + MOTORCYCLE), personal accident, travel, and custom products. Multi-channel: direct client, agent-submitted, and admin-managed.

---

## 1. Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19 + TypeScript + Vite (SPA) |
| Styling | Tailwind CSS via CDN (`https://cdn.tailwindcss.com`), `darkMode: 'class'`, `primary-500=#f97316` (orange), `brand-500=#10b981` (emerald) |
| Backend | Supabase (PostgreSQL + Auth + Storage + Edge Functions + Realtime) |
| Local DB | Dexie (IndexedDB) — used for demo users, offline products, CMS config |
| Payments | Xendit (invoices, virtual accounts, QRIS, e-wallets, credit cards) |
| AI Survey | Google Gemini API (vehicle photo analysis, condition scoring) |
| AI Admin | Claude (`claude-sonnet-4-6`) via Supabase Edge Functions |
| Icons | lucide-react (via npm) |
| PDF | jsPDF (for policy document generation) |
| Deployment | Vercel (main branch auto-deploy) |

---

## 2. Environment Variables

### Frontend (`.env`)
```
VITE_SUPABASE_URL=https://uyjgeteelnswphyzkjwi.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGci...
VITE_GEMINI_API_KEY=AIzaSy...
```

### Supabase Edge Function Secrets (Dashboard → Settings → Edge Functions → Secrets)
```
XENDIT_SECRET_KEY=xnd_production_...
XENDIT_WEBHOOK_TOKEN=...
APP_URL=https://surepath.app
ANTHROPIC_API_KEY=sk-ant-...
```

### Xendit Dashboard Configuration
- Webhook URL: `https://uyjgeteelnswphyzkjwi.supabase.co/functions/v1/xendit-webhook`
- Header: `x-callback-token: <XENDIT_WEBHOOK_TOKEN>`

---

## 3. Repository Structure

```
surepath/
├── App.tsx                         # Root component, routing, auth gate
├── db.ts                           # Dexie (IndexedDB) schema + seeding
├── types.ts                        # Enums (Language, UserRole)
├── constants.ts                    # INSURANCE_PROVIDERS, other constants
│
├── services/
│   ├── supabaseService.ts          # All Supabase DB + Storage operations (1400+ lines)
│   ├── paymentService.ts           # Xendit invoice creation (client call to edge fn)
│   ├── geminiService.ts            # Vehicle photo AI analysis
│   ├── ojkRates.ts                 # OJK-compliant premium calculation
│   ├── vehicleDatabase.ts          # Car brand/model/price lookup
│   └── authService.ts              # Local auth (hashPassword, verifyPassword)
│
├── components/
│   ├── admin/
│   │   ├── AdminPortal.tsx         # Admin shell, sidebar, router
│   │   ├── AdminViews.tsx          # BizAdmin, Reports, Inventory, Security, etc.
│   │   ├── PolicyOrdersAdmin.tsx   # Order queue, review links, admin notifications
│   │   ├── AIAdminView.tsx         # Claude AI policy review agent
│   │   ├── AIFinanceView.tsx       # Claude AI finance analysis agent
│   │   ├── FinancialAdmin.tsx      # Financial dashboards
│   │   ├── CommissionLedger.tsx    # Commission tracking
│   │   ├── InsurerAdmin.tsx        # Insurer company management
│   │   ├── ProductConfigAdmin.tsx  # Product commission/coin config
│   │   ├── VehiclePricelistAdmin.tsx # Vehicle price database management
│   │   └── WebsiteEditorAdmin.tsx  # CMS: per-section content + background editor
│   │
│   ├── agent/
│   │   ├── AgentPortal.tsx         # Agent shell, tabs
│   │   ├── VehicleUnderwritingWizard.tsx # 7-step motor underwriting
│   │   ├── AgentQuoteBuilder.tsx   # Manual quote builder (non-OJK products)
│   │   └── ...
│   │
│   ├── car-wizard/                 # Client-side car insurance wizard
│   ├── InsuranceReviewPage.tsx     # Public insurer review page (/review/:token)
│   ├── CarInsuranceWizard.tsx      # Client-facing car insurance flow
│   ├── AuthGate.tsx                # Login/register UI
│   ├── PortalHero.tsx              # Logged-in customer home hero
│   └── PaymentRedirect.tsx         # Post-payment landing page
│
├── src/pages/
│   └── PlatformLanding.tsx         # Public marketing website (1600+ lines)
│
└── supabase/
    └── functions/
        ├── create-xendit-invoice/  # Creates Xendit payment invoice
        ├── xendit-webhook/         # Handles Xendit payment callbacks
        ├── ai-policy-review/       # Claude AI policy underwriting agent
        └── ai-finance-review/      # Claude AI finance analysis agent
```

---

## 4. User Roles

| Role | Access | Description |
|---|---|---|
| `MASTER_ADMIN` | Full access to all admin features | System owner |
| `ADMIN` | Policy orders, agents, users, products, insurers | Operations admin |
| `FINANCE` | Transactions, commissions, financial reports, AI finance | Finance controller |
| `INSURANCE_ADMIN` | Policy orders, claims queue, AI admin | Insurer-side admin |
| `AGENT` | Agent portal: underwriting wizard, quotes, wallet, clients | Sales agent |
| `CUSTOMER` | Client portal: buy, claim, wallet, profile | End customer |

### Demo Credentials
| Email | Password | Role |
|---|---|---|
| master@surepath.ai | admin | MASTER_ADMIN |
| finance@surepath.ai | admin | FINANCE |
| user@surepath.ai | user | CUSTOMER |
| agent@surepath.ai | user | AGENT |

---

## 5. Database Schema (Supabase — `public` schema)

### Core Tables

#### `sp_users`
Agent and admin user profiles, synced from Supabase Auth.
- `id` (uuid), `email`, `name`, `phone`, `role`, `agent_code`, `status`, `coins_balance`

#### `sp_policy_orders`
Central order table — every insurance submission flows through here.
- `id` (uuid), `order_number`, `agent_id` → `sp_users`
- `client_name`, `client_phone`, `client_ktp`
- `product_code`, `product_name`, `vehicle_type` (CAR/MOTORCYCLE)
- `vehicle_details` (JSONB: make, model, year, plate, chassis, engine, color, usage, province)
- `vehicle_image_url` — Supabase Storage URL
- `ai_score`, `ai_verdict`, `ai_findings` (JSONB) — from Gemini survey
- `ai_admin_recommendation`, `ai_admin_confidence`, `ai_admin_risk_level`, `ai_admin_reasoning`, `ai_admin_flags` — from Claude AI agent
- `coverage_type` (COMPREHENSIVE/TLO), `sum_insured`, `zone` (1-7), `vehicle_category`
- `addons` (JSONB), `base_premium`, `addon_premium`, `admin_fee`, `stamp_duty`, `total_premium`
- `discount_rate`, `commission_rate`, `commission_amount`, `coin_reward`
- `insurer_id` → `sp_insurers`, `insurer_name`
- `status`: SUBMITTED → UNDER_REVIEW → APPROVED → ISSUED | REJECTED
- `reviewer_notes`, `reviewed_at`, `policy_number`, `policy_document_url`

#### `sp_review_tokens`
One-time review links for insurers.
- `id` (uuid), `token` (uuid, unique), `order_id` → `sp_policy_orders`
- `expires_at` (7 days from creation), `accessed_count`, `last_accessed_at`
- `insurer_action` (APPROVED/REJECTED), `insurer_notes`, `actioned_at`
- `review_url` — full URL cached for quick display

#### `sp_payments`
Xendit payment tracking.
- `id`, `order_id`, `external_id`, `xendit_invoice_id`, `invoice_url`
- `amount`, `currency` (IDR), `status` (PENDING/PAID/EXPIRED/FAILED)
- `payment_method`, `payment_channel`, `paid_amount`, `paid_at`, `payer_email`
- `xendit_payload` (full Xendit webhook JSON)

#### `sp_commissions`
Agent commission records per order.
- `agent_id`, `order_id`, `premium_amount`, `commission_amount`, `discount_rate`, `coin_reward`
- `status` (PENDING/PAID/CANCELLED)

#### `sp_coin_ledger`
Coin earn/redeem history per agent.
- `agent_id`, `type` (EARNED/REDEEMED/ADJUSTED), `coins`, `rp_value` (coins × 1000 IDR)

#### `sp_notifications`
In-app notifications for agents.
- `agent_id`, `type`, `title`, `body`, `read`, `metadata` (JSONB)

#### `sp_admin_notifications`
Admin broadcast notifications (payment confirmations, new orders, AI alerts).
- `type`, `title`, `body`, `order_id`, `review_url`, `read`, `metadata`

#### `sp_insurers`
Insurance company partners.
- `id`, `code`, `name`, `is_active`, `contact_email`, `contact_whatsapp`, `contact_pic`

#### `sp_insurer_products`
Per-insurer product terms (commission rates, OJK compliance, age limits).
- `insurer_id`, `product_type`, `vehicle_coverage`, `base_commission_rate`, `max_discount_rate`, `coin_rate`, `stamp_duty`, `policy_cost`

#### `sp_product_configs`
Platform-level product commission configuration.
- `product_code`, `base_commission_rate`, `max_discount_rate`, `coin_rate`

#### `sp_vehicle_overrides`
Admin-managed vehicle price database (brand, model, year → market value).
- `brand`, `model`, `ref_year`, `list_price_m` (in millions IDR), `market_value_rp`, `discount_rate`

#### `sp_claims`
Insurance claims submitted by clients.
- `order_id`, `client_id`, `description`, `photos`, `status`, `estimated_amount`, `approved_amount`

#### `websiteConfig` (Dexie local)
CMS configuration for the public landing page, stored in IndexedDB.
- `sectionKey` (hero/marquee/products/claims/stats/testimonials/footer)
- `headline`, `subtitle`, `ctaText`, `bgType`, `bgValue`, `isVisible`

---

## 6. Complete E2E Order Flow

```
AGENT PORTAL (VehicleUnderwritingWizard)
├── Step 1: Select vehicle type (CAR / MOTORCYCLE)
├── Step 2: Select or create client (name, phone, KTP)
├── Step 3: Vehicle details (make, model, year, plate, VIN, engine, color, usage)
├── Step 4: Coverage selection (province, sum insured, type, add-ons, insurer)
├── Step 5: AI vehicle survey (upload photo → Gemini analysis → score/verdict)
│           ⚠ Score < 80 blocks progression (configurable)
├── Step 6: Premium calculation + discount config + commission preview
└── Step 7 (auto): ORDER SUBMITTED
    ├── createPolicyOrder() → sp_policy_orders (status: SUBMITTED)
    ├── uploadVehicleImage() → Supabase Storage (vehicle-images bucket)
    ├── autoSendReviewLink() → sp_review_tokens (token generated, 7-day expiry)
    │   ├── Creates sp_admin_notifications with review_url
    │   └── Returns review URL shown to agent with Copy + WhatsApp buttons
    └── addNotification() → sp_notifications (agent notified)

        ↓

AGENT: "Bayar Premi Sekarang"
    └── createXenditInvoice() edge function
        ├── Creates Xendit invoice (24hr expiry, VA + QRIS + E-wallet + CC)
        ├── Inserts sp_payments (status: PENDING)
        └── Opens invoice_url in new tab → CLIENT PAYS

        ↓ (Xendit callback)

XENDIT WEBHOOK (xendit-webhook edge function)
    ├── Verifies x-callback-token
    ├── Updates sp_payments (status: PAID, payment details)
    ├── Advances sp_policy_orders: SUBMITTED → UNDER_REVIEW
    ├── Auto-creates review token (if not exists) → review_url
    ├── Creates sp_admin_notifications (payment confirmed + review_url)
    ├── Notifies agent via sp_notifications
    └── On EXPIRED: notifies agent that invoice expired

        ↓

ADMIN DASHBOARD (PolicyOrdersAdmin)
    ├── Views admin notification inbox → sees review_url
    ├── Copies link or sends via WhatsApp to insurer
    └── Alternatively: generates new link from order detail modal

        ↓

INSURER (InsuranceReviewPage at /review/:token)
    ├── Token validated (7-day expiry, accessed_count tracked)
    ├── Views: client data, vehicle data, photos, AI score, premium breakdown
    ├── Downloads CSV export (client + vehicle data)
    ├── Selects: APPROVE or REJECT (with notes)
    └── Submits → updates sp_review_tokens + sp_policy_orders (APPROVED/REJECTED)

        ↓

ADMIN PORTAL (PolicyOrdersAdmin — APPROVED orders)
    ├── Sees order in APPROVED queue
    ├── Uploads policy PDF → Supabase Storage (policy-documents bucket)
    └── System:
        ├── Advances order: APPROVED → ISSUED
        ├── Generates policy_number (SP-{PRODUCT}-{timestamp})
        ├── Stores policy_document_url
        ├── addCommission() → sp_commissions (PENDING)
        ├── awardCoins() → sp_coin_ledger
        ├── Notifies agent (policy issued + commission earned)
        └── Agent can download and send policy PDF to client
```

---

## 7. Insurer Review Link System

Every order gets a unique, one-time review link:

- **URL format**: `https://surepath.app/review/{uuid-token}`
- **Expiry**: 7 days from token creation
- **Access**: No login required — token is the credential
- **Auto-generated** when order is submitted AND when payment is confirmed
- **Contents visible to insurer**:
  - Client full name, phone, KTP
  - Complete vehicle data (make, model, year, plate, VIN, engine, color, usage, province, zone)
  - Vehicle photo (if uploaded)
  - AI survey score + findings
  - Full premium breakdown with OJK rate
  - Add-ons list
- **Actions available**:
  - Download CSV (client + vehicle data)
  - Approve with notes → marks order APPROVED
  - Reject with mandatory notes → marks order REJECTED
- **Token security**: UUID v4, not guessable; access count logged; expires automatically

---

## 8. AI Agent System

### AI Admin Agent (`/admin → AI Admin Agent`)
**Purpose**: Automated policy underwriting assistant
**Roles with access**: MASTER_ADMIN, ADMIN, INSURANCE_ADMIN
**Edge function**: `supabase/functions/ai-policy-review/index.ts`
**Claude model**: `claude-sonnet-4-6`

**What it does**:
1. Analyzes pending (SUBMITTED / UNDER_REVIEW) orders
2. Evaluates: vehicle age & type, client data completeness, AI survey score, zone risk, coverage vs sum insured, OJK rate, add-ons
3. Returns: `recommendation` (APPROVE/REJECT/REQUEST_INFO), `confidence` (0-100), `risk_level`, `reasoning` (Indonesian), `flags`, `suggested_notes`
4. Persists analysis to `sp_policy_orders.ai_admin_*` columns
5. Auto-Apply mode: if confidence ≥ threshold (default 90%), applies decision automatically

**Usage**:
- Click "Analisis" on individual order, or
- "Analisis Semua" to batch-analyze pending queue
- Toggle "Auto-Apply" with confidence threshold

### AI Finance Agent (`/admin → AI Finance Agent`)
**Purpose**: Intelligent financial analysis and anomaly detection
**Roles with access**: MASTER_ADMIN, FINANCE
**Edge function**: `supabase/functions/ai-finance-review/index.ts`
**Claude model**: `claude-sonnet-4-6`

**What it analyzes**:
- GWP (Gross Written Premium) by period
- Commission ratios (target: < 25% of GWP)
- Claim ratios (target: < 70% of GWP)
- Payment method distribution
- Agent commission outliers
- Large transactions (> 50M IDR single payment)
- Order status funnel
- Net revenue position

**Output**:
- Health score (0-100)
- Summary metrics (GWP, commissions, claims, net revenue)
- Anomalies with severity (LOW/MEDIUM/HIGH/CRITICAL)
- Prioritized recommendations
- Narrative analysis (Indonesian)
- Critical alerts

**Configurable periods**: 7, 14, 30, 60, 90 days

---

## 9. Payment Gateway (Xendit)

### Setup Steps
1. Create Xendit account at dashboard.xendit.co
2. Get API keys (production: Settings → API Keys)
3. Set `XENDIT_SECRET_KEY` in Supabase Secrets
4. Configure webhook in Xendit Dashboard:
   - URL: `https://uyjgeteelnswphyzkjwi.supabase.co/functions/v1/xendit-webhook`
   - Token: your chosen `XENDIT_WEBHOOK_TOKEN` (also set in Supabase Secrets)
   - Events: Invoice paid, Invoice expired
5. Set `APP_URL` to your Vercel deployment URL

### Payment Methods Enabled
- Virtual Account (BCA, Mandiri, BNI, BRI, Permata)
- QRIS
- E-Wallet (OVO, DANA, LinkAja, ShopeePay)
- Credit/Debit Card (Visa, Mastercard)

### Invoice Lifecycle
```
Created (PENDING, 24hr expiry) 
  → Client pays → Xendit fires webhook (PAID)
  → Order: SUBMITTED → UNDER_REVIEW
  → Admin notified with review link

OR

Created → Expires (24hr) → Xendit fires webhook (EXPIRED)
  → Agent notified to create new invoice
```

---

## 10. Deployed Edge Functions

| Function | Trigger | Purpose |
|---|---|---|
| `create-xendit-invoice` | Agent clicks "Bayar Premi" | Creates Xendit invoice, stores in sp_payments |
| `xendit-webhook` | Xendit payment callback (POST) | Updates payment status, advances order, generates review token, notifies parties |
| `ai-policy-review` | Admin AI agent dashboard | Claude-powered policy underwriting analysis |
| `ai-finance-review` | Admin AI finance dashboard | Claude-powered financial analysis |

### Deploying Edge Functions
```bash
# Install Supabase CLI
npm install -g supabase

# Login
supabase login

# Deploy all functions
supabase functions deploy create-xendit-invoice --project-ref uyjgeteelnswphyzkjwi
supabase functions deploy xendit-webhook --project-ref uyjgeteelnswphyzkjwi
supabase functions deploy ai-policy-review --project-ref uyjgeteelnswphyzkjwi
supabase functions deploy ai-finance-review --project-ref uyjgeteelnswphyzkjwi

# Set secrets
supabase secrets set XENDIT_SECRET_KEY=xnd_production_... --project-ref uyjgeteelnswphyzkjwi
supabase secrets set XENDIT_WEBHOOK_TOKEN=... --project-ref uyjgeteelnswphyzkjwi
supabase secrets set APP_URL=https://surepath.app --project-ref uyjgeteelnswphyzkjwi
supabase secrets set ANTHROPIC_API_KEY=sk-ant-... --project-ref uyjgeteelnswphyzkjwi
```

---

## 11. Key Service Functions (`services/supabaseService.ts`)

### Policy Orders
| Function | Description |
|---|---|
| `createPolicyOrder(data)` | Insert new order → SUBMITTED |
| `getAllOrders()` | Admin: fetch all orders |
| `getAgentOrders(agentId)` | Agent: fetch own orders |
| `updateOrderStatus(id, status, extras)` | Update order status + reviewer_notes / policy_number / policy_document_url |

### Review Tokens
| Function | Description |
|---|---|
| `createReviewToken(orderId, createdBy?)` | Generate UUID token, 7-day expiry |
| `getOrderByToken(token)` | Validate token, fetch order, increment access count |
| `submitInsurerReview(tokenId, orderId, action, notes)` | Write insurer decision |
| `autoSendReviewLink(orderId, orderNumber, clientName)` | Create token + admin notification |

### AI Agents
| Function | Description |
|---|---|
| `runAIPolicyReview(orderId)` | Call ai-policy-review edge fn, persist result |
| `runAIFinanceReview(periodDays)` | Call ai-finance-review edge fn |

### Admin Notifications
| Function | Description |
|---|---|
| `createAdminNotification(data)` | Insert into sp_admin_notifications |
| `getAdminNotifications(unreadOnly?)` | Fetch admin inbox |
| `markAdminNotificationRead(id)` | Mark as read |

### Agent/Finance
| Function | Description |
|---|---|
| `addCommission(data)` | Record commission for agent |
| `awardCoins(agentId, coins, orderId, desc)` | Award coins + update balance |
| `getAgentCoinBalance(agentId)` | Sum coin ledger |
| `getAdminStats()` | Dashboard summary (orders, GWP, agents, commissions) |
| `uploadVehicleImage(file, orderId)` | Upload to vehicle-images bucket |
| `uploadPolicyDocument(file, orderNumber)` | Upload to policy-documents bucket |

---

## 12. OJK Rate Compliance (`services/ojkRates.ts`)

All premium calculations follow OJK Circular Letter (SEOJK) No. 6/SEOJK.05/2017 for motor vehicle insurance.

### Zone Classification
| Zone | Provinces |
|---|---|
| 1 | Sumatera (excl. Kepri, Riau Islands) |
| 2 | Kepulauan Riau, Bangka Belitung |
| 3 | DKI Jakarta, Banten |
| 4 | Jawa Barat (excl. Kota Depok, Bogor, Bekasi, Tangerang) |
| 5 | Jawa Tengah, Yogyakarta |
| 6 | Jawa Timur |
| 7 | Bali, Nusa Tenggara, Kalimantan, Sulawesi, Maluku, Papua |

### Vehicle Categories
- Category 1: < 125cc motorcycles
- Category 2: 125-250cc motorcycles  
- Category 3: > 250cc motorcycles + cars ≤ 1500cc
- Category 4: Cars 1500-3000cc
- Category 5: Cars > 3000cc

---

## 13. Frontend Routing (`App.tsx`)

```
/ (root)                     → PlatformLanding (marketing site, not logged in)
/payment/success             → PaymentRedirect (status: success)
/payment/failed              → PaymentRedirect (status: failed)
/review/{uuid}               → InsuranceReviewPage (public, no login)
→ if role = MASTER_ADMIN/ADMIN/FINANCE/INSURANCE_ADMIN: AdminPortal
→ if role = AGENT:           AgentPortal
→ if not logged in + appMode: AuthGate
→ if logged in = CUSTOMER:   Customer portal (home/products/claim/wallet/profile)
```

---

## 14. CMS (Website Editor)

The public landing page (`PlatformLanding.tsx`) reads from Dexie `websiteConfig` table on mount. Admins edit via Admin Portal → Editor Website.

**Editable sections**: hero, marquee, products, claims, stats, testimonials, footer

**Per section**: headline, subtitle, CTA text, background type (animated-mesh / gradient / solid / image / none), visibility toggle

**Animated background**: 6-orb Lissajous canvas animation (violet, indigo, emerald, orange, pink, cyan), opacity adaptive for dark/light mode

---

## 15. Security Notes

### Current Status
- ✅ RLS enabled on all Supabase tables
- ✅ Edge function secrets (Xendit keys, Anthropic key) not exposed to frontend
- ✅ Review tokens use UUID v4 (128-bit entropy, not guessable)
- ✅ Token expiry enforced server-side
- ✅ Xendit webhook token verification
- ✅ Storage buckets: vehicle-images and policy-documents (Supabase Storage)

### Known Gaps / To Harden
- ⚠ JWT tokens in `authService.ts` are Base64-encoded, not cryptographically signed — use Supabase Auth JWT for production
- ⚠ Local Dexie DB stores all demo users — not suitable for production customer data
- ⚠ `SUPABASE_ANON_KEY` is public by design (Supabase standard) — RLS is the security layer
- ⚠ AI edge functions should rate-limit requests (add per-IP or per-user limiting)
- ⚠ Review tokens should be invalidated after insurer action (currently remain valid until expiry)

---

## 16. Development Workflow

```bash
# Install deps
npm install

# Dev server
npm run dev

# TypeScript check (strict: noUnusedLocals + noUnusedParameters)
npx tsc --noEmit

# Build
npm run build
```

### Git Branches
- `main` → auto-deploys to Vercel
- `claude/insurtech-mobile-app-RvOFd` → development branch, merged into main

### Deploy Edge Functions (after code changes)
```bash
cd supabase/functions/ai-policy-review
supabase functions deploy ai-policy-review --project-ref uyjgeteelnswphyzkjwi
```

---

## 17. Pending / Roadmap

### High Priority
- [ ] Deploy edge functions to Supabase (`supabase functions deploy ...`)
- [ ] Set `ANTHROPIC_API_KEY` in Supabase Secrets (required for AI agents)
- [ ] Set `XENDIT_SECRET_KEY` and `XENDIT_WEBHOOK_TOKEN` (required for live payments)
- [ ] Configure Xendit webhook URL in Xendit Dashboard
- [ ] Email notifications to clients (Resend or SendGrid integration)
- [ ] SMS/WhatsApp notifications via Fonnte or Twilio

### Medium Priority  
- [ ] Policy PDF auto-generation (jsPDF template with policy details)
- [ ] Client portal payment (wire client CarInsuranceWizard to Xendit)
- [ ] Commission payout workflow (admin approves → PENDING → PAID)
- [ ] Claims management with photo upload
- [ ] Renewal reminders (Supabase cron jobs)

### Future
- [ ] Multi-insurer comparison engine
- [ ] Blockchain policy hash registry
- [ ] Mobile app (React Native)
- [ ] B2B API for corporate fleet insurance

---

## 18. Supabase Project

- **Project ID**: `uyjgeteelnswphyzkjwi`
- **Region**: ap-southeast-1 (Singapore)
- **DB Host**: `db.uyjgeteelnswphyzkjwi.supabase.co`
- **Postgres**: 17.6.1 (engine 17)
- **Status**: ACTIVE_HEALTHY

---

*Last updated: May 2026 | SurePath Insurance Platform*
