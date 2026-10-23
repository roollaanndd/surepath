# SurePath App Revamp — Execution Brief & Master Prompt

**Status:** IN PROGRESS — specification and implementation record
**Owner approval:** User-approved direction from prior SurePath UI/UX revamp discussions; portal scope widened to four portals on 2026-10-23 at the owner's request
**Last updated:** 2026-10-23
**Related specification:** [DESIGN_SYSTEM.md](./DESIGN_SYSTEM.md)
**Source-level audit:** [UI_UX_AUDIT_2026-10-13.md](./UI_UX_AUDIT_2026-10-13.md)
**Shared CSS pass:** [CROSS_PORTAL_VISUAL_MODERNIZATION.md](./CROSS_PORTAL_VISUAL_MODERNIZATION.md)

> **Important status note:** This document is the source of truth for the approved target and execution tracking. A design proposal, CSS foundation, preview deployment, or a successful HTTP response does **not** mean the full revamp is complete. Work merged so far on Agent Home, Wallet, CRM and Commission is incremental polish; it does not satisfy the complete redesign described here.

---

## 0. Portal scope

The revamp covers **four portals**, as recorded by the owner: Customer (*Nasabah*), Agent (*Mitra*), Operator, and the Admin CMS dashboard.

| Portal | Route | In scope | Notes |
|---|---|---|---|
| Customer (*Nasabah*) | `/custapp` | ✅ Yes | Mobile-first; the primary consumer surface |
| Agent (*Mitra*) | `/agapps` | ✅ Yes | Mobile-first; 40% of agents are mobile-only |
| Operator | `/operatorapp` | ✅ Yes | Work-queue surface; already fully card-based |
| Admin CMS | `/admin` | ✅ Yes | **Desktop-first**, data-dense, with a mobile drawer fallback |
| Insurer | `/insurerapp` | ⛔ Not in this programme | Inherits the shared foundation (S1–S4) only |
| B2B | `/b2bapp` | ⛔ Not in this programme | Inherits the shared foundation (S1–S4) only |
| Public marketing site | `/` | ⛔ Explicitly excluded | Unchanged; see the cross-portal CSS doc |

**Insurer and B2B are deliberately out of scope** for screen-level redesign, but they consume the same shared primitives, so foundation work (S1–S4) must not regress them. Any shared-primitive change is verified against all six portals.

**Mobile-first is not universal.** Customer, Agent and Operator are mobile-first. The Admin CMS is a desktop-first data tool — its target is legibility and density at desktop widths with a usable mobile drawer, not a phone-shaped dashboard. Do not force phone layout idioms onto the CMS.

---

## 1. Approved product and visual direction

Build a visibly new, cohesive SurePath app experience—not a cosmetic CSS-only pass.

- **Brand:** SurePath; retain approved logo and app icon assets. Do not replace them with generic symbols.
- **Visual language:** premium, modern, calm, enterprise-ready insurtech.
- **Palette:** dark forest green, emerald, restrained lime gradient; neutral white/soft-gray surfaces. Orange may only be used as a restrained secondary accent where it already belongs in the current design system.
- **Typography:** clear hierarchy using the existing supported font stack (Sora/Inter or equivalent already bundled). Avoid inconsistent weights and tiny labels.
- **Surfaces:** intentional spacing, consistent radius, clear card hierarchy, subtle shadows and restrained glass effects. Avoid excessive gradients, excessive glassmorphism, clutter, and decorative effects that reduce readability.
- **Navigation:** predictable, thumb-friendly mobile navigation with clear active state and no scroll-jump or unexpected return-to-top behavior.
- **Motion:** purposeful short transitions, meaningful loading/success feedback, tasteful animation only where it improves comprehension. Respect `prefers-reduced-motion`.
- **Responsive behavior:** design mobile-first for Customer, Agent and Operator, then tablet/desktop. The Admin CMS is designed desktop-first and verified down to mobile. No clipped cards, horizontal overflow, overlapping fixed navigation, or inaccessible forms on narrow phones.
- **Accessibility:** visible focus, semantic labels, readable contrast, keyboard access, and minimum 44×44px touch targets.
- **Operational surfaces (Operator, Admin):** work comes before decoration. Queue state, ownership, age/SLA, exceptions and reconciliation differences outrank vanity metrics. Destructive and financial actions require confirmation and carry audit context.

## 2. Master prompt for implementation

Use this prompt as the standing instruction for every implementation session and coding agent:

