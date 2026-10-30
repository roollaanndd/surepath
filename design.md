# SurePath — Design Guideline (design.md)

> Implementation-ready repository guideline for the **approved visual system
> and UX principles**. Codified from implemented tokens and components
> (repo v2.7.14) plus owner-approved direction statements (signal: admin
> light-first). Companion file: [`product.md`](product.md). Deeper references:
> `docs/DESIGN_SYSTEM.md`, `docs/SUREPATH_MASTER_UI_SYSTEM.md`,
> `design-proposals/2026-10-admin-agent/` (admin/agent mockups).
>
> Rule: this file may codify *direction*; it may not claim direction is
> *shipped* — every shipped/unshipped claim must match the delta register
> in §15. Preserve existing behavior and business logic unless the owner
> explicitly approves the change (see §16).

---

## 1. Approved style statement

**Clean, modern, minimal enterprise** — a light canvas that carries the brand
through disciplined green accents, generous whitespace, and information
hierarchy rather than decorative effects. Polished, composed, and calm:
surfaces are white, type is structured, color is meaningful (status, brand,
primary actions), and every interaction state is designed.

- **Light-first everywhere.** Admin is white/light-first **without dark
  mode** (owner-approved; see §4). Consumer-app canvases (`sp_dark_mode`) keep
  their existing dark-mode support.
- **Brand palette:** dark green / emerald / lime family (SurePath greens) with
  restrained **orange accent** (login screens and rare emphasis moments use
  green primary + orange accent).
- **Every state matters:** loading, empty, error, success, disabled, and
  permission-gated states get designed, tested, and reviewed like happy paths.

## 2. Tokens are the only colors

Implemented in `styles.css` (`:root` light / `.dark` dark twins) and
`tailwind.config.cjs` (`ds-*` utilities, `text-2xs` floor). **No hex literals
in `components/ui/**`** (existing guardrail) — new work uses tokens
everywhere.

### 2.1 Core light tokens (`--ds-*`, verified values)

| Token | Value | Use |
|---|---|---|
| `--ds-bg` / `--ds-surface` | `#FFFFFF` | Canvas / cards & sheets |
| `--ds-surface-2` | `#F3FAF6` | Subtle mint inset surface |
| `--ds-surface-hero` | gradient `#003B2F → #005240 → #003B2F` | Dark-emerald hero cards |
| `--ds-border` / `--ds-border-strong` | `#E0EEE5` / `#B9D9C5` | Borders / focused inputs, dividers |
| `--ds-text-primary` / `secondary` / `muted` | `#0F172A` / `#4B5563` / `#616875` | Type hierarchy |
| `--ds-text-inverse` | `#FFFFFF` | On dark/hero surfaces |
| `--ds-primary` / `--ds-primary-hover` | `#00C16A` / `#009E52` | Primary action (SurePath green) |
| `--ds-primary-tint` | `#E6FAF0` | Tinted backgrounds |
| `--ds-primary-hero` / `--ds-primary-on-dark` | `#003B2F` / `#00E07A` | Dark-emerald / on-dark greens |
| `--ds-success` / warning / danger / info | `#00C16A` / `#F59E0B` / `#EF4444` / `#3B82F6` (+ tints `#E6FAF0` / `#FEF3C7` / `#FEE2E2` / `#DBEAFE`) | Status semantics only |
| Text on status tints | e.g. warning-text `--ds-warning-text #B45309` — each tint ships with its own on-tint text token | Text on tint chips |

### 2.2 Cross-app brand tokens (`--sp-*`, verified values)

`--sp-brand-forest #064E3B`, `--sp-brand-emerald #059669`,
`--sp-brand-bright #10B981`, `--sp-brand-mint #ECFDF5`,
`--sp-brand-orange #F97316`, `--sp-brand-orange-soft #FFF7ED`,
`--sp-text-primary #102A23`, `--sp-text-secondary #64748B`.

Usage rules:
- **Orange is an accent, not a rival.** Approved placement: login screens
  (green primary CTA + orange highlight), rare attention moments. Never for
  money/correctness; danger stays red (`#EF4444`).
- **Greens rank:** `forest` (authority/hero) → `emerald`/`bright` (actions,
  active states) → `mint` (backgrounds) → `primary-hover` for pressed
  states. Do not re-shuffle rankings per portal.
