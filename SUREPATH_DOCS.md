# SurePath — Platform Documentation
> myinsurepath.com · Insurtech Indonesia · OJK Licensed

---

## Table of Contents

1. [Overview](#overview)
2. [Live URLs](#live-urls)
3. [Tech Stack](#tech-stack)
4. [Architecture](#architecture)
5. [User Roles & Portals](#user-roles--portals)
6. [Features by Role](#features-by-role)
7. [Insurance Products](#insurance-products)
8. [AI & Automation](#ai--automation)
9. [Database (Dexie / IndexedDB)](#database-dexie--indexeddb)
10. [Supabase Backend](#supabase-backend)
11. [Authentication Flow](#authentication-flow)
12. [Environment Variables](#environment-variables)
13. [Routing](#routing)
14. [Pages & Components](#pages--components)
15. [PWA & Mobile](#pwa--mobile)
16. [Payment Flow](#payment-flow)
17. [PDF & Documents](#pdf--documents)
18. [Admin Controls](#admin-controls)
19. [Deployment](#deployment)
20. [Pending / TODO](#pending--todo)

---

## Overview

SurePath is a **digital insurance platform (insurtech)** built for the Indonesian market. It connects customers, licensed insurance agents, and admin staff on a single web application — delivered as a Progressive Web App (PWA) installable on any device.

**Core value propositions:**
- Buy insurance in minutes via mobile
- File claims with phone photos (AI-powered damage assessment)
- Agent network management with digital CRM
- Real-time financial reporting for admin/finance teams

---

## Live URLs

| Environment | URL |
|-------------|-----|
| Production | https://myinsurepath.com |
| Vercel Project | `prj_MLYVdGeboOTxAO5s0Xf2cwLDGohu` |
| Vercel Team | `team_afNqJ8H0darvhUlxlzTjzrjm` |
| Supabase Dashboard | Project `uyjgeteelnswphyzkjwi` (ap-southeast-1 / Singapore) |

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19 + TypeScript |
| Styling | Tailwind CSS (CDN config) + inline styles |
| Fonts | Sora, Inter, JetBrains Mono (Google Fonts) |
| 3D Hero | Spline (`@splinetool/react-spline`) |
| Icons | Lucide React |
| Local DB | Dexie.js (IndexedDB wrapper) |
| Backend / Auth | Supabase (PostgreSQL + Auth + Storage) |
| AI / Vision | OpenRouter API (openai-compatible SDK) |
| PDF Generation | jsPDF |
| Animations | CSS keyframes + Tailwind |
| Mobile | Capacitor (`@capacitor/android`) |
| Build | Vite + PWA plugin |
| Hosting | Vercel |
| Branch | `claude/insurtech-mobile-app-RvOFd` → merges to `main` |

---

## Architecture

```
Browser / Mobile (PWA)
       │
       ▼
   React SPA (App.tsx)
       │
   ┌───┴──────────────────────────────────────┐
   │         Routing (window.history)          │
   │  /          → PlatformLanding             │
   │  /admin     → AdminLogin → AdminPortal    │
   │  /product/* → ProductInfoPage             │
   │  /about etc → StaticInfoPage              │
   │  /payment/* → PaymentRedirect             │
   │  /review/*  → InsuranceReviewPage         │
   │  (auth)     → CustomerPortal / AgentPortal│
   └───────────────────────────────────────────┘
       │
   ┌───┴──────────────┐   ┌──────────────────┐
   │   Dexie (local)  │   │  Supabase (cloud) │
   │  - users/admin   │   │  - sp_users       │
   │  - products      │   │  - orders         │
   │  - websiteConfig │   │  - claims         │
   │  - agents        │   │  - Storage bucket │
   └──────────────────┘   └──────────────────┘
                                  │
                          ┌───────┴───────┐
                          │  OpenRouter   │
                          │  (AI API)     │
                          │ gpt-4o-mini   │
                          │ claude-haiku  │
                          └───────────────┘
```

---

## User Roles & Portals

| Role | Portal | Access |
|------|--------|--------|
| `MASTER_ADMIN` | AdminPortal | Full system access, all views |
| `ADMIN` | AdminPortal | Policy, customers, products |
| `FINANCE` | AdminPortal | Financial reports, ledger |
| `FINANCE_MANAGER` | AdminPortal | Financial reports, ledger |
| `FINANCE_DIRECTOR` | AdminPortal | Financial reports, ledger |
| `INSURANCE_ADMIN` | AdminPortal | Insurer management |
| `AGENT` | AgentPortal | CRM, quotes, commissions |
| `CUSTOMER` | CustomerPortal | Buy products, file claims |
| `B2B_CLIENT` | CustomerPortal | Buy products, file claims |
| Public | PlatformLanding | Info pages, sign-up/login |

**Admin credentials** are stored in Dexie (IndexedDB), seeded via `seedDatabase()`.  
Password is hashed with **PBKDF2-HMAC-SHA256**. Set via `VITE_ADMIN_KEY` env var.  
**Default admin email:** `master@surepath.ai`

**Customer / Agent credentials** are managed by Supabase Auth.

---

## Features by Role

### Customer Portal
- View active insurance policies
- Buy new insurance (Car, Travel, PA, Property, Health)
- File claims with photo upload and AI damage analysis
- Health chat bot (AI medical assistant)
- Policy PDF download
- User profile management

### Agent Portal
- Agent home dashboard with stats
- CRM — manage customer leads and accounts
- Quote builder for customers
- Order status tracking
- Commission ledger and wallet
- Claims management
- Renewal alerts
- Leaderboard
- Onboarding flow for new agents

### Admin Portal
- **Dark mode default** — all 27 views wired
- **Notification Bell** — in-app alerts via `sp_admin_notifications` table
- **Dashboard** — overall KPIs
- **Policy Orders** — view, manage, download all orders
- **Products** — configure insurance products, pricing
- **Customers** — customer list and details; `UserDetailModal` for agents + customers
- **Financial Reports** — P&L, transaction ledger, yearly summaries
- **Insurer Management** — partner insurer list
- **AI Views** — AI-powered financial analysis
- **Website Editor** — edit landing page content (hero, sections, splash)
- **Vehicle Pricelist** — manage 2025 vehicle prices (40+ brands, 2000+ models)
- **Commission Ledger** — agent commission tracking

**Demo accounts (password `Demo1234!` for all):**
| Email | Role |
|-------|------|
| `demo.customer@myinsurepath.com` | CUSTOMER |
| `demo.agent@myinsurepath.com` | AGENT |
| `demo.admin@myinsurepath.com` | ADMIN |

---

## Insurance Products

| Product | ID | Key Feature |
|---------|----|-------------|
| Asuransi Kendaraan | `car` | AI photo claim, 500+ bengkel rekanan |
| Asuransi Perjalanan | `travel` | Auto-claim flight delay, USD 100k medical |
| Kecelakaan Diri | `pa` | 60-second signup, 24/7 global coverage |
| Proteksi Barang | `property` | Gadget/electronics, photo claim |
| Kesehatan Keluarga | `health` | 3000+ cashless hospitals, AI health bot |

Each product has a dedicated info page at `/product/<id>` (e.g., `/product/car`).

**Buying Flow (Car as example):**
1. `CarInsuranceWizard` — multi-step wizard
2. Step: KTP upload (OCR via AI)
3. Step: STNK upload (OCR extracts plate, brand, year, VIN)
4. Step: Vehicle survey (5 photos, AI underwriting)
5. Step: Coverage selection
6. Step: KYC / identity confirmation
7. Step: Payment
8. Policy PDF generated and stored

---

## AI & Automation

All AI calls go through **OpenRouter** (`https://openrouter.ai/api/v1`) using the `openai` SDK.

### Models Used

| Task | Model |
|------|-------|
| OCR — STNK, KTP, receipts | `openai/gpt-4o-mini` |
| Vehicle photo validation | `openai/gpt-4o-mini` |
| Vehicle survey / underwriting | `openai/gpt-4o-mini` |
| Product explanation | `anthropic/claude-3.5-haiku-20241022` |
| Health chatbot | `anthropic/claude-3.5-haiku-20241022` |

### AI Functions (`services/geminiService.ts`)

| Function | Purpose |
|----------|---------|
| `extractKtpData` | OCR Indonesian KTP — name, NIK, address |
| `extractStnkData` | OCR STNK — plate, brand, model, VIN, engine no. |
| `validateVehiclePhoto` | Check photo quality and correctness per slot |
| `analyzeVehicleSurvey` | Multi-photo underwriting risk assessment |
| `analyzeClaimPhoto` | Damage analysis — cost estimate per part |
| `analyzeHealthReceipt` | Medical receipt OCR and validation |
| `summarizeClaimDocument` | Claim document key-point extraction |
| `explainProductAI` | AI-generated product explanation in ID/EN |

### Health Chat Bot (`components/HealthChat.tsx`)
- Always-on AI medical assistant
- System prompt guides it to Indonesian health context
- Reminds users: AI is not a medical diagnosis
- Bilingual (ID / EN)

---

## Push Notifications

Notifications fire **inline from the `data-gateway` Edge Function** (v8) — no separate worker needed.

### Triggers
| Event | Channels |
|-------|---------|
| New customer registration | Telegram + Resend email |
| New policy order (`sp_policy_orders`) | Telegram + Resend email |

### Channels
| Channel | Secret | Notes |
|---------|--------|-------|
| Telegram | `TELEGRAM_BOT_TOKEN`, `TELEGRAM_ADMIN_CHAT_ID` | Bot posts to admin group |
| Email | `RESEND_API_KEY` | HTML emails via Resend |

### Edge Functions (Supabase)
| Function | Version | Purpose |
|----------|---------|---------|
| `data-gateway` | v8 | Primary API gateway; fires Telegram + Resend inline |
| `notify-admin` | current | Watches `sp_policy_orders` inserts (not `sp_policies`) |
| `send-insurer-email` | current | Admin-triggered HTML emails to insurers via Resend |

All secrets are stored as **Supabase Edge Function Secrets** (not in `.env`):
`TELEGRAM_BOT_TOKEN`, `TELEGRAM_ADMIN_CHAT_ID`, `RESEND_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ANON_KEY`

---

## Database (Dexie / IndexedDB)

Defined in `db.ts`. Stores local data client-side.

### Tables

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

### Password Hashing
- Algorithm: **PBKDF2-HMAC-SHA256**
- 100,000 iterations, 32-byte key
- Per-user salt (random 16 bytes)
- Implemented in `services/authService.ts`

---

## Supabase Backend

- **Project:** `uyjgeteelnswphyzkjwi`
- **Region:** `ap-southeast-1` (Singapore / AWS)
- **URL:** `https://uyjgeteelnswphyzkjwi.supabase.co`

### Tables

| Table | Purpose |
|-------|---------|
| `sp_users` | Customer and agent Supabase profiles |
| `sp_policy_orders` | Policy purchase orders |
| `sp_insurers` | Partner insurer records (`admin_email`, `admin_name`, `pic_name`, `pic_phone`; `pic_email` migration pending) |
| `sp_admin_notifications` | In-app notification records for admin users |
| (auth.users) | Supabase built-in auth (email + password) |

### RLS
- 17 scoped policies in production
- `is_admin()` SECURITY DEFINER helper function gates admin-only access

### Storage
- `website-assets` bucket — logo images, section background images uploaded via admin

### Key Services (`services/supabaseService.ts`)
- `getAgentByEmail(email)` — look up agent by email
- `uploadLogoImage(file)` — upload logo to storage
- `uploadSectionImage(file)` — upload section backgrounds

---

## Authentication Flow

### Customer / Agent Login
1. User enters email + password on `AuthGate`
2. Calls `supabase.auth.signInWithPassword()`
3. On success: upsert to `sp_users` table, call `onAuthSuccess`
4. `App.tsx` persists session to `sessionStorage` (key: `SUREPATH_SESSION`)
5. Role determines which portal renders

### Admin Login
1. Navigate to `/admin` → `AdminLogin` renders
2. Email + password submitted → Dexie lookup
3. Role checked against `[MASTER_ADMIN, ADMIN, FINANCE, FINANCE_MANAGER, FINANCE_DIRECTOR, INSURANCE_ADMIN]`
4. Password verified with PBKDF2
5. Session token created via `createSessionToken()`

### Session Persistence
- Stored in `sessionStorage` (cleared on tab close)
- Or `localStorage` for "remember me" (persists across sessions)
- Key: `SUREPATH_SESSION`

---

## Environment Variables

Set in Vercel Dashboard → Project Settings → Environment Variables.  
Locally: `.env.local` (gitignored).

| Variable | Purpose | Required |
|----------|---------|----------|
| `VITE_ADMIN_KEY` | Master admin password (hashed on first seed) | Yes |
| `VITE_OPENROUTER_KEY` | OpenRouter API key for all AI features | Yes |
| `VITE_SUPABASE_URL` | Supabase project URL | Auto from db.ts |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon/public key | Auto from db.ts |

> **Security note:** `VITE_ADMIN_KEY` is hashed via PBKDF2 before storage — never stored in plaintext. If not set, admin accounts are seeded with a random UUID (inaccessible).

---

## Routing

SPA routing via `window.history.pushState` + React state (`currentPath`).

| Path | Component | Auth Required |
|------|-----------|---------------|
| `/` | `PlatformLanding` | No |
| `/admin` | `AdminLogin` → `AdminPortal` | Admin |
| `/product/car` | `ProductInfoPage` | No |
| `/product/travel` | `ProductInfoPage` | No |
| `/product/pa` | `ProductInfoPage` | No |
| `/product/property` | `ProductInfoPage` | No |
| `/product/health` | `ProductInfoPage` | No |
| `/about` | `StaticInfoPage` | No |
| `/careers` | `StaticInfoPage` | No |
| `/blog` | `StaticInfoPage` | No |
| `/agents` | `StaticInfoPage` | No |
| `/partnership` | `StaticInfoPage` | No |
| `/privacy` | `StaticInfoPage` | No |
| `/terms` | `StaticInfoPage` | No |
| `/security` | `StaticInfoPage` | No |
| `/cookie` | `StaticInfoPage` | No |
| `/payment/success` | `PaymentRedirect` | No |
| `/payment/failed` | `PaymentRedirect` | No |
| `/review/:uuid` | `InsuranceReviewPage` | No (token-based) |

All paths rewrite to `index.html` via `vercel.json`.

---

## Pages & Components

### Landing Page (`src/pages/PlatformLanding.tsx`)
- 3D Spline hero scene (decorative, `pointer-events-none`)
- Sticky navbar with language toggle (ID / EN)
- Promo banners (rotating carousel)
- Products grid → navigates to product info pages
- How It Works section
- Pillars / Values section
- Testimonials
- CTA section
- Footer with full navigation links
- PWA install popup + install modal (iOS, Android, Desktop instructions)

### Product Info Pages (`src/pages/ProductInfoPage.tsx`)
- Full product details: description, features, coverage, pricing
- "Beli Sekarang" CTA → redirects to sign-in flow
- Dark green branded design matching landing page

### Static Info Pages (`src/pages/StaticInfoPage.tsx`)
- About, Careers, Blog, Agent Program, Partnership
- Privacy Policy, Terms & Conditions, Data Security, Cookie Policy
- Section-based card layout

### Key Wizards
| Wizard | File |
|--------|------|
| Car Insurance | `CarInsuranceWizard.tsx` / `CarInsuranceWizard1.tsx` |
| Travel Insurance | `TravelInsuranceWizard.tsx` |
| Personal Accident | `PAInsuranceWizard.tsx` |
| Property/Gadget | `MPARInsuranceWizard.tsx` |
| Custom Products | `CustomInsuranceWizard.tsx` |

### Claim Management
- `ClaimManager.tsx` — customer claim filing (photo upload, AI analysis)
- `AgentClaims.tsx` — agent-side claim handling

---

## PWA & Mobile

### PWA Setup
- Service worker generated by `vite-plugin-pwa`
- `manifest.json` in `/public`
- `vercel.json` rewrites all routes to `index.html`
- Installable on iOS, Android, Desktop Chrome/Edge

### Install Flow
1. Chrome/Android: `beforeinstallprompt` → one-tap install button
2. iOS Safari: Manual "Add to Home Screen" — modal shows step-by-step instructions
3. Desktop: Address bar install icon + modal instructions
4. Install modal triggered by "Download Mobile App" button in promo banners

### Native Mobile (Capacitor)
- `@capacitor/android` installed
- `capacitor.config.ts` configured
- Android APK build possible via `npx cap build android`
- **Status:** Web-first PWA is primary delivery; native app build not yet published

---

## Payment Flow

1. User completes insurance wizard
2. Payment initiated via `services/paymentService.ts`
3. External payment gateway redirect
4. On return: `/payment/success` or `/payment/failed`
5. `PaymentRedirect` component handles confirmation display
6. Policy created in Dexie + Supabase on success

---

## PDF & Documents

- `services/pdfService.ts` — generates policy PDFs using `jsPDF`
- Policy PDF includes: insured name, vehicle details, policy number, coverage, premium
- Download triggered from CustomerPortal, AgentPortal, AdminPortal
- `InsuranceReviewPage` — external shareable review link (`/review/:uuid`)
  - Allows insurers or customers to review order details via token

---

## Admin Controls

### Website Editor
- Located in AdminPortal → Website Editor tab
- Editable sections: hero headline, hero subtext, CTA text
- Background image upload per section
- Splash screen logo and tagline customization
- Changes stored in Dexie `websiteConfig` table

### Product Management
- Create/edit/deactivate custom insurance products
- Set pricing tiers, coverage limits, exclusions
- Custom products appear in customer product selector

### Vehicle Pricelist
- 2025 Halalins MV4 dataset — 40+ brands, 2000+ models
- Admin can update market values
- Used by car insurance wizard for TSI (Total Sum Insured) calculation

---

## Deployment

### Vercel (Automatic)
Pushing to `main` triggers an automatic production deployment.

```
git push origin main
```

### Manual Deploy
Use Vercel MCP tool or Vercel dashboard → Deployments → Redeploy.

### Environment Variables (must be set in Vercel)
```
VITE_ADMIN_KEY         = <master admin password>
VITE_OPENROUTER_KEY    = <openrouter api key>
```

### Branch Strategy
- `main` → Production (`myinsurepath.com`)
- `claude/insurtech-mobile-app-RvOFd` → Feature development branch

---

## Pending / TODO

### High Priority
- [ ] **Tighten Supabase RLS** — current policy is fully open (`qual = true`)
- [ ] **VITE_ADMIN_KEY in Vercel** — must be set or admin login won't work
- [ ] **VITE_OPENROUTER_KEY in Vercel** — must be set or all AI features fail
- [ ] **OpenRouter key domain restriction** — remove domain allowlist in OpenRouter dashboard, or add `myinsurepath.com`

### Features
- [ ] **www subdomain** — add `www.myinsurepath.com` in Vercel Settings → Domains
- [ ] **Blog content** — `/blog` page shows categories but no real articles yet
- [ ] **Real social media links** — Instagram/LinkedIn/Twitter URLs are placeholders
- [ ] **Payment gateway integration** — `paymentService.ts` needs live gateway credentials
- [x] **Push notifications** — Telegram + Resend fire inline from `data-gateway` v8
- [ ] **Agent onboarding email flow** — currently manual
- [ ] **Supabase claims table** — verify schema matches `ClaimManager` component

### Tech Debt
- [ ] **Firebase files** — `firebase.ts`, `firebase-blueprint.json` remain but Firebase is not used (replaced by Supabase); safe to remove
- [ ] **DesktopLanding.tsx / DesktopWebsite.tsx** — legacy components, verify if still used
- [ ] **LoginModal.tsx** — legacy, verify if still used vs AuthGate
- [ ] **Native Android APK** — Capacitor config exists but APK not built/published

### Performance
- [ ] Spline 3D bundle is 2MB — consider replacing with CSS/canvas fallback on mobile
- [ ] Code split `CustomerPortal` and `AgentPortal` further (246KB and 306KB chunks)

---

## Key File Map

```
surepath/
├── App.tsx                          # Root — routing, auth state
├── db.ts                            # Dexie schema + seedDatabase()
├── types.ts                         # Shared TypeScript types + enums
├── index.tsx                        # React entry point
├── index.html                       # HTML shell, Tailwind CDN, importmap
├── vite.config.ts                   # Vite + PWA plugin config
├── vercel.json                      # SPA rewrite rules
├── .env.local                       # Local secrets (gitignored)
│
├── src/pages/
│   ├── PlatformLanding.tsx          # Public landing page
│   ├── ProductInfoPage.tsx          # /product/:id info pages
│   └── StaticInfoPage.tsx           # /about, /careers, etc.
│
├── components/
│   ├── AuthGate.tsx                 # Customer/agent login + register
│   ├── HealthChat.tsx               # AI health chatbot
│   ├── ClaimManager.tsx             # Claim filing UI
│   ├── CarInsuranceWizard.tsx       # Car buying flow
│   ├── TravelInsuranceWizard.tsx    # Travel buying flow
│   ├── PAInsuranceWizard.tsx        # Personal accident flow
│   ├── MPARInsuranceWizard.tsx      # Property/gadget flow
│   ├── PaymentRedirect.tsx          # /payment/success|failed
│   ├── InsuranceReviewPage.tsx      # /review/:uuid
│   ├── admin/
│   │   ├── AdminPortal.tsx          # Admin shell + tab routing
│   │   ├── AdminLogin.tsx           # Admin login (Dexie auth)
│   │   ├── AdminViews.tsx           # Customers, orders views
│   │   ├── PolicyOrdersAdmin.tsx    # Order management
│   │   ├── FinancialAdmin.tsx       # Financial reports
│   │   ├── ProductConfigAdmin.tsx   # Product management
│   │   └── WebsiteEditorAdmin.tsx   # CMS editor
│   ├── agent/
│   │   ├── AgentPortal.tsx          # Agent shell + tab routing
│   │   ├── AgentCRM.tsx             # Customer CRM
│   │   ├── AgentQuoteBuilder.tsx    # Quote tool
│   │   └── AgentCommission.tsx      # Commission tracker
│   └── customer/
│       └── CustomerPortal.tsx       # Customer shell
│
└── services/
    ├── geminiService.ts             # All AI functions (OpenRouter)
    ├── supabaseService.ts           # Supabase helpers
    ├── authService.ts               # PBKDF2 password hashing
    ├── paymentService.ts            # Payment gateway
    ├── pdfService.ts                # Policy PDF generation
    ├── ojkRates.ts                  # OJK insurance rate tables
    └── vehicleDatabase.ts           # 2025 vehicle pricelist
```

---

*Last updated: June 2026 · SurePath Engineering*
