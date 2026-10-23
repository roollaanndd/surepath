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

### 2026-10-23 — Fase 1a: one dark-mode owner, duplicate primitives removed, token guardrail

- **Scope:** `components/shared/theme.ts` (new); `App.tsx`, `components/customer/CustomerPortal.tsx`, `components/admin/AdminPortal.tsx`, `components/operator/OperatorProfile.tsx` rewired to it; `components/shared/UI.tsx` (dead `Button` + `GlassCard` removed, `Badge` moved to tokens); `components/ui/FloatingWhatsApp.tsx`, `components/ui/ReferralCard.tsx` de-hexed; `styles.css` + `tailwind.config.cjs` gained `--ds-whatsapp`; `eslint.config.js` gained a hex guardrail scoped to `components/ui/**`.
- **Audit that motivated it:** 1.017 hardcoded hex across 91 files; 5.098 raw palette classes vs 3.196 `ds-*` token classes; 827 raw `<button>` against 5 files using the `Button` primitive; `EmptyState` and `IconButton` at zero adoption; 766 text nodes under 11px; 139 ad-hoc `animate-spin`; 21 `window.confirm`. Full plan: the UI/UX revamp plan doc (2026-10-23).
- **Defect found and fixed:** dark mode had **four independent owners** of the same `sp_dark_mode` key, not two. `App.tsx` themed the marketing site with a wrapper `<div className="dark">` and never touched `documentElement`, so a `dark` class left behind by any portal flipped the `--ds-*` tokens on `:root` to their dark values while the wrapper still said light — and a wrapper only governs `dark:` variants in its own subtree, so it could not undo that. Token-driven surfaces and `dark:` descendants therefore rendered dark on a page meant to be light. `AdminPortal` additionally seeded `useState(true)`, ignoring a stored light preference and never writing one back, so the CMS could not remember light mode across reloads.
- **Behavior change, intentional:** the Admin CMS still opens dark when the user has never chosen, but a stored preference now wins and is persisted. Previously the CMS always opened dark.
- **Checks:** `npm run lint` → tsc 0 errors, ESLint **0 errors / 33 warnings** (identical to the pre-change baseline), vitest **305 passed / 24 files** (was 299/23 — the 6 new tests are `services/__tests__/theme.test.ts`). `npm run build` → built in 21.5s, `dist/` clean check passed (132 files, unchanged), PWA release check passed.
- **Functional verification:** the 6 new unit tests cover the fallback path, a stored light preference overriding a dark fallback (the CMS regression), the class landing on `documentElement` rather than a wrapper, the store/read round trip, and a blocked-storage path that must not throw. The ESLint guardrail was verified non-vacuous: a probe constant `'#ff0000'` added to `components/ui/LiveBadge.tsx` produced the expected `no-restricted-syntax` error, and the file was restored. Browser-confirmed on the marketing site with Chromium against the local dev server: 9/9 assertions, covering the class reaching `documentElement`, `--ds-bg` flipping `#F4F7FB` ↔ `#1A1D29`, the rendered surface repainting `rgb(245,251,247)` ↔ `rgb(7,26,19)`, persistence across reload, the return to light, and the absence of any `div.dark` below `<html>`. The Vercel preview host is blocked by this environment's network policy, so the check ran locally. **Not yet done:** the same confirmation inside the five authenticated portals.
- **Version:** v2.6.10 across `src/version.ts`, `package.json`, `package-lock.json` and Android (`versionCode` 23, `versionName` 2.6.10); changelog entry added.
- **Production:** recorded after merge and Vercel verification.
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
- **Production:** recorded after merge and Vercel verification.
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
