# Operator App Visual Redesign

## Direction
- White-first surfaces with SurePath emerald as the primary interaction color.
- Restrained orange for pending/attention states only.
- Calm premium enterprise styling, clear data hierarchy, touch-friendly controls, responsive mobile-first layout.
- Keep light/dark mode support and reduced-motion/accessibility behavior.

## Implemented in this pass
- Added an Operator-specific visual scope class without changing shared authentication or navigation behavior.
- Refined the Operator dashboard hero from a dark gradient command card to a white-first surface with emerald and restrained orange accents.
- Refined queue card elevation and claim-pending accent.
- Added dark-mode and narrow-mobile refinements scoped to the Operator app.

## Protected behavior
No changes to authentication, permissions, database queries, realtime subscriptions, claims decisions, withdrawal approvals, payments, commissions, or business calculations.

## Follow-up validation
- Review all Operator tabs: Dashboard, Policies, Claims, Withdrawals, Agents, Profile and Notifications.
- Run lint, build, unit tests, browser smoke tests and Android build.
- Verify mobile and desktop layouts in light/dark mode.
- Capture authenticated screenshots before calling the full Operator redesign complete.
