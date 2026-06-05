# SurePath — Remediation Checklist & Follow-up Notes

> Living tracker for the multi-agent remediation effort. Update statuses as slices land.
> Status keys: ⬜ todo · 🟡 in progress (agent) · ✅ done & deployed · 🔒 reserved (lead-only) · ⏭️ deferred/follow-up

Last updated by lead: Batch 2 (app-misc + custwiz + security gateway) deployed 4c3fec3.

---

## 0) Live-DB verification (done by lead)

Verified against Supabase project `uyjgeteelnswphyzkjwi`:
- RLS is ENABLED on all financial tables, BUT the policies are wide-open:
  - `sp_policy_orders` → `anon_all_policy_orders` = role **anon**, cmd **ALL**, `USING(true)` / `WITH CHECK(true)`
  - `sp_payments` → `anon_all_payments` = anon, ALL, true/true
  - `sp_claims` → `sp_claims_open` = ALL roles, true
- ⇒ QA CRITICAL-4 is REAL. Public anon key can read/write all orders/payments/claims.
- The data-gateway edge function IS deployed (login works), but order/claim reads+writes still go DIRECT via anon key in `services/supabaseService.ts` (createPolicyOrder ~L676, getCustomerOrders ~L696, getCustomerClaims ~L707).

---

## A) SECURITY / DB  🔒 lead-controlled (agent preps code; lead applies prod migration)

- ✅ Add data-gateway actions: `create_policy_order`, `get_my_orders`, `get_my_claims`, `get_my_payments` (service_role, validate amounts/ownership server-side).
- ✅ Route `services/supabaseService.ts` (createPolicyOrder / getCustomerOrders / getCustomerClaims) through `callGateway(...)` — keep function signatures stable so wizards don't change.
- ✅ Deploy data-gateway (additive, safe) — v3 deployed 2026-06-05.
- 🔒 Apply RLS lockdown migration (drop `anon_all_*` / `sp_claims_open`; add scoped self-only SELECT + service_role policies) — LEAD applies after deployed code verified, to avoid breaking live buy flow.
- ⬜ Re-run `get_advisors security` after lockdown.

## B) OJK RATES & CONSTANTS  (agent: RATES)  ✅ DEPLOYED (2d1852f)

- ✅ HIGH-1: R3/Cat2 (126–200M) comprehensive 2.69% → 2.08% (= CAR_COMP_MIN[2][3]; lead-verified).
- ✅ HIGH-2: Flood 0.05%→0.15%, Earthquake 0.10%→0.12%.
- ✅ MED-4: `constants.ts::getOJKRate` now mirrors `services/ojkRates.ts` MIN tables (single source of truth); customer & agent price identically.
- ✅ MED-5: De-duped `AUTHORIZED_WORKSHOP_RATE` (single top-level export).
- ✅ MED-6: `BASE_COMMISSION_PERCENT=25` unchanged + `// TODO confirm vs OJK cap` added.

## C) CUSTOMER BUYING FLOW  (agent: CUST-WIZ)
Owns: `TravelInsuranceWizard.tsx`, `CustomInsuranceWizard.tsx`, `MPARInsuranceWizard.tsx`, `CarInsuranceWizard.tsx`, `car-wizard/*`, `PaymentRedirect.tsx`

- ✅ CRIT-1: Travel KYC inputs (name, NIK, email, birthDate) now controlled state; traveler data submitted to order + invoice.
- ✅ CRIT-2: CustomInsuranceWizard routes through `createPolicyOrder` + `createXenditInvoice`; shows confirmation screen with payment link.
- ✅ HIGH-3: CC option + decorative card form removed from StepPayment; 2-col grid; button renamed "LANJUT KE TAGIHAN".
- ✅ HIGH-4: PaymentRedirect polls `get_my_orders` (6×, 3s) for PAID/ISSUED; shows verifying spinner; timeout shows amber processing note.
- ✅ MED-3: MPAR AI fail sets `aiError` state; shows red banner + "Coba Lagi" + "Lanjut Tanpa Scan" — no silent hard-block.
- ✅ MED-2: `loading` prop wired into StepPayment button disable + spinner.
- ✅ MED-8: `discountType` default changed to PERCENT; premiumBreakdown branches on NOMINAL vs PERCENT correctly.
- ✅ LOW-4: `alert()` replaced with inline error UI in TravelInsuranceWizard, CustomInsuranceWizard, MPARInsuranceWizard.
- ✅ LOW-5: "Terorisme & Sabotase" toggle added to StepCoverage (was calculated in premiumBreakdown but had no UI).

