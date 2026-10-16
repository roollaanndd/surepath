# SurePath Series-B Product Experience Roadmap

**Status:** Proposed execution plan  
**Scope:** Customer, Agent, Operator, Insurer, Admin CMS, and B2B portals  
**Product constraint:** Improve UX and reliability without changing insurance calculations, underwriting rules, policy/payment flows, authentication semantics, role permissions, or financial ledgers.

## Executive direction

SurePath already has useful product foundations: React/TypeScript, a shared semantic design-token layer, light/dark themes, glass surfaces in several portals, a shared customer/agent tab bar, PWA support, lazy-loaded admin views, realtime operational updates, and existing security/audit controls.

The next step is not to apply blur everywhere. It is to make every portal feel like one coherent, premium product while preserving the clarity and speed required for insurance and financial workflows. Glass should be a surface treatment, not the information architecture.

## Product priorities

### P0 — Release safety and baseline
- Keep the security review PR #168 and its dependency findings separate from visual changes; do not claim the platform is hardened until findings are triaged and checks pass.
- Establish baseline automated checks: TypeScript, ESLint, unit tests, Playwright E2E, production build, Android version sync, and accessibility smoke checks.
- Capture repeatable screenshots at mobile, tablet, and desktop widths for every portal and key journey.
- Add a smoke test for sign-in/session restore, quote calculation, payment hand-off, policy status, claim submission, role-gated routes, and navigation.
- Validate deployed commit and live-domain behavior before announcing a release. A successful build alone is not production verification.

### P1 — Shared design system and navigation
- Standardize semantic tokens, spacing, type scale, corner radii, elevation, glass strength, focus states, and status colors.
- Use light/dark glass surfaces consistently across Customer, Agent, B2B, Operator, Insurer, and Admin. Keep high-density data tables and forms mostly opaque for legibility.
- Standardize app headers, breadcrumbs or page titles, active navigation, notification entry points, profile/account controls, loading skeletons, empty states, and error recovery.
- Use bottom navigation on mobile task-focused portals; use responsive sidebar + top bar for dense Admin/Operations workflows. Do not force the same navigation pattern onto every role.
- Keep touch targets at least 44px, respect safe areas, keyboard navigation, visible focus, WCAG AA contrast, and `prefers-reduced-motion`.
- Keep animation short and purposeful: 150–260ms for interactions and page transitions, no blocking intro animations, no motion that delays task completion.

### P2 — Customer conversion and trust
- Make the home screen answer: what is protected, what needs attention, and what is the next useful action.
- Turn insurance purchase into a clear stepper with save/resume, persistent progress, plain-language coverage explanations, transparent premium breakdown, and a final review before payment.
- Show a reliable policy lifecycle timeline: quote → submitted → payment → review → issued, with explicit next steps and support access.
- Make claim submission a guided checklist with document/photo requirements, upload progress, recovery from upload failure, claim reference, status timeline, and next update expectation.
- Add accessible document viewing and one-tap access to policy details, payment receipts, and claims.
- Measure quote-start-to-completion, payment completion, abandoned step, claim completion, and support contact rate before and after changes.

### P3 — Agent productivity and earnings clarity
- Make the Agent home screen an action-oriented workbench: follow-ups, quotes in progress, renewals, pending client documents, issued policies, and earnings.
- Fix navigation completeness: audit every rendered tab and every nested destination; the existing app flowchart documents Agent views handled in code but missing from the primary tab array.
- Make quote creation faster with sensible defaults, clear validation, draft recovery, and a visible premium/commission breakdown. Do not alter rating logic.
- Add a searchable client/policy workspace, renewal reminders, claim follow-up, and clear wallet/withdrawal state.
- Show commissions as an auditable ledger with status, linked policy, and payout timeline; never imply funds are available before the server-side ledger says so.

### P4 — Operator and insurer workflow speed
- Use queue-first dashboards with saved filters, clear urgency/status indicators, bulk actions only where safe, and keyboard-friendly detail panels.
- Standardize order/claim detail views with a consistent timeline, documents, internal notes, and an auditable action history.
- Make insurer review actions explicit: approve, reject, or request information with required reason/context and confirmation for consequential actions.
- Use realtime updates as enhancements, with visible refresh/reconnect states and a safe manual refresh fallback.
- Measure median time to process an order/claim, queue age, rework rate, and insurer response time.