- Existing labels may not be reinterpreted (e.g. "palette only"
  tier colors GOLD/SILVER are decoration, **not** tier semantics).

## 3. Typography

- Type stack per Tailwind default + loaded webfont; **font size floor is
  `text-2xs` = 11px** (`0.6875rem`, lineHeight 1.45, `tailwind.config.cjs`).
  Sizes below 11px (`text-[10px]` and smaller) are forbidden in new/edited
  code; migrate existing ones when touched (debt register §15).
- Hierarchy through weight/size/color, **not** through micro text or ALL-CAPS.
- Color mapping is fixed: headings `--ds-text-primary`; body `secondary`;
  captions `muted` ≥ 11px; on-hero use `--ds-text-inverse` /
  `--ds-primary-on-dark`.
- Numerals in money/reporting contexts use tabular alignment where the
  component supports it; never fake currency formatting (formatIDR helpers).

## 4. Theme policy (APPROVED — includes migration register)

| Surface | Approved state |
|---|---|
| Admin CMS | **Light-only.** No dark theme, no auto-hours. Mockups: `design-proposals/2026-10-admin-agent/admin-a|b.html` |
| Customer / Agent (executable apps) | Support `sp_dark_mode` (manual toggle, `dark` class on `<html>`), hero escapes per portal |
| Public website | Light-first marketing style |
| Insurer / B2B / Marketing / Operator | Follow token system; verify both modes only where the surface opts into dark |

