# SurePath UI/UX Audit — 13 October 2026

## Scope and evidence

Reviewed the role portal entry components and shared navigation sources in the repository:
- Customer: `components/customer/CustomerPortal.tsx`
- Agent: `components/agent/AgentPortal.tsx`
- Admin: `components/admin/AdminPortal.tsx`
- Operator: `components/operator/OperatorPortal.tsx`
- Insurer: `components/insurer/InsurerPortal.tsx`
- B2B: `components/b2b/B2BPortal.tsx`
- Shared customer/agent chrome: `components/shared/PortalHeader.tsx`, `components/shared/PortalTabBar.tsx`

This is a source-level audit, not a claim that every role has been manually tested with production accounts or real data. Keep authorization and business workflows unchanged during visual-only improvements.

## Improvements included in the accompanying PR

- Keyboard-visible focus rings for shared header and bottom navigation controls.
- Explicit main-navigation landmark label and semantic state for dark-mode toggle.
- Screen-reader announcement of unread notification count.
- Decorative icons hidden from the accessibility tree where the control already has a label.
- Bottom navigation position respects device safe-area insets (notably iOS home-indicator area).
- No changes to policy, payment, commission, claims, or role authorization logic.

## Role-by-role findings and next steps

### Customer
- Keep the next action obvious: continue a quote, pay an approved order, view an issued policy, or continue a claim.
- Show a clear status timeline and explain what the customer must do next; distinguish waiting on SurePath, insurer, and customer.
- Keep purchase and claim upload flows usable at narrow widths, with visible validation and retry states.

### Agent
- Prioritize quote creation, customer follow-up, policy status, and available/withdrawable commission.
- Show commission as pending, approved, and available-to-withdraw separately; avoid presenting unsettled amounts as withdrawable.
- Ensure quote/customer actions remain reachable on mobile without hiding important status or validation text.

### Admin / Finance
- Keep role-based menu visibility and backend authorization authoritative; hiding a menu item is not a security boundary.
- Emphasize operational queues, aging/SLA, payment/withdrawal exceptions, and reconciliation differences before vanity metrics.
- Require confirmation for destructive actions and provide audit context for approvals, edits, and financial adjustments.

### Operator
- Prioritize a single actionable work queue with clear status, owner, age, and next step.
- Make filters/search usable on mobile and preserve unsaved notes when changing views.
- Keep customer PII and document previews minimized to what the task requires.

### Insurer
- Prioritize submissions needing review, missing information, decision status, and SLA/age.
- Make approve / request-information / decline visually distinct and require notes where the business workflow requires them.
- Clearly separate underwriting decisions from payment and policy-document issuance states.

### B2B
- Make submission creation, quote comparison, and submission status the primary navigation path.
- Surface missing data before submission and show a durable reference number plus status after submission.
- Keep account-level visibility scoped to the authenticated organization.

## Recommended delivery order

1. **P0 — Safety and usability:** keyboard focus, screen-reader semantics, safe-area handling, readable validation/errors, and role-gated navigation verified against server-side permissions.
2. **P1 — Workflow clarity:** role-specific status timelines, next-action prompts, queue aging/SLA, and clear financial state labels.
3. **P2 — Polish and performance:** consistent spacing/type/empty states, responsive tables/cards, loading skeletons, and reduced-motion behavior.

## Verification checklist for each role

- Desktop and narrow mobile viewport (320–390 px).
- Keyboard-only navigation with visible focus.
- Screen-reader labels for icon-only controls.
- Loading, empty, error, and retry states.
- Role boundary checks with accounts of the intended role.
- No changes to policy, payment, commission, or claim outcomes in UI-only PRs.