## D) AGENT APP  (agent: AGENT-APP)  ✅ DEPLOYED (2d1852f)

- ✅ CRIT-3: Travel→TravelInsuranceWizard, PA→PAInsuranceWizard, MPAR→MPARInsuranceWizard wired in agent context; no "Segera hadir" stubs left. Car/Motorcycle/Life unchanged.

## E) APP / MISC  (agent: APP-MISC)
Owns: `App.tsx`, `components/ContactPage.tsx`, `components/customer/CustomerPortal.tsx`, `.env.example`

- ✅ HIGH-5: `getUserTcStatus` now called in localStorage restore branch; sessions never skip T&C gate.
- ✅ LOW-1: Session written to `localStorage` on login; survives page reload.
- ✅ LOW-2: Bell wired to `getNotifications`; red dot only shows when `unreadCount > 0`; click-away panel with empty state.
- ✅ MED-1: ContactPage submit opens `mailto:` with prefilled subject/body; inline confirmation shown.
- ✅ LOW-3: `.env.example` replaced with placeholders (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY / VITE_ADMIN_KEY).
- ✅ HIGH-6: `buy-health-ind` in CustomerPortal now shows amber notice ("konsultasi, bukan pembelian") before HealthChat.

## F) HOUSEKEEPING / GUIDELINE

- ⏭️ MED-7: Oversized files (`VehicleUnderwritingWizard.tsx` 1912, `supabaseService.ts` ~2432, `App.tsx` 1035) exceed 500-line CLAUDE.md guideline → refactor later (not a functional bug).
- ✅ Remove dead `HashRouter` wrapper in `index.tsx` (done in Batch 4).

## G) ARCHITECTURE — domain/folder separation (Opsi A)  ⏭️ Phase 2 (after fixes land)
Path-based portals: `/app` (customer), `/agent`, `/admin`, `/b2b` on same domain.
- ⬜ App.tsx: redirect to role path on auth success + session restore; add path+role guards in dispatch block.
- ✅ Remove dead `HashRouter` in `index.tsx` (Batch 4).
- ⬜ Sync internal portal tab nav → URL sub-paths (CustomerPortal/AdminPortal/AgentPortal/B2BPortal).
- ✅ Add role guard to `/insurer-portal`: CUSTOMER/AGENT redirect to home; admins + unauthenticated (token-flow) allowed (Batch 4).
- ✅ vercel.json SPA rewrite already supports it (no change needed).

## H) FEATURE BACKLOG (planner output) — Top 10 quick wins  ⏭️ after remediation
1. ✅ WhatsApp floating CTA (SiteLayout.tsx — Batch 4)  2. Policy PDF download (customer)  3. Motorcycle calculator tab
4. Live e-wallet payments (OVO/DANA/GoPay/QRIS)  5. Customer notification bell+panel
6. Contextual AI coaching tip (AgentHome)  7. ✅ Commission forecast slider (AgentHome.tsx — Batch 4)  8. Promo-code analytics (admin)
9. Agent activation funnel (admin)  10. FAQ + JSON-LD schema (SEO)
(Full list incl. Agent Finder, blog CMS, renewal self-service, OJK regulatory export, real fraud detection
replacing NeuralGuard simulation, audit-log viewer — retained in planner report.)

---

## DEPLOY LOG
- 2d1852f → main: Batch 1 = OJK rates (B) + agent marketplace (D).
- 4c3fec3 → main: Batch 2 = app-misc (E), custwiz (C CRIT-1/2 + LOW-4), security gateway (A ✅ frontend + gateway v3).
- bcffd77 → main: Batch 3 = HIGH-3/4, MED-2/3/8, LOW-4/5 (all C-section items now done).
- data-gateway v3 deployed to Supabase project uyjgeteelnswphyzkjwi (2026-06-05).
- ✅ RLS lockdown applied: anon_all_policy_orders / anon_all_payments / sp_claims_open DROPPED. get_advisors confirms no rls_policy_always_true on financial tables.
- 111a296 → claude/insurtech-mobile-app-RvOFd: Batch 4 = insurer-portal guard (G), HashRouter removal (F/G), health notice (HIGH-6), .env.example (LOW-3), WhatsApp CTA (H#1), commission slider (H#7).
- Stray worktree `agent-a67450ab71f875b29` discarded.