> You are the senior product designer and frontend engineer responsible for completing the approved SurePath App Revamp in the `roollaanndd/surepath` repository.
>
> Read `docs/DESIGN_SYSTEM.md` and `docs/APP_REVAMP_EXECUTION.md` before changing code. Audit the actual current implementation and compare it against the approved target. Implement the revamp screen-by-screen in real components; do not stop after adding global CSS, class names, a proposal, screenshots, or a checklist.
>
> Deliver a coherent, visibly upgraded product experience across the Customer App, Agent App, Operator portal and Admin CMS: home/dashboard, onboarding/auth where in scope, navigation, quote/purchase flows, client CRM, policies, claims, commissions/wallet, performance, work queues, verification and approval screens, configuration surfaces, notifications, profile, and relevant empty/loading/error states. Reuse shared components and approved brand assets. Make responsive behavior and interactions intentional. Customer, Agent and Operator are mobile-first; the Admin CMS is desktop-first with a verified mobile fallback.
>
> Preserve all existing business behavior: Supabase authentication and authorization, database schema/RLS, API contracts, premium and commission calculations, OJK rating rules, policy/claim/wallet/withdrawal transaction semantics, tiered withdrawal approval, payment flows, route behavior, and role permissions. Do not fake data or replace real functionality with static mockups. If a required behavior is broken or ambiguous, document it and isolate the fix rather than silently changing business rules.
>
> Shared primitives are consumed by all six portals, including Insurer and B2B which are out of scope for redesign. Any change to a shared primitive must be verified not to regress them.
>
> Work in small reviewable branches/PRs. For each screen, inspect the existing component and data flow first, implement the actual screen, run available lint/type/build/tests, inspect the Vercel preview, and test responsive layouts and key interactions. Fix failures before merge. Merge only when preview/build checks pass and the diff is safe. Verify the resulting production deployment and domain after merge.
>
> Maintain this execution document as work progresses. Update the screen checklist and log each PR, commit, deployment URL/status, tests run, known limitations, and verification evidence. Never mark an item complete based only on code being committed or a deployment returning HTTP 200. Never claim end-to-end or on-device PWA validation unless it was actually performed.
>
> **Definition of done:** the screen visibly matches the target direction, works at narrow/mobile and desktop widths, preserves its real data and business behavior, passes relevant checks, has a successful preview, is merged/deployed where approved, and has recorded verification evidence.

## 3. Screen-by-screen acceptance checklist

Mark an item **DONE** only after implementation and verification—not when it is merely planned or styled in a shared stylesheet.

### Shared foundation

