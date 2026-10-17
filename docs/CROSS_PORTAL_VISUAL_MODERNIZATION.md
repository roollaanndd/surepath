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

## Known limitation
The configured Vercel connector previously returned HTTP 403 for the SurePath team scope. A preview URL and production rollout therefore cannot be claimed until deployment access and CI results are verified.
