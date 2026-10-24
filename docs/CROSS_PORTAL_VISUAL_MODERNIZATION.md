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

## Validation status (updated 2026-10-22)
- The production deployment for commit `654fc758b2f94f0422931855dab3f89d12946e80` was reported by Vercel as `READY` and aliases `myinsurepath.com`.
- GitHub reported all seven checks passing on that production commit, including build, quality, unit, browser smoke, security and Android build checks.
- A follow-up CSS safety fix removes broad animations from every direct child of `main`; only explicitly marked screen elements receive screen-entry motion. This reduces animation replay during dynamic updates and avoids adding motion to long transactional lists.
- These automated checks do not replace visual QA. Individual portal layouts, light/dark mode, mobile/desktop breakpoints, and authenticated navigation still require browser-based visual inspection before the full redesign can be called complete.

## Remaining validation
1. Verify Customer, Agent, Operator, Insurer, B2B and Admin in light and dark mode, mobile and desktop.
2. Check keyboard focus, reduced-motion mode, safe-area navigation and dialogs/drawers.
3. Confirm the public landing page visuals are unchanged.
4. Capture screenshots from the actual authenticated portals and inspect the production PWA on a device.
5. Confirm preview/production build and all checks pass after the latest CSS commit.


## Pass 2 — customer and agent app visual priorities (2026-10-24)
- Prioritize the authenticated Customer Portal and Agent Portal before internal portals.
- Design direction: white-first backgrounds, emerald green for trust and primary actions, small orange accents for freshness and secondary emphasis; preserve SurePath logo assets and existing iconography.
- Refine customer purchase, policy, claim and history surfaces; refine agent home, quote creation, policy tracking, commission/wallet and profile surfaces.
- Maintain existing navigation, onboarding, authentication, API/data access, insurance calculations, commissions, and claim/payment behavior. Visual changes only unless separately approved.
- Keep controls at least 44px, clear keyboard focus, safe-area spacing, reduced-motion support, and responsive mobile layouts.
- Validation gate: run CI/build and review authenticated customer and agent screenshots at mobile and desktop sizes. Do not call the redesign complete or production-live until checks pass and a deployment containing this commit is verified.
