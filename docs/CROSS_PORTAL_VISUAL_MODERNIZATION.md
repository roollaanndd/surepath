# SurePath Cross-Portal Visual Modernization

## Scope
Visual-only refinement for the authenticated Customer, Agent, Operator, Insurer, B2B and Admin CMS portals. The public landing page is intentionally excluded.

## Implementation
- Added `src/styles/portal-modernization.css`, loaded after the existing global stylesheet.
- Applied the `sp-modern-app` scope marker to each portal root.
- Refinements include consistent focus-visible rings, calmer input focus feedback, restrained card elevation, glass blur for existing glass surfaces, thin scrollbars, reduced-motion support and subtle button interaction feedback.
- Existing design tokens and the current SurePath emerald identity are reused.

## Explicit non-goals
No changes to backend APIs, Supabase access, authentication, role permissions, insurance pricing, underwriting, commissions, claims decisions, payment flows, or financial calculations. No landing-page styling is targeted. No generated model or img2threejs runtime is introduced by this change.

## Validation gates
1. Run `npm run lint` and `npm run build`.
2. Verify all six portals in light and dark mode, at mobile and desktop widths.
3. Check keyboard focus, reduced-motion mode, safe-area navigation and dialogs/drawers.
4. Confirm public landing page visuals are unchanged.
5. Verify preview deployment before merging or claiming production rollout.

## Validation status
- GitHub Actions reported success for CI, Security Review and Android native build on the initial visual-layer commit.
- A subsequent CSS refinement commit is now on this branch; its own checks must finish before merge.
- Vercel's PR status is failing with a build-rate-limit notice. The current production deployment is on `main`, not this feature branch.
- No cross-portal browser visual QA has been completed yet, so this is not a production rollout claim.

## Known limitation
Vercel access was previously returning HTTP 403 for the SurePath team scope and the PR status now points to a build-rate-limit page. A verified preview URL and production rollout therefore cannot be claimed until a preview is available and all visual QA gates pass.
