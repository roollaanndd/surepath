# SurePath App Revamp — Execution Brief & Master Prompt

**Status:** IN PROGRESS — specification and implementation record  
**Owner approval:** User-approved direction from prior SurePath UI/UX revamp discussions  
**Last updated:** 2026-10-23  
**Related specification:** [DESIGN_SYSTEM.md](./DESIGN_SYSTEM.md)  
**Scope:** Customer App, Agent App, shared authenticated app navigation and relevant shared UI. Admin dashboard is a separate workstream unless explicitly added.

> **Important status note:** This document is the source of truth for the approved target and execution tracking. A design proposal, CSS foundation, preview deployment, or a successful HTTP response does **not** mean the full revamp is complete. Current changes to Agent Home and Agent Wallet are incremental polish only; they do not satisfy the complete redesign described here.

---

## 1. Approved product and visual direction

Build a visibly new, cohesive SurePath app experience—not a cosmetic CSS-only pass.

- **Brand:** SurePath; retain approved logo and app icon assets. Do not replace them with generic symbols.
- **Visual language:** premium, modern, calm, enterprise-ready insurtech.
- **Palette:** dark forest green, emerald, restrained lime gradient; neutral white/soft-gray surfaces. Orange may only be used as a restrained secondary accent where it already belongs in the current design system.
- **Typography:** clear hierarchy using the existing supported font stack (Sora/Inter or equivalent already bundled). Avoid inconsistent weights and tiny labels.
- **Surfaces:** intentional spacing, consistent radius, clear card hierarchy, subtle shadows and restrained glass effects. Avoid excessive gradients, excessive glassmorphism, clutter, and decorative effects that reduce readability.
- **Navigation:** predictable, thumb-friendly mobile navigation with clear active state and no scroll-jump or unexpected return-to-top behavior.
- **Motion:** purposeful short transitions, meaningful loading/success feedback, tasteful animation only where it improves comprehension. Respect `prefers-reduced-motion`.
- **Responsive behavior:** design mobile-first, then tablet/desktop. No clipped cards, horizontal overflow, overlapping fixed navigation, or inaccessible forms on narrow phones.
- **Accessibility:** visible focus, semantic labels, readable contrast, keyboard access, and minimum 44×44px touch targets.

## 2. Master prompt for implementation

Use this prompt as the standing instruction for every implementation session and coding agent:

> You are the senior product designer and frontend engineer responsible for completing the approved SurePath App Revamp in the `roollaanndd/surepath` repository.
>
> Read `docs/DESIGN_SYSTEM.md` and `docs/AGENT_APP_REVAMP_EXECUTION.md` before changing code. Audit the actual current implementation and compare it against the approved target. Implement the revamp screen-by-screen in real components; do not stop after adding global CSS, class names, a proposal, screenshots, or a checklist.
>
> Deliver a coherent, visibly upgraded product experience across the Customer App and Agent App: home/dashboard, onboarding/auth where in scope, navigation, quote/purchase flows, client CRM, policies, claims, commissions/wallet, performance, notifications, profile, and relevant empty/loading/error states. Reuse shared components and approved brand assets. Make responsive behavior and interactions intentional.
>
> Preserve all existing business behavior: Supabase authentication and authorization, database schema/RLS, API contracts, premium and commission calculations, OJK rating rules, policy/claim/wallet/withdrawal transaction semantics, payment flows, route behavior, and role permissions. Do not fake data or replace real functionality with static mockups. If a required behavior is broken or ambiguous, document it and isolate the fix rather than silently changing business rules.
>
> Work in small reviewable branches/PRs. For each screen, inspect the existing component and data flow first, implement the actual screen, run available lint/type/build/tests, inspect the Vercel preview, and test responsive layouts and key interactions. Fix failures before merge. Merge only when preview/build checks pass and the diff is safe. Verify the resulting production deployment and domain after merge.
>
> Maintain this execution document as work progresses. Update the screen checklist and log each PR, commit, deployment URL/status, tests run, known limitations, and verification evidence. Never mark an item complete based only on code being committed or a deployment returning HTTP 200. Never claim end-to-end or on-device PWA validation unless it was actually performed.
>
> **Definition of done:** the screen visibly matches the target direction, works at narrow/mobile and desktop widths, preserves its real data and business behavior, passes relevant checks, has a successful preview, is merged/deployed where approved, and has recorded verification evidence.

## 3. Screen-by-screen acceptance checklist

Mark an item **DONE** only after implementation and verification—not when it is merely planned or styled in a shared stylesheet.

### Shared foundation

- [ ] **S1 — Brand and design tokens:** verify actual logo/icon assets, color tokens, typography, spacing, surfaces, shadows, focus states, dark mode, and reduced motion.
- [ ] **S2 — Shared UI primitives:** consistent buttons, inputs, badges, cards, skeletons, empty/error states, dialogs/bottom sheets, and status feedback.
- [ ] **S3 — Navigation and scroll behavior:** active states, safe-area padding, no unexpected scroll-to-top, no content hidden behind fixed navigation, correct back/forward behavior.
- [ ] **S4 — Responsive and accessibility pass:** narrow phone (320–380px), standard phone, tablet/desktop; keyboard focus, contrast, touch targets, reduced motion.

### Customer App

- [ ] **C1 — Authentication/onboarding:** polished login/register/onboarding, clear validation and loading/error feedback; preserve auth behavior.
- [ ] **C2 — Home/dashboard:** clear protection/status summary, prioritized actions, policies/activity, purposeful visual hierarchy and animation.
- [ ] **C3 — Insurance product discovery:** coherent product cards, icons, coverage explanation, premium/eligibility clarity.
- [ ] **C4 — Quote/purchase wizard:** consistent stepper, form UX, review/confirmation, payment handoff and error recovery; calculations unchanged.
- [ ] **C5 — Policy wallet and details:** readable policy status, coverage, documents, renewal actions and transaction history.
- [ ] **C6 — Claims:** submit, upload, timeline/status, details and empty/error states; existing claim semantics preserved.
- [ ] **C7 — Protection score / activity:** modern, understandable score visualization and history; no misleading data or decorative generic people icons.
- [ ] **C8 — Profile, notifications and settings:** consistent screen structure, unread states and accessible controls.

