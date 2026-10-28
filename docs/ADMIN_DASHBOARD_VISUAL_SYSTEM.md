# SurePath Admin Dashboard — Approved Visual System

Status: approved implementation brief based on the owner-selected dashboard and icon-library reference.

## Design intent
Premium, modern, calm, enterprise-ready insurtech. The dashboard and all administration views must feel like one product, not a collection of unrelated components.

## Tokens
- Forest sidebar: `#063F38` to `#07564A`, subtle emerald gradient.
- Primary emerald: `#07966D`; supporting mint: `#DDF7EE`.
- Accent orange: `#FF941F` only for primary calls to action, selected highlights requiring attention, or meaningful warning/status states. Never use orange as a standalone menu theme.
- Content canvas: `#F5F8F7`; cards: `#FFFFFF`; borders: `#E3ECE8`; text: `#102D2A`.
- Preserve the official SurePath logo/icon assets exactly; do not redraw or approximate them.
- Rounded cards (16–24px), restrained shadows, generous spacing, accessible contrast, consistent typography.

## Dashboard shell
- Left fixed forest-green sidebar with official logo, icon + label navigation, muted group labels, subtle dividers, and a single emerald/mint active state with a slim indicator.
- Sidebar hover uses a translucent white/green surface. No white-orange active menu tile.
- Header has search, notifications, and admin profile controls on a light/white surface.
- Dashboard overview uses a green-toned hero/gradient background, welcome headline, then white metric cards with clear values and compact trend indicators.
- Quick Access shortcuts are consistent white cards with mint icon wells; orange is reserved for one primary action or an attention state.
- Main content must remain responsive, scroll naturally, and not reset scroll unexpectedly.

## Icon Manager — all managed portals
Build a unified visual asset manager for Customer, Agent, Operator, Insurer, B2B Partner, and Admin.
- Use portal tabs, icon search, category filter, style filter, upload action, and responsive icon-card grid.
- Every card shows a consistent icon preview, human-readable label, stable ID, category, current style, and upload/reset controls.
- Support the four existing styles: Studio, Orbit, Bold, Illustrative.
- Keep existing CMS IDs and persistence behavior stable; do not break already-uploaded custom assets.
- Uploaded asset errors must fall back to built-in artwork.
- Use only uploaded/approved artwork or locally authored assets; never create fake logo variants.
- Keep illustration art on transparent/white or pale mint surfaces so assets work in all portals.

## Required icon coverage
Use the existing 48 managed IDs as the source of truth: navigation (home, dashboard, policy, quotes, profile, notifications); relationships (clients, users, agents, insurers, b2b, user_mgmt); operations (claims, claims_admin, approvals, payments, withdraw, withdrawals, transactions, activity_log); finance (commission, commission_ledger, financial, analytics, reports, inventory); product/content (documents, product_config, policy_orders, endorsements, vehicle_pricelist, ojk_rates, website_editor, tier_promo); AI/system (pathy, ai_admin, ai_finance, pathy_logs, ops_console, security, settings, system); insurance (product, car_protection, travel_safe, personal_safety, item_shield, family_health).

## Shared styling requirements
- Align all sidebar/menu states, page titles, filters, buttons, tables, empty states, modals, and icon wells to the same token system.
- Remove isolated white/orange menu styling. White is for surfaces; green indicates navigation/brand; orange is a restrained accent.
- Avoid hard-coded one-off colors where design tokens exist.
- Respect dark mode and reduced-motion behavior.
- Maintain keyboard focus, minimum touch targets, responsive behavior, and role-based menu visibility.

## Acceptance criteria
1. Admin dashboard shell resembles the approved reference: green sidebar, calm white surfaces, emerald accents, compact orange CTA accents.
2. No menu appears white/orange without a semantic reason; active and hover states are consistent.
3. Icon Manager exposes all six portal groups and all 48 managed icon IDs without changing CMS identifiers.
4. Icon upload, reset, style selection, search, and category filtering continue to work.
5. Broken custom icon URLs show built-in fallback art rather than a blank image.
6. Existing authorization, data flows, and business logic remain unchanged.
7. TypeScript, lint, unit, browser smoke, and production build checks pass before merge/deploy.
