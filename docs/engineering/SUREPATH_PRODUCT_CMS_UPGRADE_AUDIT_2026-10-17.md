# SurePath Product, CMS & Engineering Upgrade Audit — 17 October 2026

## Executive summary

SurePath has an existing semantic design token layer, glass surfaces, page-entry motion primitives, and reduced-motion support. The next visual pass should use these consistently across customer, agent, insurer, operator, finance, and CMS screens instead of adding unrelated animation systems to each portal.

The CMS is connected to Supabase's `sp_website_config` table. Public pages read these sections at runtime and retain bundled defaults when the CMS is unavailable. CMS writes currently use the authenticated browser client. The former RLS write policy allowed any authenticated account to modify public website configuration; this patch restricts writes to `MASTER_ADMIN` and `ADMIN` roles while preserving public reads.

## Changes in this patch

1. **CMS integrity feedback** — website-section and promo-banner editors no longer display a false success when the Supabase upsert returns no row. Errors are surfaced with accessible alerts. Image upload failures are surfaced, and loading flags are reset in `finally` blocks.
2. **CMS role security** — added migration `20261017020000_restrict_website_config_writes.sql`, which replaces the broad authenticated-write policy with an admin-role policy. Public read access remains unchanged so the marketing site can render CMS-managed content.
3. **Public CMS resilience** — the shared website-config hook cancels stale async updates when a page section changes and gracefully falls back to bundled content when a fetch fails.
4. **Accessibility** — added accessible names to sign-in email/password fields and password-visibility controls, associated operator login labels with their fields, and labeled the vehicle-value slider.
5. **Safe E2E defaults** — integration tests require an explicit gateway URL; production needs an explicit opt-in. The rate-limit test no longer sends a burst of requests by default. Playwright starts the local Vite server for UI smoke tests.
6. **Lint isolation** — generated ECC/AI tooling directories are excluded from application linting.

## Verification requirements

- `npm run lint`
- `npm run test:unit`
- `npm run test:e2e` (local UI smoke tests)
- `npm run build`
- `npm audit --omit=dev --audit-level=high`
- Apply the new Supabase migration in a controlled environment, then verify public anonymous reads still work and non-admin authenticated writes fail while `MASTER_ADMIN` and `ADMIN` writes succeed.
- Confirm CMS edits appear on the public site after refresh, including image URLs and visibility toggles.

Do not claim the CMS security change is live until the migration has actually been applied to the connected Supabase project.

## Product UI/UX roadmap

### P0 — Trust, security, and data correctness

- Verify Supabase RLS, security-definer function grants, role/object-level authorization, and server-side authority for payments, policy issuance, claims, commissions, and wallet withdrawals.
- Keep CMS changes role-restricted and visible errors actionable; distinguish saved state from draft/unsaved state.
- Add staging acceptance tests for quote → insurer decision → payment → policy; claim submission → review → insurer decision; and commission accrual → wallet availability → withdrawal approval → settlement.
- Verify CMS upload size/type restrictions and storage access policy before broadening image uploads.

### P1 — One coherent visual system across every app

- Reuse the existing semantic tokens, glass-panel, interactive-surface, page-entry, and reduced-motion primitives rather than inventing parallel styles.
- Apply consistent page transitions, focus rings, button feedback, skeletons, empty/error states, and responsive layouts across customer, agent, insurer, operator, finance, and CMS portals.
- Establish image rules: responsive sources, explicit aspect ratios, appropriate object positioning, lazy loading below the fold, high-priority loading only for the primary hero, alt text, and graceful fallback when a CMS image URL is invalid.
- Make CMS previews match the actual public site. A preview should show the selected section's current draft, mobile layout, image crop, and visible/hidden state before publish.
- Keep motion restrained and purposeful: short opacity/transform transitions, no layout-shifting animation, and respect `prefers-reduced-motion`.

### P1 — CMS as a dependable publishing workflow

- Add draft/published states and a clear publish confirmation for material homepage changes.
- Validate content and images before saving; show the last successful save time and a truthful error state.
- Add a preview of the real customer-facing page from CMS edits.
- Add a content version/history and rollback path before enabling frequent edits to the splash, onboarding, or homepage.
- Add an operations-health panel that shows stale orders, failed notifications, and version drift, using only server-authorized actions and real data.

### P2 — Architecture and performance

- Split the large `App.tsx` orchestration layer into route, session, and role-routing modules without breaking deep links.
- Replace broad `any` types around policy, payment, and session records with shared domain types.
- Add visual regression coverage for 390px mobile, tablet, and desktop breakpoints.
- Review the remaining lint warnings in small batches, prioritizing stale hook dependencies in claims, wallet, and admin screens.
- Treat Tailwind CSS 4 as a dedicated migration with CSS, PostCSS, PWA, and screenshot checks. Do not force a major toolchain upgrade into a routine patch.

## Release gates

- All required local checks pass.
- New CMS migration passes on a staging database before production application.
- Public website renders when CMS is unavailable and when sections are hidden.
- No CMS save or upload shows success unless the server confirms it.
- Preview deployment is checked on mobile and desktop before production promotion.
