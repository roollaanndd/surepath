# SurePath Portal Navigation Audit — 16 October 2026

## Scope and confidence

This audit maps the current top-level navigation and the secondary destinations visible in source. It is a static source audit, not a claim of a full manual production-session test. No role permissions, authentication checks, policy calculations, claims, payments, or commission rules are changed by the accompanying navigation fix.

## Portal map

| Portal | Primary navigation | Secondary destinations / notes |
|---|---|---|
| Customer | Home, Buy, Claim, History; Pathy is a central overlay action | Profile is opened from the header avatar. Product selection opens the relevant purchase wizard; claim and policy history remain separate destinations. |
| Agent | Home, Policy, Quote (central action), Commission, Profile | Home quick actions open Clients, Claims, Leaderboard, Network, Renewals, and Endorsements. Commission's withdrawal action opens Wallet. These destinations are intentionally secondary and are not all duplicated in the five-item bottom bar. |
| B2B | Home, New Quote, Submissions, Quotes, Profile | Creating a submission returns to Submissions after a successful completion. Submission-to-quote navigation is handled by the submissions view. |
| Operator | Home, Orders, Claims, Withdrawals, Agents, Profile | Notifications and realtime events can refresh or route users to work queues; queue actions remain in their existing role context. |
| Insurer | Home, Orders, Claims, Payments, Profile | Realtime order/payment changes refresh the relevant views; insurer decisions remain in existing workflow components. |
| Admin CMS | Role-specific sidebar navigation and page content | High-impact controls must remain permission-gated in the backend; hiding menu entries is not an authorization boundary. |

## Fix made in this iteration

- Agent notification navigation now uses the same `handleTabChange` callback as the primary and home quick-action navigation. This increments the tab transition key and keeps the shared page-entry animation behavior consistent when a notification opens a destination.
- No change to the destination IDs, primary tab structure, data access, or authorization logic.

## Follow-up verification gates

- [ ] Confirm every secondary Agent destination has a visible entry point and a usable route back to Home/primary navigation.
- [ ] Exercise customer quote → review → payment hand-off and claim submission with a synthetic account.
- [ ] Exercise B2B submission → quote, Operator review/withdrawal, and Insurer decision/payment flows with role-appropriate test accounts.
- [ ] Validate narrow mobile, tablet, and desktop layouts and keyboard focus/contrast for every portal.
- [ ] Re-run the production dependency audit after remediation of the remaining `@capacitor/android`, `esbuild`, and `qs` advisories.