Current code **delta to resolve (owner-approved, not yet executed as a
feature):** ~~`components/admin/themeMode.ts` implements `auto|light|dark`
(auto-dark 18:00–06:00, #326) and v2.7.13 shipped admin dark twins in
`src/styles/portal-modernization.css`.~~ **EXECUTED in v2.7.17** (2026-10-30):
`themeMode.ts` removed, the AdminPortal shell is light-only (it forces
light on `<html>` for the CMS session and restores the customer/agent
`sp_dark_mode` preference on unmount, never writing that shared key), the
admin-side dark-mode Settings card (mode buttons + auto-hours schedule) was
removed, all admin dark-bar props (`darkMode`/`onToggleDark`) were dropped
from the workspace dashboards and `WorkspaceShell`, the admin dark twins
were cut from `portal-modernization.css` (verified: zero dark-activated
admin selectors remain; the global/agent/operator dark rules stay per the
surface table above), and `adminThemeMode.test.ts` is replaced by a
light-only anti-drift guard suite. Admin dark themes must not be
re-introduced without a new owner decision; the remaining admin visual
work is only the pixel-level converge pass against the resolved mockups
(`admin-a.html`), tracked in §15.

## 5. Spacing, radius, elevation

- Spacing follows Tailwind's scale via components; do not invent numeric
  magic-values per screen. Compose surfaces as `bg (page) → surface (card)
  → surface-2 (inset)`.
- Radius and elevation follow existing shared components
  (`components/ui/**`, cards/sheets). New components must reuse existing
  primitives first (e.g. `PortalHeader`, `PortalTabBar`, `InstallAppSheet`,
  `Skeleton`); duplicating a primitive is a review blocker.
- Layout-safe behaviors: admin tables wrapped in `overflow-x-auto`;
  operator is card-based (no `<table>`) to survive narrow screens;
  bottom-nav apps reserve safe-area insets (Capacitor).

## 6. Icons & imagery

- One icon system per surface family: shared duotone recipes
  (`components/shared/duotone.tsx`, `CustomerIcons.tsx`, `SurePathIcon.tsx`)
  and the insurer brand-mark set (`InsurerLogos.tsx`) — draw new icons in the
  same grid/duotone language instead of mixing ad-hoc glyph sets or emoji.
- Icons carry **meaning** (action, status, emptiness), not decoration;
  interactive icons pair with a text label or an accessible name.
- Imagery: real product photography/logos from the verified brand set;
  placeholder photos of people/insurers are forbidden in marketing surfaces.

## 7. Forms & tables (enterprise hygiene)

**Forms:**
- Labels visible, required-field indicators, validation copy in Bahasa
  Indonesia next to the field, never alert-only.
- Errors are specific and diagnosable (`mapAiError` categories:
  session/quota/unconfigured/timeout/offline). A field-level failure message
  always tells the user what to do next.
- Inputs keep `--ds-border-strong` focus states; never strip focus rings.

**Tables/lists:**
- Wrap every table in `overflow-x-auto` (admin standard); sticky headers only
  inside scroll containers (never both page-level and column chaos).
- Rows are actionable only if affordances (buttons/links) are real controls;
  no fake buttons.

## 8. Empty / error / loading states (mandatory pattern)

Every async surface follows **`loading → error → content`** in that order and
never renders silent blankness:
- **Loading:** skeleton or spinner with context ("Memuat daftar polis…");
  product-list empty states explain *why* (which insurer active, which
  vehicle types/ages match) and what admin should check — implemented pattern
  in the agent wizard, replicate it.
- **Empty:** use tokenized empty states (dashed ad-hoc boxes are the debt
  being removed); copy offers the next action.
- **Error:** retry affordance, stable message, kept diagnostic hint; never
  "coming soon" for a broken feature (v1.56.0 lesson is policy).

## 9. Motion & micro-interactions (restrained)

- Durations 150–250ms for micro-transitions; entrance staggering only where
  implemented (dashboards), one style per portal.
- Respect `prefers-reduced-motion` everywhere (customer portal was fixed to
  do so; keep it for all new surfaces).
- Motion must never mask a state change (data changed → visible transition);
  no parallax/decorative loops in product surfaces. **Site marketing video
  is the exception and stays on the public site only.**
- Zoom lock exists **only in app mode** (PWA installed / Capacitor) via
  `appViewport`; browser tabs must remain zoomable (WCAG 1.4.4).

## 10. App-specific patterns (approved skeletons)

| Surface | Skeleton | Signature |
|---|---|---|
| Admin CMS | Rail + header, per-role workspace dashboard (`getAdminWorkspace`) | Light-first; 17 consolidated sections; approvals pending-first; **no dark mode** per §4 |
| Agent app | Portal shell `sp-modern-app sp-agent-premium`, header + tabs, profile avatar | Saturated brand hero, tier cards (palette-only colors), insurer comparison w/ brand marks + fallback copy |
| Customer app | Bottom nav (Beranda · Beli · **Pathy** · Klaim · Riwayat), header 70px w/ avatar | Pathy center-tab overlay via `PATHY_OPEN_EVENT`; wallet/coins surfaces |
| Operator app | Card-based queues, no tables | Hierarchized queue; error states in all screens (7/9 done — complete the rest) |
| Admin/insurer/marketing AI tools | Inline tooling, no persona | Admin-only (internal model auth differs) |
| Public website | Marketing layout w/ hero video, SEO prerender | ASO/copy discipline from `docs/SEO.md`; no invented contacts (NO invented phone numbers — one shared WA constant) |
| B2B portal | Corporate flows on shared primitives | Verify against both theme modes when primitive-level changes ship |
| Insurer portal | Token-gated review screens | `/insurerapp` + `/insurer-portal` token flow; email review links via `send-insurer-email` |

## 11. Responsive & accessibility requirements

1. Base responsiveness at 360px width; admin usable from ~1024–1280px with
   rail collapse; no fixed-width ≥ 300px in new code (19 existing are debt §15).
2. Contrast: body text ≥ 4.5:1; ≥ 3:1 for large text/UI components. On
   `--ds-surface-hero`, use inverse/on-dark tokens (already contrast-safe).
3. Touch targets ≥ 44px (survey/intake buttons already implementable pattern);
   keyboard focus visible everywhere; `div onClick` needs
   `role="button"` + keyboard handling (59 existing are debt §15).
4. Alt text for meaningful images (current coverage is good;
   keep 100%).
5. Language: Indonesian-first copy; keep `t('English','Indonesia')` helper
   convention for dual copy.

## 12. UX copy rules

- Plain, respectful, diagnostic. Follows the pattern set by `mapAiError`
  (tell the user *which* condition failed and the next step).
- Compliance wording: never assert covered/paid/approved states that belong
  to the insurer; use the indication vocabulary (`≈ / ≉ / ?`) from Pathy
  cards where implemented.
- Disclaimers are mandatory underneath informational answers (Pathy
  `data.disclaimer`) and must not be removable by tone changes.
- Never promise features that are parked (`(planned)` in `product.md`):
  no WhatsApp-stage marketing, no "sedang dalam pengembangan" proclamations
  for dead endpoints.

## 13. Implementation rules (CSS/SCSS conventions)

1. Styles live in `styles.css` (+ `src/styles/portal-modernization.css` for
   the modernization pass). New selectors: tokenized, mode-paired (see §4),
   and placed at the section matching their scope with a dated comment.
2. **Light+dark pairing rule for opted-in app canvases:** any
   `!important`-heavy light rule must have a `.dark` twin; admin is exempt
   (light-only) but must not carry leftover dark twins after the approved
   migration.
3. No hex literals in `components/ui/**`; no new global element resets;
   no `* { transition: all }`.
4. Do not break existing escapes (`[data-sp-preserve-light]`,
   `.text-white:not(…)`, `:not(.is-default)`) — read their comments first;
   they encode owner-approved exceptions.
5. Component expansion > component duplication. Shared components are
   ported, not re-invented, across portals.
6. Every visual change claim in a PR/docs must include verification
   (screenshot via Playwright, token audit, or before/after) — no
   "visual-only claims without verification".

## 14. Design QA checklist (run before any visual release)

- [ ] All text ≥ 11px (no `text-[10px]`/`text-[7px]` in the diff).
- [ ] No new hex literals in `components/ui/**`; new colors introduced as
      tokens only (count before/after).
- [ ] Interfaces render correctly in: light mode, `sp_dark_mode` (for app
      canvases, if touched), admin light-only (if admin touched).
- [ ] Loading, empty, error states exist for every new async surface.
- [ ] Focus order + visible focus on interactive elements; `div onClick`
      has role/keyboard support.
- [ ] 360px / 768px / 1440px spot-checked; tables scroll, nav safe-area ok.
- [ ] Contrast spot-check on new color combos (4.5:1 text / 3:1 UI).
- [ ] Motion respects `prefers-reduced-motion`.
- [ ] Icons from the shared sets; no emoji as primary icons.
- [ ] Copy in Indonesian, diagnostic on failure, disclaimers intact;
      no invented features/numbers/contacts (cross-check `product.md` §16).
- [ ] Playwright/visual verification attached to the PR for changed portals.

## 15. Design debt register (verified, may be fixed only via scoped batches)

Counts below are reproducible by text scan (method noted per row) and were
re-verified after merging main's admin-spec enforcement (#327–#328); they are
snapshots, not permanent truths — re-scan before acting on them.

| Debt | Current state (post-merge scan) |
|---|---|
| Sub-11px texts | 356 instances (`text-[9px]`/`text-[10px]`, components+src scan) — migrate to `text-2xs`/badge on touch; admin floor was enforced on main (#328) |
| Hex literals | ~1,130 hardcoded color instances outside tokens (`components/ui/**` code is clean — its remaining 4 hits are comment examples); start with status chips/legacy cards |
| Fixed widths ≥ 300px | 19 instances (`w-[300px…999px]` notation) — responsive-fit on touch |
| `div onClick` without role | 59 instances (scan: onClick without `role`/`tabIndex`/keyboard handler) — add semantics on touch |
| Admin visual migration | **Theme part DONE (v2.7.17)**: light-only enforced, `themeMode.ts` removed, admin dark twins cut (0 dark-activated admin selectors remain); remaining = pixel-level conver­gence pass against the resolved mockup (`admin-a.html`) |
| Side-tab accent border | `src/pages/HomePage.tsx:120` `borderLeft: 4px solid` — single verified antipattern of the v2.7.14 detector pass |
| Empty-state primitive | No shared EmptyState component exists in `components/ui/`; ad-hoc dashed boxes remain (e.g. `components/customer/CustomerPortal.tsx:529,571`) — adopt/insert a tokenized shared empty state when touching them |

## 16. Non-negotiable change rules

1. Preserve existing behavior and business logic unless the owner explicitly
   approved the change (agenda: research → plan → test → implement narrow →
   review → verify → document → commit → push → merge → verify deploy).
2. No broad refactors, no duplicate features, no fake controls, no
   destructive changes (files/tables/deploy health), no visual-only claims
   without verification.
3. Any conflict between this guideline and actual shipped behavior that
   matters to users is resolved by the OWNER, not silently: raise it,
   update this file, then change code.