### P5 — Admin CMS as a professional control plane
- Modernize the sidebar and top bar with restrained glass, clearer information grouping, persistent current location, and a responsive mobile drawer.
- Separate high-risk controls (roles, payouts, API credentials, security settings) from everyday operations; require confirmation and clear audit context for consequential actions.
- Add useful global search, filters, table column controls, saved views, and export states where the underlying data already supports them.
- Improve operational dashboards with data freshness timestamps and explicit loading/empty/error states; avoid decorative charts that do not change decisions.

### P6 — Intelligence and enterprise readiness
- Introduce explainable AI assistance where it reduces manual effort: document extraction, claim triage, fraud signals, policy-review summaries, and missing-document detection.
- AI should recommend and summarize; deterministic rules and authorized humans retain control of underwriting and consequential decisions unless an explicitly approved workflow says otherwise.
- Build partner-grade integration contracts: versioned APIs, idempotency, signed webhooks, retries, request tracing, partner sandbox, and clear integration documentation.
- Add product analytics with privacy-aware event definitions, funnel dashboards, feature flags for staged rollout, and error/performance telemetry.
- Maintain a security program: dependency remediation, RLS and authorization tests, secret scanning, least privilege, audit logging, rate limiting, and scoped penetration tests.

## Visual system

- **Brand:** SurePath emerald identity with neutral surfaces and restrained lime/emerald accents.
- **Glass:** use blur for app chrome, floating navigation, contextual sheets, and select hero cards. Avoid blur behind dense text, long tables, forms, or financial values.
- **Depth:** one ambient background layer, clear surface hierarchy, subtle borders, and controlled shadows. Avoid stacking translucent layers until contrast degrades.
- **Typography:** clear title/body/caption hierarchy; tabular numerals for premiums, commissions, limits, and balances.
- **Motion:** consistent easing and timing; use opacity/short vertical movement for screen changes, gentle state transitions for selected tabs, and no perpetual animation except subtle decorative background elements.
- **Responsive behavior:** design mobile first for Customer/Agent/Operator/Insurer; optimize Admin for desktop but make its mobile drawer and tables usable.
- **Accessibility:** maintain contrast, focus visibility, screen-reader labels, reduced-motion support, and non-color status cues.

## Delivery sequence

1. **Foundation PR:** shared motion/glass primitives and align Admin chrome with the established glass language. No business logic changes.
2. **Navigation audit:** map all tabs, nested routes, deep links, and back paths for all six portals; fix unreachable views and inconsistent active states.
3. **Portal-by-portal visual pass:** Customer → Agent → Operator → Insurer → B2B → Admin, with before/after screenshots and regression checks per portal.
4. **Critical journey pass:** quote/purchase/payment, policy lookup, claim submission, agent commission/withdrawal, operator review, insurer decision, admin role/finance controls.
5. **Release gate:** lint, typecheck, unit tests, E2E, build, mobile viewport screenshots, accessibility smoke checks, security status review, preview deployment verification, then production verification.

## Definition of done

A portal is not done because it looks attractive in a screenshot. It is done when:
- The layout works at narrow mobile, tablet, and desktop widths.
- All existing role permissions and business flows remain intact.
- No broken tabs, dead-end screens, or hidden primary actions remain.
- Loading, empty, error, offline/reconnect, and success states are designed.
- Keyboard/focus/reduced-motion/contrast checks pass.
- Critical journeys pass automated tests and visual review.
- The exact commit is deployed to the intended environment and verified on the live domain.

## Metrics to track

| Area | Baseline → target metric |
|---|---|
| Customer conversion | Quote completion, purchase conversion, step abandonment |
| Claims | Submission completion, missing-document rate, status-check contacts |
| Agent | Time to create quote, active agents, repeat usage, renewal completion |
| Operations | Queue age, median processing time, rework rate |
| Platform | Core Web Vitals, JS errors, failed requests, release rollback rate |
| Trust | Payment reconciliation exceptions, support contacts per policy, user-reported friction |

Set numeric targets only after collecting reliable baselines; do not invent uplift claims before experiments.

## Current known constraints

- Repository docs describe six portal experiences, but UI implementation and navigation patterns differ by role.
- The existing flowchart calls out Agent destinations that are rendered in code but absent from the primary tab array; verify against current source before changing navigation.
- Security PR #168 was reported as having unresolved dependency audit findings. Keep it separate from visual work and do not bypass failing checks to ship a redesign.
- Vercel project listing is visible, but detailed project/deployment inspection currently returns a scope authorization error. Production status must remain unverified until access is restored and the exact deployment is checked.