### Agent App

- [ ] **A1 — Home/dashboard:** actionable KPI hierarchy, quick actions, recent clients/commissions, charts only where backed by real data.
- [ ] **A2 — Quote builder:** polished client/product/vehicle steps, validation, premium breakdown, review and sharing/purchase handoff.
- [ ] **A3 — Client CRM:** search/filter, client list/detail, add/edit/delete confirmation, policy association and clear empty/loading/error states.
- [ ] **A4 — Commission:** earned/pending/paid breakdown, trends and product filters with correct existing calculations.
- [ ] **A5 — Wallet/withdrawal:** available balance, withdrawal history, bank account, confirmation/error states and approval semantics preserved.
- [ ] **A6 — Policies and order status:** clear status progression, details and next actions.
- [ ] **A7 — Claims:** understandable submission and status tracking, with existing data flow intact.
- [ ] **A8 — Performance/leaderboard:** legible charts and rank context based on actual values.
- [ ] **A9 — Notifications:** category filters, unread indicator, mark-read behavior and useful empty states.
- [ ] **A10 — Profile/network/renewals/endorsements:** consistent layout and working navigation/actions across these secondary screens.

## 4. Engineering and safety guardrails

1. **No CSS-only completion.** Each checklist item requires component-level implementation where needed.
2. **No regression to business logic.** Keep visual changes isolated; if behavior changes are necessary, separate them into a reviewed change with explicit tests.
3. **No fake completion evidence.** A READY deployment proves deployment readiness, not that all screens or user journeys work.
4. **No broad global selectors without scope.** Prefer component-root classes and shared tokens; avoid regressions across Customer, Agent, Operator, Insurer, B2B and Admin portals.
5. **No hidden scroll bugs.** Check long pages, sticky headers, menus, modals, bottom sheets, and scroll position after state updates/navigation.
6. **No generic icon substitutions.** Reuse approved SurePath iconography/assets; create consistent custom assets where necessary.
7. **No merge without checks.** Preview/build and available CI must pass; inspect the diff and check for conflicts first.
8. **PWA/device validation is separate.** Test install/update behavior on a real supported device before claiming the installed app is updated. A browser deployment alone is not proof.

## 5. Current implementation record (2026-10-23)

This record intentionally distinguishes incremental work from the full target.

| Item | Current evidence | Status |
|---|---|---|
| Design-system target | Existing `docs/DESIGN_SYSTEM.md` contains the broad UI/UX specification and roadmap | SPEC EXISTS; implementation not proven complete |
| Shared Agent visual foundation | PR #248 merged; scoped premium styling added | PARTIAL |
| Agent Home | PR #249 merged; root/section classes and home-specific responsive polish | PARTIAL — not a complete dashboard redesign |
| Agent Wallet | PR #250 merged as commit `ef6242827dfa82d18eea7b162e726b4d2dd75bf8`; production deployment ID `dpl_5S85RVCn3LpQUeS5Z8WEvWcmEkfF` observed READY with `myinsurepath.com` alias | DEPLOYED — limited visual polish only |
| Agent CRM + Commission | PR #251 opened; component-root classes and scoped focus/touch/responsive styling added. At last check, Vercel preview was QUEUED. | IN PROGRESS — do not mark deployed |
| Customer App full redesign | No completion evidence recorded in this workstream | NOT VERIFIED / NOT COMPLETE |
| Agent Quote Builder, policies/order status, claims, performance, notifications, profile, network, renewals, endorsements | Full component-level revamp and end-to-end verification not yet recorded | NOT VERIFIED / NOT COMPLETE |
| Scroll-to-top issue in admin dashboard | Requires its own reproduction and verified fix record; do not assume resolved by Agent styling | NOT VERIFIED |
| PWA installed-app update on physical device | No on-device test evidence recorded | NOT VERIFIED |

**PR references**
- [PR #248 — Agent visual foundation](https://github.com/roollaanndd/surepath/pull/248)
- [PR #249 — Agent Home polish](https://github.com/roollaanndd/surepath/pull/249)
- [PR #250 — Agent Wallet polish](https://github.com/roollaanndd/surepath/pull/250)
- [PR #251 — Agent CRM and Commission polish](https://github.com/roollaanndd/surepath/pull/251)

## 6. Execution log

Append a new entry after each meaningful implementation/verification milestone.

### 2026-10-23
- Recorded the approved revamp direction as an actionable execution brief and reusable master prompt.
- Documented that existing Agent Home/Wallet changes are incremental polish, not completion of the approved full redesign.
- Added screen-level acceptance criteria and a status ledger so future work can be audited against the approved target.
- Next: finish preview/checks for PR #251; then continue actual component-level implementation through Agent Quote Builder and remaining Agent screens, followed by the Customer App screens. Update this log with evidence after each milestone.

## 7. Required update format for future log entries

Use this format so status remains auditable:

```md
### YYYY-MM-DD — [screen/workstream]
- **Scope:** exact screens/components changed
- **PR/commit:** link and SHA
- **Preview:** URL + final Vercel state
- **Checks:** lint/type/build/tests and result
- **Functional verification:** flows actually exercised
- **Production:** deployment ID/state/domain, if merged
- **Known gaps:** unresolved issues
- **Checklist:** items moved to DONE, with reason/evidence
```
