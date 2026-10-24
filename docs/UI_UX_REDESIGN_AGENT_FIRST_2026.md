# SurePath UI/UX Redesign — Agent-First, October 2026

## Objective

Deliver a visibly fresh, premium, mobile-first experience across every SurePath surface while preserving the existing brand, workflows, authorization, pricing, and data semantics. This is a product redesign, not a cosmetic recolour.

## Design direction

- **Brand:** deep emerald and forest green as the anchor, crisp white and soft sage surfaces, restrained lime for progress, and a small orange accent only for attention states.
- **Personality:** confident, calm, precise, modern financial product; avoid excessive glass effects, decorative gradients, oversized mascots, and crowded dashboard cards.
- **Typography:** clear hierarchy, readable body copy, tabular numerals for money, avoid all-caps microcopy for important data.
- **Surfaces:** consistent spacing, subtle borders, modest shadows, 16–22px card radii, clear separation between primary and secondary actions.
- **Motion:** short, purposeful transitions; no motion that delays quotes, payments, approvals, or claim submission. Respect `prefers-reduced-motion`.
- **Accessibility:** WCAG AA contrast, visible keyboard focus, labelled controls, 44px minimum touch targets, safe-area support, 16px minimum mobile form text, meaningful empty/loading/error states.
- **Assets:** use the approved SurePath logo and managed portal icon assets exactly as provided. Never redraw, approximate, or substitute the brand mark.

## Agent app — flagship redesign

The Agent experience is the priority because it is the primary revenue workflow. Design around these jobs, in order:

1. **Start a quote** — prominent, single-tap primary action; resume a saved quote when one exists.
2. **Follow up with clients** — actionable leads, clear next step, and recent activity without fabricated urgency.
3. **Track policy progress** — understandable states from quote to payment, review, issuance, and claims; distinguish action required from waiting.
4. **Understand earnings** — available balance, pending commission, month-to-date commission, and withdrawal status must be clearly distinguished and sourced from actual data.
5. **Manage work** — clients, policies, claims, renewals, network, notifications, and profile remain discoverable without overcrowding the home screen.
6. **Use Pathy as a helper** — useful contextual assistance that does not obscure primary actions.

Agent home layout:
- Compact greeting and agent tier/status.
- One clear primary quote action and optional resume-draft banner.
- A restrained earnings summary with clear labels and a transparent target indicator.
- Small operational KPI row (open quotes, clients, policies) with no duplicated metrics.
- Quick actions with consistent icons and labels.
- Recent commission and renewal tasks with honest empty/loading/error states.
- Bottom navigation remains stable, thumb-reachable, and safe-area aware.

Agent quote builder:
- Progressive steps with a visible step count.
- One dominant action per step; clear back/edit affordances.
- Keep premium, coverage, insurer, discount, and commission breakdown understandable.
- Validation errors inline, retain user input, and never imply a quote or policy is confirmed before the backend confirms it.

Agent wallet:
- Separate available, pending, and lifetime amounts.
- Make withdrawal fees, eligibility, approval status, and expected next step visible before confirmation.
- Never present a requested withdrawal as paid until the authoritative backend status says so.

## Other portals

- **Customer:** prioritize continue purchase, payment due, issued policies, and claim status. Show a readable status timeline and next required action.
- **Admin:** information-dense desktop workspace with strong hierarchy, stable tables, filters, clear approval/financial states, and visible destructive-action safeguards.
- **Operator:** queue-first operations console; surface waiting age, priority, owner, and next action without hiding exceptions.
- **Insurer:** clear review queue, policy and claim context, decision actions, and payment/issuance status; never invent product details or customer information.
- **B2B:** fast submission creation, request tracking, quotes, and status visibility; use concise labels that fit narrow screens.
- **Public website:** consistent typography and brand system, fast mobile performance, accessible CTAs, and SEO metadata that matches real products.

## Engineering rules

- Preserve authentication, role checks, RLS, Supabase gateway patterns, insurer token semantics, pricing calculations, commission rules, and payment/claim state transitions.
- Prefer shared, scoped design tokens and reusable components over duplicated one-off styles.
- Avoid broad selectors that alter transactional controls or hidden portal screens unintentionally.
- Keep all text bilingual wherever the current app supports Indonesian and English.
- Do not introduce dependencies for visual polish unless a concrete requirement cannot be met with the existing stack.
- Keep responsive behavior correct at 320, 360, 390, 768, 1024, and desktop widths.
- Do not mark work complete based on source inspection alone.

## Acceptance gates for each rollout

- [ ] Review before/after screenshots for every changed portal and both themes.
- [ ] Check mobile widths 320/360/390px and desktop layouts.
- [ ] Verify keyboard navigation, focus visibility, screen-reader labels, and reduced motion.
- [ ] Test empty, loading, error, long-value, and success states.
- [ ] Run TypeScript, lint, build, unit tests, and browser smoke tests.
- [ ] Confirm no changes to auth, role permissions, pricing, payment, commission, policy, or claims behavior.
- [ ] Deploy preview first; inspect the preview; only then merge and verify production.
- [ ] For Android, separately rebuild/sync the Capacitor package; a Vercel deploy does not update an installed native APK.

## Rollout sequence

1. Agent design system and home/quote/wallet flows.
2. Customer purchase, policy, and claim journeys.
3. Admin, Operator, Insurer, and B2B shared shell and work queues.
4. Public website consistency and cross-portal accessibility pass.
5. End-to-end smoke tests, release notes, and production verification.

This file is the source-of-truth design brief. Record implementation status and evidence in the pull request; do not treat this brief as proof that a screen has shipped.