- [ ] **S1 — Brand and design tokens:** verify actual logo/icon assets, color tokens, typography, spacing, surfaces, shadows, focus states, dark mode, and reduced motion. *(Partial, v2.6.10: dark mode now has a single owner, `components/shared/theme.ts`, and `components/ui/**` is hex-free and locked by an ESLint rule. The remaining ~1.008 hardcoded hex values outside that directory, the typography floor and the radius scale are open.)*
- [ ] **S2 — Shared UI primitives:** consistent buttons, inputs, badges, cards, skeletons, empty/error states, dialogs/bottom sheets, and status feedback. `components/ui/EmptyState.tsx` exists but is still unused — adopt it or remove it. *(Partial, v2.6.10: the duplicate `Button` and the unused `GlassCard` in `components/shared/UI.tsx` are gone, so `components/ui/` is the only primitive layer with a `Button`. Adoption across the 827 raw `<button>` elements has not started.)*
- [x] **S3a — Scroll position on in-portal navigation:** switching views returns the surface to the top in all six portals, honoring `prefers-reduced-motion`. Shared primitive `components/shared/scrollReset.ts`; 5 unit tests; shipped v2.6.9. *(See execution log 2026-10-23.)*
- [ ] **S3b — Remaining navigation behavior:** active states, safe-area padding, no content hidden behind fixed navigation, correct browser back/forward behavior, and no scroll reset during polling/realtime re-renders (the Admin sidebar case was fixed in PR #243 — the content area and the other portals still need the same check).
- [ ] **S4 — Responsive and accessibility pass:** narrow phone (320–380px), standard phone, tablet/desktop; keyboard focus, contrast, touch targets, reduced motion.

### Customer App (*Nasabah*)

- [ ] **C1 — Authentication/onboarding:** polished login/register/onboarding, clear validation and loading/error feedback; preserve auth behavior.
- [ ] **C2 — Home/dashboard:** clear protection/status summary, prioritized actions, policies/activity, purposeful visual hierarchy and animation.
- [ ] **C3 — Insurance product discovery:** coherent product cards, icons, coverage explanation, premium/eligibility clarity.
- [ ] **C4 — Quote/purchase wizard:** consistent stepper, form UX, review/confirmation, payment handoff and error recovery; calculations unchanged.
- [ ] **C5 — Policy wallet and details:** readable policy status, coverage, documents, renewal actions and transaction history.
- [ ] **C6 — Claims:** submit, upload, timeline/status, details and empty/error states; existing claim semantics preserved.
- [ ] **C7 — Protection score / activity:** modern, understandable score visualization and history; no misleading data or decorative generic people icons.
- [ ] **C8 — Profile, notifications and settings:** consistent screen structure, unread states and accessible controls.

### Agent App (*Mitra*)

- [ ] **A1 — Home/dashboard:** actionable KPI hierarchy, quick actions, recent clients/commissions, charts only where backed by real data.
- [ ] **A2 — Quote builder:** polished client/product/vehicle steps, validation, premium breakdown, review and sharing/purchase handoff.
- [ ] **A3 — Client CRM:** search/filter, client list/detail, add/edit/delete confirmation, policy association and clear empty/loading/error states.
- [ ] **A4 — Commission:** earned/pending/paid breakdown, trends and product filters with correct existing calculations. Show pending, approved and available-to-withdraw separately; never present unsettled amounts as withdrawable. "Total Withdrawn" is currently hardcoded to 0 and must be wired to real wallet data.
- [ ] **A5 — Wallet/withdrawal:** available balance, withdrawal history, bank account, confirmation/error states and approval semantics preserved.
- [ ] **A6 — Policies and order status:** clear status progression, details and next actions.
- [ ] **A7 — Claims:** understandable submission and status tracking, with existing data flow intact.
- [ ] **A8 — Performance/leaderboard:** legible charts and rank context based on actual values.
- [ ] **A9 — Notifications:** category filters, unread indicator, mark-read behavior and useful empty states.
- [ ] **A10 — Profile/network/renewals/endorsements:** consistent layout and working navigation/actions across these secondary screens.

### Operator portal

Nine components, ~2,600 lines, `components/operator/`. The portal is already **fully card-based (zero `<table>` elements)**, so it degrades well on narrow screens; the work here is hierarchy, queue clarity and state feedback rather than responsive rescue.

- [ ] **O1 — Sign-in (`OperatorLogin.tsx`):** polished sign-in with readable validation and loading/error feedback; authentication behavior unchanged.
- [ ] **O2 — Dashboard / work queue (`OperatorDashboard.tsx`):** one actionable queue with clear status, owner, age and next step ahead of any summary metric.
- [ ] **O3 — Orders queue (`OperatorOrders.tsx`, 594 lines — the largest surface):** status progression, filters/search usable on mobile, unsaved notes preserved when changing views, document previews minimized to what the task requires.
- [ ] **O4 — Claims (`OperatorClaims.tsx`):** triage clarity, decision vs. document-issuance states kept visually distinct, notes required where the workflow requires them.
- [ ] **O5 — Agent verification (`OperatorAgents.tsx`):** verification state, required documents, approve/reject with confirmation and audit context; PII minimized.
- [ ] **O6 — Withdrawals (`OperatorWithdrawals.tsx`):** money path — tiered approval semantics (<10jt L1, ≥10jt +L2, ≥25jt +L3) preserved exactly; approval actions visually distinct and confirmed.
- [ ] **O7 — Notifications and profile (`OperatorNotifications.tsx`, `OperatorProfile.tsx`):** unread state, useful empty states, consistent secondary-screen layout.

### Admin CMS dashboard

Twenty-six components, ~14,000 lines, `components/admin/`. **Desktop-first.** Tables are already wrapped for horizontal scrolling in most views (19 `<table>` vs 21 `overflow-x-auto`); verify the remainder rather than assuming.

- [ ] **D1 — Shell and navigation (`AdminPortal.tsx`):** sidebar grouping and active state, header, mobile drawer, and scroll behavior. Sidebar scroll preservation during polling landed in PR #243; content-area scroll reset on navigation landed in v2.6.9. Remaining: role-gated menu grouping and drawer behavior at narrow widths.
- [ ] **D2 — Dashboard KPIs:** the KPI row, Transaksi Overview and Online Users cards — readable hierarchy, honest empty/`—` states, and drill-through that lands on the right view.
- [ ] **D3 — Operational queues (`OpsConsoleView.tsx`):** aging/SLA, exceptions and ownership ahead of vanity metrics.
- [ ] **D4 — Finance (`FinancialAdmin.tsx`, payments, commission ledger, withdrawals):** reconciliation differences and payment/withdrawal exceptions surfaced first; tiered withdrawal approval and `FINANCE_ROLES` boundaries unchanged; audit context on every financial adjustment.
- [ ] **D5 — Users and agents (`AdminViews.tsx`, 9 tables):** list density, search/filter, agent agreement state, and confirmation on destructive actions.
- [ ] **D6 — Analytics (`AnalyticsDashboard`):** legible charts with honest denominators — Claims Ratio stays `N/A` until a validated premium denominator exists. Also a performance item: this view is a ~395 kB chunk (113 kB gzipped).
- [ ] **D7 — Configuration surfaces (`OjkRateAdmin`, `VehiclePricelistAdmin`, `InsurerAdmin`, `TierPromoConfigAdmin`, `WebsiteEditorAdmin`, `PortalIconManager`):** consistent form/table patterns, validation, and save/error feedback. Rate and pricelist edits change money — confirmation and audit trail required.
- [ ] **D8 — Oversight surfaces (`SecurityDashboard`, `ActivityLogView`, `PathyTranscriptsView`, `B2BAdminView`):** load-failure and retry states (the security dashboard gained these in v2.6.6 — the rest need the same treatment), readable log density, and PII minimization in transcripts.

## 4. Engineering and safety guardrails

1. **No CSS-only completion.** Each checklist item requires component-level implementation where needed.
2. **No regression to business logic.** Keep visual changes isolated; if behavior changes are necessary, separate them into a reviewed change with explicit tests.
3. **No fake completion evidence.** A READY deployment proves deployment readiness, not that all screens or user journeys work.
4. **No broad global selectors without scope.** Prefer component-root classes and shared tokens; avoid regressions across Customer, Agent, Operator, Insurer, B2B and Admin portals.
5. **No hidden scroll bugs.** Check long pages, sticky headers, menus, modals, bottom sheets, and scroll position after state updates/navigation. Navigation *should* return to top; polling and realtime re-renders *must not* move the user.
6. **No generic icon substitutions.** Reuse approved SurePath iconography/assets; create consistent custom assets where necessary.
7. **No merge without checks.** Preview/build and available CI must pass; inspect the diff and check for conflicts first.
8. **PWA/device validation is separate.** Test install/update behavior on a real supported device before claiming the installed app is updated. A browser deployment alone is not proof.
9. **Hiding a menu item is not a security boundary.** Role-gated navigation is a usability affordance; server-side authorization in the data-gateway remains authoritative. Never move an authorization decision into the client as part of a visual change.
10. **Shared primitives are cross-portal.** A change under `components/shared/`, `components/ui/` or `src/styles/` touches Insurer and B2B too, which are out of redesign scope — verify them before merging.

## 5. Current implementation record (2026-10-23)

This record intentionally distinguishes incremental work from the full target.

| Item | Current evidence | Status |
|---|---|---|
| Design-system target | Existing `docs/DESIGN_SYSTEM.md` contains the broad UI/UX specification and roadmap for Customer and Agent only; Operator and Admin have no screen-level spec yet | SPEC PARTIAL — Operator/Admin spec is this document's §3 |
| Shared Agent visual foundation | PR #248 merged; scoped premium styling added | PARTIAL |
| Agent Home | PR #249 merged; root/section classes and home-specific responsive polish | PARTIAL — not a complete dashboard redesign |
| Agent Wallet | PR #250 merged as commit `ef6242827dfa82d18eea7b162e726b4d2dd75bf8`; production deployment ID `dpl_5S85RVCn3LpQUeS5Z8WEvWcmEkfF` observed READY with `myinsurepath.com` alias | DEPLOYED — limited visual polish only |
| Agent CRM + Commission | PR #251 merged 2026-10-23 as squash commit `32989632997cb919f5986781c4551a4cb7c2f738`; all 9 checks passed on head `0a188ff`. Diff was 2 class-name additions plus 38 CSS lines | MERGED — limited visual polish only, not an A3/A4 redesign |
| Cross-portal scroll reset (S3a) | `components/shared/scrollReset.ts` + 6 portal call sites; 5 unit tests; v2.6.9 | **DONE** — see execution log |
| Customer App full redesign | No completion evidence recorded in this workstream | NOT VERIFIED / NOT COMPLETE |
| Agent Quote Builder, policies/order status, claims, performance, notifications, profile, network, renewals, endorsements | Full component-level revamp and end-to-end verification not yet recorded | NOT VERIFIED / NOT COMPLETE |
| Operator portal redesign | Source-level audit done (card-based, 0 tables, error handling present in 7/9 files). No redesign work started | NOT STARTED |
| Admin CMS redesign | Source-level audit done. Reliability fixes landed in v2.6.5/v2.6.6 (analytics accuracy, security dashboard load errors) and PR #243 (sidebar scroll). No redesign work started | NOT STARTED |
| Admin scroll-to-top issue | **Root-caused and split in two.** (a) Sidebar scroll resetting during polling: an inline `ref` callback was recreated every render, so React detached and re-attached it and re-applied `scrollTop` — fixed in PR #243 via `useCallback`. (b) Content area never returning to top on navigation: fixed in v2.6.9. Neither was resolved by Agent styling | FIXED IN CODE — browser confirmation of the owner's original report still outstanding |
| PWA installed-app update on physical device | No on-device test evidence recorded | NOT VERIFIED |

**PR references**
- [PR #248 — Agent visual foundation](https://github.com/roollaanndd/surepath/pull/248)
- [PR #249 — Agent Home polish](https://github.com/roollaanndd/surepath/pull/249)
- [PR #250 — Agent Wallet polish](https://github.com/roollaanndd/surepath/pull/250)
- [PR #251 — Agent CRM and Commission polish](https://github.com/roollaanndd/surepath/pull/251)

## 6. Execution log

Append a new entry after each meaningful implementation/verification milestone.

### 2026-10-23 — Fase 2c: a router nobody used, removed from the entry chunk

- **Scope:** `index.tsx` (the `<HashRouter>` wrapper and its import removed); `package.json` / `package-lock.json` (`react-router-dom` uninstalled); `CLAUDE.md` (a factually wrong statement corrected).
- **The find:** `index.tsx` wrapped `<App />` in `<HashRouter>`, and `grep -rn "react-router"` across the repo (excluding `node_modules/` and `dist/`) returned **that one line and nothing else**. No `Route`, no `Link`, no `useNavigate`, no `useParams` anywhere. Routing is the hand-rolled History API code in `App.tsx`, which does not need a provider. The whole library was therefore being parsed and executed by every visitor to do nothing.
- **Measured, not assumed:** the entry chunk — the one chunk everyone must download before anything renders — went from **445.6 kB raw / 141.6 kB gzip** (`index-DC6wkAQu.js`) to **421.4 kB raw / 132.8 kB gzip** (`index-ekWevY0E.js`): −24.2 kB raw, −8.8 kB gzip. That cost is paid up front on a mobile connection, before the splash screen appears.
- **No behaviour change, and this was checked before the removal rather than assumed after it.** A browser probe confirmed HashRouter was *not* rewriting URLs — no `#/` appeared on `/`, `/tentang-kami`, `/agapps` or `/admin` — so this is dead weight, not a routing bug, and the changelog says so rather than overclaiming a fix.
- **Audit finding retracted, not fixed:** "AnalyticsDashboard 395 kB needs code-splitting" is **wrong**. It is already `lazy(() => import('./AnalyticsDashboard'))` at `components/admin/AdminPortal.tsx:43`, Admin-only, and recharts is imported in exactly one file. `vite.config.ts` carries comments recording that manual chunks for recharts and jspdf were *deliberately removed*, because a manual chunk absorbs shared dependencies and forced the main entry to statically import ~240 kB on every page. Re-adding them would make the number this entry just improved worse. Recorded as a correction so the next pass does not "fix" it.
- **Checks:** `npm run lint` → tsc 0 errors, ESLint **0 errors / 33 warnings** (unchanged baseline), vitest **316 passed / 25 files**. `npm run build` → `dist/` clean check passed (132 files), PWA release check passed.
- **Functional verification:** browser-confirmed against the local dev server, **10/10**: `pathname` preserved with no hash added on `/`, `/tentang-kami`, `/produk`, `/agapps`, `/admin`, `/custapp`, `/operatorapp`; `pushState` moving the URL; Back returning to the previous path; no uncaught page errors across the sweep. **What this does not prove:** unauthenticated, all six portal paths render the same loader, so the sweep shows the app mounts and the path survives — not that each portal's own screen is correct. That still needs a login or a reachable preview URL.
- **Version:** v2.6.14 across `src/version.ts`, `package.json`, `package-lock.json` and Android (`versionCode` 27, `versionName` 2.6.14); changelog entry added.
- **Production:** merged as PR #261 (squash commit `f091c58`); production deployment `dpl_FXS83wcs9keTGcrxVTPU2GTz9iRn` observed READY with the `myinsurepath.com` alias.
- **Known gaps:** unchanged from Fase 2b — ~725 sub-11px nodes in the six portals, the radius scale, 826 raw `<button>`, 1.003 hardcoded hex outside `components/ui/`, and every C/A/O/D screen item. `myinsurepath.com` and `*.vercel.app` remain blocked by this environment's network policy.
- **Checklist:** no item moved to DONE; this is a performance and accuracy pass, not a surface pass.

### 2026-10-23 — Fase 2b: a typography floor, defined once and enforced by lint

- **Scope:** `tailwind.config.cjs` (new `2xs` size); `eslint.config.js` (a sub-11px guardrail, and a composition fix); `src/pages/FinancingPage.tsx`, `src/pages/site/siteKit.tsx`, `src/routes/RevampedSplashScreen.tsx`, `src/routes/RevampedPortalLoader.tsx`, `components/landing/ProductModules.tsx`, `components/public/EQuotationPage.tsx` (40 nodes migrated).
- **The problem:** 765 text nodes set below 11px with arbitrary values — `text-[10px]` 538, `[9px]` 213, `[8px]` 13, `[7px]` 1. Below what is comfortable on a phone, and because each node writes its own number the floor cannot be raised from one place. `text-2xs` (11px, `lineHeight: 1.45`) is that one place. Tailwind's own scale starts at `text-xs` (12px), so `2xs` sits one step below rather than pushing every caption up 20%.
- **Scoped deliberately, and this is the part worth arguing with.** Only the 40 nodes on surfaces that render **without authentication** were migrated — the marketing pages, splash screen, portal loader, e-quotation and financing pages — because those are the ones that can be opened in a browser and looked at from here. The six portals hold the remaining ~725 and need a login to see. Shipping a 725-node typography change to screens nobody has looked at risks clipped labels and broken badges in production; the per-portal passes want either a human eye or a preview URL this environment can reach. Counts by directory, for whoever picks it up: Admin 256, Agent 227, Shared 44, Operator 42, Insurer 42, Customer 35, B2B 12.
- **Deliberate carve-out:** numerals inside fixed-size count badges (`w-3.5 h-3.5` dots, `min-w-[16px] h-4` pills) stay small. They are glyphs inside a shape, not text to read, and 11px overflows a 14px dot. None of them are in the migrated directories; when the portals migrate they need a primitive of their own, not an exemption comment. Recorded so the next pass does not raise them blindly.
- **Defect found and fixed in the guardrail itself:** the first version of the new ESLint block listed `components/ui/**` alongside the other directories. Flat config **replaces** `no-restricted-syntax` rather than merging it when two blocks match the same file, so that block silently switched off the v2.6.10 hex guardrail for `components/ui/` — the exact directory it exists to protect. Caught by probing, not by reading. The selectors are now composed into shared `NO_HEX` / `NO_TINY_TEXT` arrays and spread into each block, with a comment saying why.
- **Checks:** `npm run lint` → tsc 0 errors, ESLint **0 errors / 33 warnings** (unchanged baseline), vitest **316 passed / 25 files**. `npm run build` → `dist/` clean check passed (132 files), PWA release check passed.
- **Functional verification:** browser-confirmed at **390px** (the viewport the floor exists for), **16/16** across `/`, `/tentang-kami`, `/produk`, `/cara-kerja` and `/financing`: every `text-2xs` node computing to exactly 11px, zero arbitrary sub-11px classes left in the DOM, and no horizontal overflow on any page. The computed-size assertion matters because a Tailwind class that is never generated renders silently at the inherited size — a unit test asserting the class name would pass against a size that does not exist. Both guardrails were probed non-vacuous: a hex literal and two sub-11px literals in `components/ui/`, and sub-11px literals in `src/` and `components/public/`, each produced the expected error (and the hex rule correctly did **not** fire outside `components/ui/`); all probe files were restored.
- **Version:** v2.6.13 across `src/version.ts`, `package.json`, `package-lock.json` and Android (`versionCode` 26, `versionName` 2.6.13); changelog entry added.
- **Production:** merged as PR #260 (commit `3b8283a`); production deployment `dpl_2SLv4bLgZzpAhvmvfej7tbwCdSRL` observed READY on `main`.
- **Known gaps:** ~725 sub-11px nodes in the six portals (counts above); the radius scale; 826 raw `<button>`; 1.003 hardcoded hex outside `components/ui/`; every C/A/O/D screen item. `myinsurepath.com` and `*.vercel.app` remain blocked by this environment's network policy, so no verification has run against a deployed build.
- **Checklist:** S4 (typography) moves to PARTIAL with the public surfaces done and the portal counts recorded. No item moved to DONE.

### 2026-10-23 — Fase 2a: `body` joins the theme, and the dark-mode flash is gone

- **Scope:** `index.html` (an inline pre-paint theme script; `body` and the scrollbar thumb moved onto tokens); `services/__tests__/theme.test.ts` (3 new guards).
- **Defect fixed, carried over from Fase 1a's known gaps:** `index.html` hardcoded `body { background: #fafaf9; color: #1e293b }` with no dark counterpart. The one surface behind every page was therefore the one surface that never followed the theme — `--ds-*` on `:root` flipped to its dark values while `body` stayed light. `body` now reads `var(--ds-bg)` / `var(--ds-text-primary)`, with the literals kept only as a first-paint fallback for the window before `styles.css` (bundle-imported) defines the tokens. Those fallbacks must stay equal to the token values, and a comment in the file says so.
- **Second defect fixed:** the `dark` class only landed after React mounted, so every load painted light first — a white flash for anyone using dark mode. A short inline script in `<head>` now reads the stored preference before first paint. It uses the same `sp_dark_mode` key as `components/shared/theme.ts`, which remains the single owner; this is an early read of that state, not a second owner. Only an explicit `'true'` turns it on, so a user who has never chosen still gets light (what five of the six portals open as) and the Admin CMS still applies its dark fallback at mount.
- **Checks:** `npm run lint` → tsc 0 errors, ESLint **0 errors / 33 warnings** (unchanged baseline), vitest **316 passed / 25 files** (was 313/25). `npm run build` → `dist/` clean check passed, PWA release check passed.
- **Functional verification:** browser-confirmed against the local dev server, **8/8** assertions: the light token painted on `body` (`rgb(244,247,251)`), the class reaching `documentElement`, `body`'s background moving to `rgb(26,29,41)` and its text colour to white, the theme read appearing in `<head>` ahead of the module script in the served HTML, and no literal `background: #` left in the `body` rule. The last assertion was verified non-vacuous: restoring `background: #fafaf9` made it fail, and the file was restored. The 3 new unit tests guard `index.html` itself, which is outside the TypeScript build and would otherwise drift unnoticed.
- **Version:** v2.6.12 across `src/version.ts`, `package.json`, `package-lock.json` and Android (`versionCode` 25, `versionName` 2.6.12); changelog entry added.
- **Production:** merged as PR #256 (commit `4294f1a`); production deployment `dpl_6B49GpRt7pxMVZaNLkuaFdmuRRLv` observed READY on `main`.
- **Known gaps:** the typography floor (765 nodes under 11px), the radius scale, 826 raw `<button>`, and 1.003 hardcoded hex outside `components/ui/` remain open, as does every C/A/O/D screen item. Browser confirmation inside the authenticated portals is still outstanding; `myinsurepath.com` and `*.vercel.app` are blocked by this environment's network policy.
- **Checklist:** S1 gains the `body` surface; no item moved to DONE.

### 2026-10-23 — Fase 1b: the admin tier screen off native dialogs, prompt support, one empty state

- **Scope:** `components/ui/ConfirmDialog.tsx` (input support + `usePromptDialog`); `components/ui/index.ts`; `components/admin/TierPromoConfigAdmin.tsx` (off `window.confirm`/`alert`/`prompt`); `components/admin/PolicyOrdersAdmin.tsx` (four console-only user messages + a `window.prompt` fallback moved to toasts); `components/ui/EmptyState.tsx` **deleted**; `services/__tests__/promptDialog.test.tsx` (new); `services/__tests__/components.test.tsx` repointed at `AgentEmpty`.
- **Audit corrected.** The Fase 1a figures came from greps that over-counted (`\bButton\b` matched prose and other identifiers; `confirm(` matched `useConfirmDialog(`). Re-counted against call sites:

  | Claimed in the plan | Verified |
  |---|---|
  | `Button` primitive used in 5 files | **0** — no file imports it, no file renders `<Button` outside `components/ui/` |
  | `Card` used in 21 files | **0** imports from `components/ui/` |
  | 21 `window.confirm` | **1 file** (`TierPromoConfigAdmin.tsx`): 1 `confirm`, 3 `alert`, 1 `prompt` |
  | 1.017 hardcoded hex | 1.012 total, 9 in comments → **1.003 in code** |
  | 827 raw `<button>` | **826** |
  | 766 texts under 11px | **765** |
  | — | token share now 3.210/5.070 = **38%** |
  | — | `useConfirmDialog` already in **10** files, `useToast` in **23**, `SkeletonCard` in **11** |

  The sharper finding the corrected numbers give: **feedback primitives are already widely adopted; structural primitives (Button, Card, IconButton, EmptyState) have zero adoption.** Fase 1b therefore finished the feedback layer rather than starting a Button migration, which belongs with the surface pass that will touch those 826 elements anyway.
- **Plan reversal, deliberate:** the plan said to adopt `components/ui/EmptyState.tsx`. It has **zero** call sites, while `AgentEmpty` (`components/agent/AgentArt.tsx:661`, branded `SpotEmpty` illustration) is used in **17** files across Agent, Operator and Insurer. Keeping both would leave "use the EmptyState primitive" ambiguous in exactly the way the duplicate `Button` was, so the unused one was deleted and `AgentEmpty` is now the single empty state. The unit test that covered the deleted component was repointed at `AgentEmpty`, not removed.
- **Defect found and fixed:** `ConfirmDialogProvider` held one `resolveRef`. Opening a second dialog while one was pending overwrote it, leaving the first caller's promise pending forever — an `await confirm(...)` that never returns, with no error. `open()` now settles any stranded promise as a dismissal first; a unit test covers it.
- **Second defect found and fixed:** `PolicyOrdersAdmin` wrote four user-facing messages to `console.warn`/`console.error` instead of showing them — "Wajib isi catatan penolakan", "Upload gagal", "Gagal membuat link", and the quotation-slip download failure. An admin who pressed Reject with an empty note therefore saw **nothing happen at all**: no error, no state change, no clue. All four are toasts now, and the `window.prompt('Salin link berikut:')` clipboard fallback became a toast carrying the link. After this there is no native dialog anywhere in the app except the no-provider fallback inside `ConfirmDialog` itself.
- **Behavior change, intentional:** rejecting a tier request now collects its reason in an in-app dialog instead of `window.prompt`. The `null`-means-cancel semantics are preserved exactly, so the existing `if (reason == null) return;` guard still bails out correctly; an empty string still means "proceed, no reason recorded".
- **Checks:** `npm run lint` → tsc 0 errors, ESLint **0 errors / 33 warnings** (unchanged baseline), vitest **313 passed / 25 files** (was 305/24 — 7 new in `promptDialog.test.tsx`, 1 added to `components.test.tsx`). `npm run build` → `dist/` clean check passed (132 files, unchanged), PWA release check passed.
- **Functional verification:** the 7 new tests cover the value coming back on confirm, `null` on dismissal, an empty answer accepted when the field is optional, a required field blocking both blank and whitespace-only input, the stranded-caller fix, `useConfirmDialog` still resolving to a plain boolean, and no textbox rendered when no input was asked for. **Not yet done:** browser confirmation of the tier screen itself, which needs an authenticated admin session.
- **Version:** v2.6.11 across `src/version.ts`, `package.json`, `package-lock.json` and Android (`versionCode` 24, `versionName` 2.6.11); changelog entry added.
- **Production:** merged as PR #255 (commit `25d57d5`), deployed by Vercel as `dpl_4yvZ5JG6Wonm6SDRtNF2cqtUKfoa`, state READY, aliased to `myinsurepath.com`.
- **Known gaps:** unchanged from Fase 1a except the dialog items — 1.003 hardcoded hex outside `components/ui/`, 826 raw `<button>`, the typography floor (765 nodes), the radius scale, the unthemed `body` background in `index.html`, and every C/A/O/D screen item remain open.
- **Checklist:** S2 stays PARTIAL, now with the feedback layer complete and the structural layer named as the remaining work. No item moved to DONE.

### 2026-10-23 — Fase 1a: one dark-mode owner, duplicate primitives removed, token guardrail

- **Scope:** `components/shared/theme.ts` (new); `App.tsx`, `components/customer/CustomerPortal.tsx`, `components/admin/AdminPortal.tsx`, `components/operator/OperatorProfile.tsx` rewired to it; `components/shared/UI.tsx` (dead `Button` + `GlassCard` removed, `Badge` moved to tokens); `components/ui/FloatingWhatsApp.tsx`, `components/ui/ReferralCard.tsx` de-hexed; `styles.css` + `tailwind.config.cjs` gained `--ds-whatsapp`; `eslint.config.js` gained a hex guardrail scoped to `components/ui/**`.
- **Audit that motivated it:** 1.017 hardcoded hex across 91 files; 5.098 raw palette classes vs 3.196 `ds-*` token classes; 827 raw `<button>` against 5 files using the `Button` primitive; `EmptyState` and `IconButton` at zero adoption; 766 text nodes under 11px; 139 ad-hoc `animate-spin`; 21 `window.confirm`. Full plan: the UI/UX revamp plan doc (2026-10-23). **Several of these figures are wrong** — see the Fase 1b entry below for the re-counted set; in particular `Button` had 0 call sites, not 5, and `window.confirm` appeared in 1 file, not 21.
- **Defect found and fixed:** dark mode had **four independent owners** of the same `sp_dark_mode` key, not two. `App.tsx` themed the marketing site with a wrapper `<div className="dark">` and never touched `documentElement`, so a `dark` class left behind by any portal flipped the `--ds-*` tokens on `:root` to their dark values while the wrapper still said light — and a wrapper only governs `dark:` variants in its own subtree, so it could not undo that. Token-driven surfaces and `dark:` descendants therefore rendered dark on a page meant to be light. `AdminPortal` additionally seeded `useState(true)`, ignoring a stored light preference and never writing one back, so the CMS could not remember light mode across reloads.
- **Behavior change, intentional:** the Admin CMS still opens dark when the user has never chosen, but a stored preference now wins and is persisted. Previously the CMS always opened dark.
- **Checks:** `npm run lint` → tsc 0 errors, ESLint **0 errors / 33 warnings** (identical to the pre-change baseline), vitest **305 passed / 24 files** (was 299/23 — the 6 new tests are `services/__tests__/theme.test.ts`). `npm run build` → built in 21.5s, `dist/` clean check passed (132 files, unchanged), PWA release check passed.
- **Functional verification:** the 6 new unit tests cover the fallback path, a stored light preference overriding a dark fallback (the CMS regression), the class landing on `documentElement` rather than a wrapper, the store/read round trip, and a blocked-storage path that must not throw. The ESLint guardrail was verified non-vacuous: a probe constant `'#ff0000'` added to `components/ui/LiveBadge.tsx` produced the expected `no-restricted-syntax` error, and the file was restored. Browser-confirmed on the marketing site with Chromium against the local dev server: 9/9 assertions, covering the class reaching `documentElement`, `--ds-bg` flipping `#F4F7FB` ↔ `#1A1D29`, the rendered surface repainting `rgb(245,251,247)` ↔ `rgb(7,26,19)`, persistence across reload, the return to light, and the absence of any `div.dark` below `<html>`. The Vercel preview host is blocked by this environment's network policy, so the check ran locally. **Not yet done:** the same confirmation inside the five authenticated portals.
- **Version:** v2.6.10 across `src/version.ts`, `package.json`, `package-lock.json` and Android (`versionCode` 23, `versionName` 2.6.10); changelog entry added.
- **Production:** merged as PR #254 (commit `676219b`), deployed by Vercel as `dpl_DUxoqVBLT4WvAL534Yr6yPPDamnx`, state READY, target production.
- **Known gaps:** `index.html` hardcodes `body { background: #fafaf9; color: #1e293b }` with no dark counterpart, so `body` itself never themes — found during the browser check, left out of this PR because changing it repaints every page; it belongs with the surface/typography pass. ~1.008 hardcoded hex values remain outside `components/ui/`; the 827 raw `<button>` elements, the typography floor, the radius scale, `EmptyState`/`Skeleton`/`ConfirmDialog` adoption and every C/A/O/D screen item are untouched.
- **Checklist:** S1 and S2 moved to PARTIAL with their evidence. No item moved to DONE.

### 2026-10-23 — scope widened to four portals; shared scroll-reset primitive

- **Scope:** Portal scope widened from Customer+Agent to Customer, Agent, Operator and Admin CMS (§0), with Insurer and B2B stated as foundation-only. Added Operator (O1–O7) and Admin (D1–D8) acceptance checklists grounded in a source-level audit. Split old S3 into S3a (scroll position, now done) and S3b (remaining navigation behavior). Renamed this file from `AGENT_APP_REVAMP_EXECUTION.md`, since the agent-only name no longer described its scope.
- **Code scope:** new shared primitive `components/shared/scrollReset.ts`; wired into `CustomerPortal.tsx`, `AgentPortal.tsx`, `OperatorPortal.tsx`, `InsurerPortal.tsx`, `B2BPortal.tsx`, `AdminPortal.tsx`. Admin gained a `contentRef` on its content container and a single `goToTab` handler replacing six scattered `setActiveTab` call sites.
- **Audit findings recorded:** only the Customer portal reset scroll on in-portal navigation; the other five did not. Operator is fully card-based (0 `<table>`). Admin tables are already wrapped for horizontal scroll in most views (19 `<table>` / 21 `overflow-x-auto`). `AnalyticsDashboard` is a ~395 kB chunk. The Customer portal was forcing `behavior: 'smooth'` regardless of `prefers-reduced-motion`.
- **PR/commit:** see the PR opened from `claude/epic-heisenberg-tlbfco`.
- **Checks:** `npm run lint` → tsc 0 errors, ESLint 0 errors / 33 pre-existing warnings (verified unchanged against a stashed baseline — the two Customer-portal warnings only shifted one line), vitest 299 passed / 23 files. `npm run build` → built in 26.5s, `dist/` clean check passed (132 files, no sourcemaps/server bundle/credentials), PWA release check passed.
- **Functional verification:** 5 new unit tests cover window scroll, container scroll, `prefers-reduced-motion` downgrade to `auto`, the `scrollTop` fallback where `Element.scrollTo` is absent, and the null-container path. The jsdom `scrollTop` fallback assertion was itself verified non-vacuous (jsdom retains an assigned `scrollTop`). **Not yet done:** browser-based confirmation in the six authenticated portals.
- **Version:** v2.6.9 across `src/version.ts`, `package.json`, `package-lock.json` and Android (`versionCode` 22, `versionName` 2.6.9); changelog entry added.
- **Production:** merged as PR #253 (commit `6a0a6e8`), deployed by Vercel as `dpl_BLfQ5qTFRJigSnAdki6KWVsh45ji`, state READY, target production.
- **Known gaps:** no screen-level redesign work started for Operator or Admin — only the audit and the checklists. S1, S2, S3b, S4 and every C/A/O/D item remain open. Browser and on-device verification still outstanding.
- **Checklist:** S3a → DONE (shared primitive implemented in all six portals, unit-tested, version-shipped). No other item moved.

### 2026-10-23 (earlier) — brief created

- Recorded the approved revamp direction as an actionable execution brief and reusable master prompt.
- Documented that existing Agent Home/Wallet changes are incremental polish, not completion of the approved full redesign.
- Added screen-level acceptance criteria and a status ledger so future work can be audited against the approved target.

## 7. Required update format for future log entries

Use this format so status remains auditable:

```md
### YYYY-MM-DD — [screen/workstream]
- **Scope:** exact screens/components changed
- **PR/commit:** link and SHA
- **Preview:** URL + final Vercel state
- **Checks:** lint/type/build/tests and result
- **Functional verification:** flows actually exercised
- **Production:** deployment ID/state/domain, if merged
- **Known gaps:** unresolved issues
- **Checklist:** items moved to DONE, with reason/evidence
```

## 8. Recommended execution order

Foundation first, then the surfaces with the most users, then the operational tools. Each numbered step is one reviewable PR unless noted.

1. **S1 + S2 — tokens and shared primitives.** Everything else inherits these, and doing them later means redoing screens. Verify against all six portals.
2. **S3b + S4 — navigation and the responsive/accessibility pass.** Cheap once primitives exist, and it closes the audit's P0 items.
3. **Customer C2, C4, C5** — home, purchase wizard, policy wallet. Highest user volume and the revenue path.
4. **Agent A1, A2, A4/A5** — home, quote builder, commission and wallet. Wire "Total Withdrawn" to real data as part of A4.
5. **Customer C1, C3, C6, C7, C8**, then **Agent A3, A6–A10**.
6. **Operator O2, O3, O6** — work queue, orders, withdrawals. Operator volume is low but each screen gates money and policy issuance.
7. **Operator O1, O4, O5, O7.**
8. **Admin D1, D2, D4** — shell, dashboard, finance. Then **D3, D5, D6, D7, D8**.

Rationale for putting Admin last: it is the only portal whose users can be trained, it is desktop-first so it has the fewest layout hazards, and its recent reliability work (v2.6.5, v2.6.6, PR #243, v2.6.9) already removed the defects that actually blocked work. Customer and Agent screens are seen by people who will not file a bug report — they will simply leave.
