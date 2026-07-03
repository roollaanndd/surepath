# SurePath — Changelog

---

## v1.12.0 — 2026-07-03

### Auth & Login Experience Overhaul
- **AuthGate redesigned** — dark aurora replaced with the app's light emerald-glass theme: ambient wash, sp-glass card, official logo, gradient CTA; all aux screens (check-email, forgot, OTP, reset) rethemed
- **Google on register** — "Daftar dengan Google" now on the Register tab (was sign-in only); OTP/magic-link stays on sign-in
- **Login success screen modernized** — new AppEntryScreen: light theme, official logo in glass tile with expanding success rings, draw-in check badge, emerald confetti burst, personalized greeting; faster (1.95s vs 2.3s)
- **AdminLogin rethemed** — near-black hacker style replaced with the same light emerald-glass language; official logo replaces generic shield icon
- **Admin CMS shell harmonized** — root/sidebar/header/notification surfaces now emerald-tinted glass (dark variant of the same design family; light variant aligned to #f6faf7)

---

## v1.11.0 — 2026-07-03

### Official Brand Assets + PWA Hardening + Creative UI
- **Official logo everywhere** — uploaded brand shield + wordmark converted to all sizes: pwa-192/512, maskable-512 (62% safe zone), apple-touch-icon 180, favicon-32/64 PNG, logo.png (in-app headers via SurePathLogo), logo-full.png, og-image 1200×630, play-store-icon
- **PWA hardened** — explicit `registerSW({ immediate: true })` in entry (was relying on auto-injected script only); brand favicons linked in index.html
- **Version badge visible in apps** — v{APP_VERSION} chip in Customer and Agent portal headers (was only on website navbar)
- **New creative loading animation** — floating official logo with ground shadow, winding SurePath 'path' being drawn with traveling dot (offset-path), rising leaf particles, light theme
- **Illustrative onboarding scenes** — 6 hand-built animated vector illustrations (protection umbrella, photo-claim with AI scan, human support, quote doc, commission coins, network nodes) replacing icon-orbit composition
- **Custom menu icons** — bottom navs of both portals now use mascot-motif Bot icons (Home, Shield, ClaimCam, Policy, Wallet, User)
- **Card design refined** — emerald-tinted glass gradient, branded borders (emerald-100/emerald glow on hover), layered depth shadows, warmer dark variant

---

## v1.10.0 — 2026-07-02

### World-Class App Refine (Gojek-grade, 4 phases — auto-deployed per phase)
- **Phase 1 — Animated loading + brand icons**: PortalLoader rebuilt (mascot shield, pulse rings, orbiting dot, ambient wash, sequenced dots); 7 new mascot-motif icons (BotWallet, BotCoin, BotPolicy, BotClaimCam, BotAgent, BotHome, BotChart)
- **Phase 2 — Illustrated onboarding**: fullscreen role-aware tour (3 slides nasabah, 3 slides agen) with floating hero badge + satellite icons, glass bottom card, progress dots, skip, safe-area, reduced-motion; wired to first-run via SP_ONBOARDED_<role>
- **Phase 3 — Quotation PDF rebrand**: emerald palette (was orange/navy), vector shield logo, 'Tarif OJK' transparency row (rate % + band), emerald notes box, myinsurepath.com footer
- **Phase 4 — CMS alignment**: 'Onboarding Apps' section in Website Editor (admin can toggle tour visibility platform-wide via sp_website_config); OnboardingFlow honors is_visible kill-switch

---

## v1.9.1 — 2026-07-02

### Mobile App UI — Glassmorphism Refine
- **True glass surfaces** — new `sp-glass` / `sp-glass-strong` utilities: backdrop blur + saturation, inset edge-refraction highlight, emerald-tinted shadows, full light/dark variants
- **Uniform across portals** — identical glass treatment for Customer and Agent apps (cards, headers, bottom navs)
- **Ambient emerald wash** — fixed radial gradient backdrop (`sp-ambient`) behind content so glass has depth to refract
- **41 surfaces converted** — CustomerPortal, AgentHome, AgentPortal chrome, AgentWallet, AgentCommission, AgentProfile, AgentCRM, AgentNetwork, AgentLeaderboard, OrderDetailSheet (bottom sheet now frosted over dimmed backdrop)
- Empty-state dashed cards intentionally kept flat for contrast

---

## v1.9.0 — 2026-07-02

### OJK Rate Engine (SEOJK No. 6/SEOJK.05/2017 — 100% accuracy)
- **Base rates corrected** — all COMP/TLO MIN/MID/MAX tables in `services/ojkRates.ts` now exact per Tabel IV.A (TLO was inverted; Cat 4/5 COMP too high; motorcycle rates wrong)
- **Motorcycle TLO zone-dependent** — W1 1.94%, W2 1.98%, W3 0.74% (was flat 0.65%)
- **Perluasan corrected per Tabel IV.B** — SRCC & Terorisme: COMP 0.05% / TLO 0.035% (was 0.07% flat); TPL now progressive (1% / 0.5% / 0.25% tiers); terrorism add-on added
- **Rate band selection** — `rate_band` (MIN/MID/MAX) column in `sp_product_configs`; three-way selector in ProductConfigAdmin; public calculator shows all three bands (Batas Bawah / Tengah / Atas)
- **Single source of truth** — `constants.ts getOJKRate()` now derives from `services/ojkRates.ts`

### Full Platform Audit Fixes
- **CRITICAL: AgentQuoteBuilder crash fixed** — `CAR_DATABASE` was referenced but never imported (ReferenceError when agent edits year on car quote)
- **CRITICAL: ProductAIExplainer crash fixed** — read nonexistent `data.benefits` (correct: `neuralBenefits`); crashed on render
- **Admin: backup date fixed** — read `createdAt` instead of `created_at`; showed "Invalid Date"
- **Admin: withdrawal disburse button fixed** — redundant condition made the button logic unreachable for APPROVED status
- **@types/react installed** — React 19 type definitions were missing entirely; surfaced 24 latent type errors, all fixed
- **Lint green** — `tsc --noEmit` now passes with 0 errors (was 79)
- **Security: internal PDFs removed from public/** — HANDOVER.pdf, MASTERMIND.pdf, PANDUAN_IT_SUREPATH.pdf were publicly downloadable
- **Dead code removed** — `CarInsuranceWizard1.tsx`, `ui/signin-page.tsx` (never imported)
- **Version aligned** — package.json + `src/version.ts` bumped to 1.9.0 (were stuck at 1.8.0 while CHANGELOG said 1.8.4)
- **Type safety** — `SpPolicyOrder.coverage_type` widened for CUSTOM/MPAR/PA/TRAVEL/LIFE wizards; `SpUser` B2B company fields typed; quote types include MOTORCYCLE

---

## v1.8.4 — 2026-06-15

### Fixes (Agent Portal)
- **AgentWallet wired** — `AgentWalletView` added as `wallet` case in `AgentPortal` renderTab; previously orphaned and unreachable
- **Withdraw button fixed** — `handleWithdraw` in `AgentCommission` now navigates to wallet tab via `onNavigate` prop instead of showing a fake success toast
- **CANCELLED status in order list** — Added `CANCELLED` to `STATUS_META` and filter tabs in `AgentOrderStatus`
- **Order load error handling** — `useEffect` in `AgentOrderStatus` now catches errors; loading spinner no longer hangs on failure

---

## v1.8.3 — 2026-06-15

### Fixes (Admin UX)
- **Approvals for ADMIN role** — "Antrean Polis" menu now accessible to `ADMIN` role (was `MASTER_ADMIN` + `INSURANCE_ADMIN` only)
- **CANCELLED order status** — Added `CANCELLED` to `SpPolicyOrder['status']` type; `STATUS_META` and filter tabs in `PolicyOrdersAdmin` now render cancelled orders correctly instead of crashing
- **Dashboard stats auto-refresh** — `adminStats` + `transaksiStats` now refresh every 2 minutes automatically; manual Refresh button added to Dashboard header
- **User list refresh** — Refresh button added to `UserManagementView` so newly registered users appear without full page reload

---

## v1.8.2 — 2026-06-14

### New Features
- **Order history refetch** — Submissions now appear instantly after wizard completion; history tab auto-refreshes; manual refresh button (spinning `RefreshCw`) added
- **Order detail sheet** — Tap any policy card in history → bottom-sheet with status timeline, vehicle/coverage/premium breakdown, AI survey result, cancel/resubmit actions
- **Cancel pending submission** — Customer can cancel `SUBMITTED`/`UNDER_REVIEW` orders; server-side ownership check (`cancel_my_order` gateway); `CANCELLED` status shown in history
- **Resubmit flow** — "Ubah & Ajukan Ulang" cancels current order and routes back to buy wizard
- **Profile: Display Size** — `AccessibilitySettings` component: pick Kecil/Normal/Besar (0.9×/1.0×/1.15×), persists to localStorage, applies as `html { font-size }` for rem-based scaling
- **Manual dark mode only** — Dark mode no longer auto-switches by time or system preference; all portals (Customer, Agent) read/write `sp_dark_mode` localStorage key

### Fixes
- **Status bar white** — `theme_color` and `<meta name="theme-color">` changed to `#ffffff`; mobile status bar now white/neutral
- **Navbar pill UX** — Active tab uses soft pill (`bg-emerald-50`, `rounded-full`, `scale-[1.08]`, `-translate-y-0.5`); inactive = `text-gray-400`; z-index `z-[1000]`
- **Wizard step indicator** — Replaced dot-connector bar with segmented pill track; gradient fill on completed segments; glow on active; label + "Langkah X/N" below
- **Animation utilities** — `animate-fade-in`, `animate-slide-up`, `animate-scale-in` keyframes in `styles.css`
- **cancel_my_order** gateway action added + `cancelMyOrder` service fn + `CANCELLED` status in `SpPolicyOrder` type

---

## v1.8.1 — 2026-06-14

### New Features
- **Banner image upload** — Admin can upload image as promo banner background; `PromoBanner` renders image with gradient overlay when set; text-only emerald fallback when no image
- **PWA update notification** — `AppUpdateNotification` toast (bottom-right, emerald border) appears on SW `controllerchange`; user-triggered reload via "Muat ulang" button
- **PWA icons rebuilt** — White background (`#FFFFFF`), emerald shield fills 78% canvas; all 4 sizes regenerated (`pwa-192x192`, `pwa-512x512`, `pwa-maskable-512`, `apple-touch-icon`)

---

## v1.8.0 — 2026-06-14

### New Features
- **Version badge** — `v1.8.0` chip displayed in Navbar; `src/version.ts` exports `APP_VERSION` constant
- **Admin-managed promo banner** — `PromoBanner` component fetches `promo_banner` from `sp_website_config`, shows emerald gradient banner with slide-down animation, dismissible (persists via localStorage). Visible in customer portal and agent home.
- **Promo Banner admin UI** — New `PromoBannerAdmin` sub-component in `WebsiteEditorAdmin`: set headline/subtitle, toggle visibility, live preview, save via `upsertWebsiteSection`

### Refactors
- **App.tsx modularized** — 1108 → 411 lines. Extracted:
  - `src/routes/splash.tsx` (407 lines) — splash screen, entry screen, mascot, keyframe CSS, i18n copy
  - `src/routes/PortalErrorBoundary.tsx` (31 lines) — portal error boundary class component

---

## v1.7.x — 2026-06-13

### Features
- **Agent home redesign** — premium single-focal commission hero, staggered motion entrance, Lucide icons replacing emoji
- **Admin dashboard data fix** — replaced IndexedDB reads with Supabase (`callGateway`) for ledger, user list, and approvals views
- **Admin approvals page** — working approve/reject flow via `updateOrderStatus()` with reviewer notes
- **Car wizard Step 5 AI survey** — photo upload → AI scoring → result panel for CLEAN/MANUAL_REQUIRED/REVIEW_REQUIRED/REJECTED verdicts
- **Payment gate** — wizard step 6 (payment) locked until AI/admin approval; SUBMITTED policies routed to approval queue
- **Insurer comparison step** — provider cards with authorized garage, claim speed, benefits badges; animated selection
- **Max discount = max commission** — `BASE_COMMISSION_PERCENT` (25%) caps discount slider in StepCoverage
- **PWA fixes** — zoom lock, overscroll-none, install prompt chip, iOS Add-to-Home-Screen hint, localStorage TC caching
- **Ecosystem brand token alignment** — orange primary → emerald across all components

### Docs
- `docs/APP_FLOWCHART.md` — full auth/customer/agent/admin/B2B flow (441 lines) + flow-issue audit
