# Admin Portal 2.0 — audit & phased plan

Status: Phase 1 (audit) and Phase 2 (architecture) below are complete. Phase 3+
lands as a sequence of verified PRs on top of this plan, starting with the
dashboard + design-token layer. This supersedes `docs/UI_REDESIGN_2026-10.md`
S2–S4 for the admin portal — S2–S4 remain the plan for Agent/Operator.

## 1. Audit — what exists today

**Scale**: 32 files under `components/admin/`, ~700KB, 29 leaf views reachable
through a 6-group / 17-section sidebar (`components/admin/navigation.ts`).
That IA (groups: Hari Ini, Polis & Klaim, Mitra, Keuangan, Katalog & Harga,
Platform) already shipped in **S1 / v2.7.15 (PR #328, merged)** — it replaced
a flat 29-item menu and is covered by `services/__tests__/adminDesignFloor.test.ts`
(contrast AA, no sub-11px type, every leaf id still reachable).

**Shared primitives already in place** (`components/admin/adminUI.tsx`):
`AdminKpiCard`, `AdminStatusBadge`, `AdminEmptyState`, `AdminErrorBanner`,
`AdminPageHeader`, `AdminSectionCard`. These sit on the `ds-*` Tailwind token
layer (`tailwind.config.cjs`), which is shared across all 5 portals, not
admin-only. `DataTable`/`FilterBar`/`DetailDrawer` extraction was scoped for
S2 and never done — still per-view.

**Workspace dashboards** (`components/admin/workspaces/*`): five role-shaped
dashboards (Command, Finance, Collections, Marketing, Insurer Liaison,
Agent Onboarding, Business Support) plus `AdminDashboard.tsx`
(the default `dashboard` view) and `AnalyticsDashboard.tsx`. Data comes from
`dashboardData.ts` — real aggregates over `sp_policy_orders`, `sp_claims`,
`sp_withdrawals`, tier-change queue; explicitly **no invented multipliers**.

**Theme**: admin is **deliberately light-only** — `AdminPortal.tsx` forces
`applyDarkMode(false)` on mount and restores the shared `sp_dark_mode`
preference on unmount, so admin never writes the cross-portal dark-mode key.
This is a standing decision (`design.md §4`), not an oversight — it resolves
the open memory question "should Admin CMS always be dark": **no**, it should
stay light-only; none of the reference styles in the new brief (Drive, EDU
dashboard, fintech, ALTITUDE) require a dark shell, and flipping it would
re-open the exact dark-mode regression class fixed in PR #290/#328.

**Auth / data integrity constraints that do not move**: role gating in
`navigation.ts` (`ADMIN_MENU_ITEMS[].roles`), the `SP_ROLE_PERMISSIONS`
localStorage override + `sp-admin-perms-changed` live-sync, the data-gateway
pattern (deny-all RLS, server-side trust for `agent_id`/role fields), and the
tiered withdrawal approval ladder. Every admin view currently reads through
existing `services/*` gateway calls — none bypass it, and the redesign does
not either.

**Known debt carried into this plan**: `DataTable`/drawer extraction (S2),
Lighthouse a11y score unmeasured, recurring contrast/font-floor regressions
each time a broad visual pass lands (documented in
`surepath-revamp-regressions-v2714`) — the lesson taken: ship the token/CSS
layer with the existing `adminDesignFloor.test.ts` guard extended to cover
new surfaces, not as an afterthought.

## 2. Architecture decisions for 2.0

1. **Extend `ds-*`, don't fork it.** A parallel admin-only palette would
   re-create the exact `sp-*` vs `ds-*` drift called out as unresolved in
   `UI_REDESIGN_2026-10.md` §6. New ALTITUDE-derived tokens (forest green,
   deep emerald, dark forest, lime, soft lime, warm white, SurePath orange)
   are added as new `--ds-*` CSS variables + Tailwind keys, light-theme
   values only for the admin-consumed ones, so other portals are unaffected
   unless they opt in.
2. **Keep the 6-group IA, re-skin and re-compose it.** The groups already
   match the brief's "Business Overview / Sales & Distribution / Insurance
   Operations / Finance / Platform Administration" suggestion closely enough
   that remapping labels is cosmetic; the real work is the command-center
   dashboard and per-module interaction upgrades, not reshuffling 29 leaf ids
   again (that churn previously broke deep links and permission matrices
   twice).
3. **Reinvent the home dashboard first** as the highest-leverage, most
   visible piece: executive overview, financial intelligence (GWP/revenue
   trend, product/insurer/agent contribution — all from `dashboardData.ts`,
   extended with the splits the brief asks for, never mocked), operational
   intelligence (queues already tracked: approvals, claims, withdrawals,
   tier), activity feed (already-fetched `sp_admin_notifications`).
4. **Module-by-module reinvention ships as separate, independently
   verifiable PRs** in priority order: Dashboard → Policy/Claims workspace
   (biggest table-heavy surface, benefits most from `DataTable`+drawer) →
   Finance → Agents/Partners → Catalog → Platform/Settings. Preserves "don't
   merge unfinished changes" and keeps each PR's contrast/font-floor sweep
   small enough to actually verify, after two prior full-sweep passes
   regressed.
5. **Nothing in `supabase/functions/`, RLS, or gateway action auth changes**
   for this effort. Any new dashboard metric is a new read-only aggregation
   in `dashboardData.ts` over data already fetched or already gateway-exposed
   — no new tables, no new edge function routes.

## 3. Phase sequence (this plan)

| Phase | Scope | Ships as |
|---|---|---|
| 1–2 | Audit + architecture (this doc) | this commit |
| 3a | Design tokens (ALTITUDE layer) + `AdminPageHeader`/`AdminKpiCard` v2 visual language | PR: tokens + dashboard |
| 3b | Dashboard 2.0: executive overview, financial intelligence charts (recharts, already a dependency), operational queue panel, activity feed, business growth insights | same PR as 3a |
| 3c | `DataTable`/`FilterBar`/`DetailDrawer` extraction to `shared/ds` | follow-up PR, unblocks 4 |
| 4 | Policy/Claims, Finance, Agents/Partners, Catalog, Platform module passes | sequential PRs |
| 5 | QA per PR: `tsc --noEmit`, `npm run lint:es`, `npm run build`, `npx vitest run services/__tests__/adminDesignFloor.test.ts`, contrast/font-floor sweep | per PR |
| 6 | Merge to `main`, Vercel auto-deploy, prod verification | per PR |

Each PR gets its own before/after note and test results in the PR body;
nothing is reported merged or deployed without that evidence.
