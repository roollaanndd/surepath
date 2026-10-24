# SurePath Master UI/UX System

Status: approved implementation guideline  
Reference: user-supplied UNPIX Mobile screen composition, adapted for SurePath (do not copy UNPIX branding/assets).

## Product direction
SurePath is a premium, approachable, AI-first Indonesian insurtech platform. Shared visual language: clean white and pale-mint surfaces, emerald primary brand, restrained orange accent, rounded cards, soft elevation, recognizable consistent icons, and clear information hierarchy. The reference is guidance for composition and usability, not a literal banking UI to copy.

## Brand tokens
- Forest: #064E3B
- Emerald: #059669
- Bright emerald: #10B981
- Soft mint: #ECFDF5
- White: #FFFFFF
- Orange accent: #F97316
- Pale orange: #FFF7ED
- Primary text: #102A23
- Secondary text: #64748B
- Border: #DDEAE4
- Success: #16A34A; warning: #F59E0B; error: #DC2626

Use existing CSS variables in `styles.css` as the source of truth. Keep legacy aliases intact for compatibility. Never introduce a second competing token system or mass-replace legacy styles without validating affected screens. Dark mode must remain readable.

## Layout and interaction
- Mobile-first; support 320px+ phones, tablets, and desktop.
- Major surfaces: 24–32px radius; controls/cards use the closest existing radius token.
- Prefer solid white cards and subtle mint surfaces over heavy glassmorphism or cold gray panels.
- Use green for primary actions; orange only for selective emphasis and warnings.
- Keep touch targets at least 44px where practical; visible focus states and reduced-motion support are mandatory.
- No horizontal overflow, clipped dialogs, unstable navigation, or sticky controls covering content.
- Use existing icon and motion libraries; do not use emoji as production icons.
- Use approved SurePath logos/icons exactly as provided. Never redraw or distort official brand assets.

## Portal guidance
### Customer
Prioritize policies, coverage, claims, premium/payment status, insured assets, notifications, and simple mobile navigation. Use helpful illustrations only where they clarify onboarding or empty states.

### Agent
Prioritize quoting, customer management, STNK OCR, photo survey, underwriting status, policy issuance, claim tracking, commission wallet, withdrawals, and sales performance. Minimize repetitive data entry.

### Operator
Prioritize work queues, review exceptions, document verification, SLA/status visibility, and auditable decisions. Optimize for task completion and information density.

### Admin CMS
Use a stable desktop sidebar, responsive mobile navigation, accessible tables/filters, business metrics, user/agent/insurer management, products/commissions, policies/claims, finance, role access, and audit trails.

### Insurer and B2B
Where implemented, provide clear review queues, policy/claim details, portfolio reporting, partner performance, reconciliation, and organization controls. Respect existing authorization and role boundaries.

## Authentication
Use white-first surfaces, emerald-green branding, and restrained orange accents across customer, agent, operator, insurer, admin, and partner entry points. Preserve real Supabase Auth and insurer token flows, recovery/reset/verification behavior, session handling, and role checks. No simulated authentication success.

## Shared components
Prefer existing components and extend them instead of creating duplicates. Shared patterns should cover buttons, form fields, alerts, badges, cards, navigation, profile/notifications, loading/empty/error states, dialogs/sheets, policy/claim/premium summaries, document upload/OCR status, responsive tables, and IDR formatting. Components must implement loading, disabled, validation, focus, and error states where applicable.

## Engineering guardrails
1. Audit routes/components and approved requirements before changing code.
2. Preserve APIs, Supabase schemas/RLS, authentication, business rules, and payment/wallet behavior.
3. Do not hardcode customer records, balances, credentials, or privileged keys.
4. Avoid unrelated refactors and unnecessary dependencies.
5. Validate build, lint/type checks, unit tests, affected routes, and responsive behavior.
6. Document unfinished items and test limitations explicitly.
7. Use a feature branch and PR; merge only when checks and repository rules allow.
8. Deploy via the existing Vercel project. Do not migrate hosting or change DNS as part of UI work.
9. Only claim production success after Vercel confirms READY and the production alias/live screen has been checked.

## Acceptance checklist
- [ ] Shared design tokens and guidance are documented.
- [ ] Customer, agent, operator, admin, insurer and B2B screens are reviewed individually.
- [ ] Shared components consume the common tokens.
- [ ] Existing workflows, roles and authentication remain functional.
- [ ] Mobile/tablet/desktop layouts and accessibility basics are checked.
- [ ] Build, lint/type checks, and relevant tests are reported accurately.
- [ ] Changes are merged through the approved workflow.
- [ ] Vercel deployment and production verification are confirmed or clearly marked blocked.
