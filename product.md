# SurePath — Product Guideline (product.md)

> Implementation-ready repository guideline. Codified from the **actual
> implemented system** (repo state v2.7.14, branch `redesign/uiux-all-apps`),
> not from aspiration. Companion file: [`design.md`](design.md).
>
> Truth hierarchy for product decisions:
> 1. This file + `design.md` (guidelines, governed below)
> 2. `docs/PRD.md` (long-form PRD & roadmap), `docs/PROJECT_RECALL.md`
> 3. `.memory/CONTEXT.md` (session ledger of verified decisions & pitfalls)
> 4. Working rules: `AGENTS.md` (engineering workflow), `docs/PLAYBOOK.md`
>    (operational workflow)
>
> Maintenance: update a section the same commit that breaks its validity.
> Everything stated as "exists/expects" must trace to code or tests. When a
> feature is planned but absent, it MUST be labeled `(planned)` — never
> described as shipped.

---

## 1. Vision

**AI‑first Indonesian general‑insurance insurtech** that makes trustworthy
insurance journeys accessible to everyday customers and productive for
licensed agents: motor insurance and claims automation first, expanding to
other general-insurance lines. SurePath is the trusted operating layer
between three markets that currently transact through opaque, paper-based
channels — customers, licensed agents, and insurers — with an internal team
(operators/admins/marketing/finance) that runs the platform.

Success = customers can **buy a policy, pay, and file a claim** in minutes
with plain-Indonesian guidance (Pathy) and photo-evidence automation; agents
can **quote, compare insurers, submit, and earn commissions** without manual
paperwork; insurers receive **clean, reviewable submissions**; the platform
stays compliant with OJK/PSAKBI conventions and never over-promises coverage.

## 2. Target users (verified roles)

| Persona | Role (types.ts `UserRole`) | Primary surface |
|---|---|---|
| Customer / insured (Nasabah) | `CUSTOMER` | Customer app `/custapp` |
| Licensed agent (Agen) | `AGENT` | Agent app `/agapps` (legacy alias `/agentapp`) |
| Corporate client (korporat) | `B2B_CLIENT` | B2B portal (signed-in catch-all) |
| Insurer PIC / Penanggung | `INSURANCE_ADMIN` | Insurer portal `/insurerapp` (+ `/insurer-portal` token flow) |
| Internal operations staff | `OPERATOR` | Operator app `/operatorapp` (NOT the CMS) |
| Marketing / sales employee | `MARKETING` | Marketing CRM `/marketingapp` |
| Platform admin (per function) | `MASTER_ADMIN`, `ADMIN`, `FINANCE`, `FINANCE_MANAGER`, `FINANCE_DIRECTOR`, `INSURANCE_ADMIN` | Admin CMS `/admin` |

Role truths enforced server-side (do not replicate client-side):
- `ADMIN_ROLES = MASTER_ADMIN, ADMIN, FINANCE, FINANCE_MANAGER, FINANCE_DIRECTOR, INSURANCE_ADMIN, OPERATOR` (data-gateway dispatcher).
- `FINANCE_ROLES = MASTER_ADMIN, ADMIN, FINANCE, FINANCE_MANAGER, FINANCE_DIRECTOR` — money creation/updates; `OPERATOR` is deliberately **excluded** (FIX v1.44.0 pentest C2).
- `MARKETING` is deliberately in **neither** list: it manages people, not money, and sees only its own agent subtree.
- Admin workspace routing is per-role (`src/admin/roleConfig.ts` `getAdminWorkspace`): MASTER_ADMIN→command, ADMIN→ops, FINANCE/…→finance, INSURANCE_ADMIN→insurer, MARKETING→marketing.

## 3. Core value propositions

1. **Fast, honest motor insurance** — car insurance wizard with price
   computation against the OJK rate engine (twin implementation:
   `_shared/ojk.ts` ↔ `services/ojkRates.ts`, tested for parity), insurer
   product rules, and real insurer catalog (no invented insurers).
2. **Claims automation with staged evidence** — vehicle-photo forensics
   staged server-side, one-time-use tokens, matched to the user; `submit_claim`
   consumes forensics, not client claims like `fraud_verdict`.
3. **AI that assists, never decides** — Pathy explains, compares, drafts,
   prepares handoffs; authority stays with the insurer / OJK-kepolisian /
   dokter. `check_coverage` returns *indications* (`LIKELY_COVERED`,
   `LIKELY_NOT_COVERED`, `NEEDS_REVIEW`) with `decision_by: 'INSURER'`, never a
   verdict. Base PSAKBI guarantees are read from the `addons` column, never
   from the model's memory (flood/quake/riot/TJH/PA are **not** base covers).
4. **Embedded agent distribution** — real insurer catalog + commission-funded
   client discounts with a hard business ceiling (base commission capped at
   25%; effective max discount `max(0, min(configured, baseComm))`
   — discounts are always funded by commission; the insurer premium is intact).
5. **Operating discipline** — admin CMS with per-role dashboards, approvals
   queue, insurer review flow, promo/tier configuration, and wallet/portfolio
   tooling, all served through a single audited data gateway (RLS-protected,
   activity log without sensitive payloads).

## 4. Product principles

1. **No silent failures.** Every load follows `loading → error UI → content`.
   Failures surface with diagnostic copy (`mapAiError`: session/quota/
   unconfigured/timeout/offline), never a generic "coming soon".
2. **Truth from admin.** Customer/agent-facing tier lists, products, approval
   rates follow admin configuration (`sp_agent_tiers`, `sp_insurer_products`);
   summaries hide default tiers; palettes are palettes, not tier lists.
3. **Compliance vocabulary.** Premium math uses OJK rates; coverage language
   uses PSAKBI base-guarantee semantics; the platform does not invent money
   numbers (premiums, rates, claims) outside server-side computation.
4. **Embedded distribution over ads.** Reach customers through agents; agent
   economics are transparent (commission, coins, wallet, withdrawal audits).
5. **One source per concept.** One gateway for data, one theme owner,
   one icon system, one install-prompt service, one notification composer.
   Duplicates do not exist for long; when found, consolidate.
6. **Indonesian-first UX copy.** Copy is Bahasa Indonesia (with English
   secondary where the pattern demands); authoritative disclaimers are
   mandatory and non-negotiable.

## 5. App surfaces

| Surface | Route | Primary users | Purpose (verified) |
|---|---|---|---|
| Public website | `/` (+ site pages, SEO prerender) | Public | Brand, education, lead-in to apps; Google Analytics; PWA install |
| Customer app | `/custapp` (PWA + Capacitor APK) | CUSTOMER | Buy (car wizard), Pathy assistant (center tab), claims, orders/policies, wallet-coins, profile |
| Agent app | `/agapps`, legacy `/agentapp` | AGENT | Quote builder, insurer comparison, orders, claims intake, network/leaderboard, wallet, Pathy briefing |
| Operator app | `/operatorapp` | OPERATOR (others see login) | Card-based queues: verification, approvals, claims, service |
| Admin CMS | `/admin` (any path for signed-in admin) | MASTER_ADMIN, ADMIN, FINANCE*, INSURANCE_ADMIN, MARKETING | 17 sections incl. per-role workspace dashboards, approvals, insurers, pricing/tiers/promos, finance, users, settings |
| Insurer portal | `/insurerapp`, token entry `/insurer-portal` | INSURANCE_ADMIN | Review our submissions, products config, orders |
| B2B portal | signed-in catch-all | B2B_CLIENT | Group products for corporate clients |
| Marketing CRM | `/marketingapp` | MARKETING | CRM + KPI for own subtree |

Shared platform behaviors (cross-surface):
- Supabase Auth + RLS (deny-all baseline) via `data-gateway` (service_role,
  114 actions at last count) with dispatcher-level **trust gate** LIVE for 6
  write actions; `ensure_profile` backstop rejects anonymous/role-less
  profiles (`ROLE_REQUIRED`).
- PWA install (single `pwaInstall` service), service worker (precache +
  runtime cache), Android APK via Capacitor (version-locked with web
  `APP_VERSION`), push notification **not** implemented `(planned)`.
- Theme: `sp_dark_mode` for the consumer/agent-style app canvases; admin CMS is
  **light-only** since v2.7.17 (see `design.md` §4 — no dark theme, no auto
  hours; the admin never writes the shared `sp_dark_mode` key).

## 6. Priority user journeys (must always work)

1. **Customer — quote → policy → payment → policy issued.** Car wizard
   (plate → KYC → pricing → insurer products → summary) → `create_policy_order`
   (status `SUBMITTED`, commission server-computed) → Xendit invoice/checkout →
   webhook marks `PAID` → admin/insurer review → `ISSUED` (+ policy number
   via insurer link).
2. **Customer/Agent — claim FNOL → review → payout/decision.** Claim form
   (12MB photo guards, receipt compression) → staged photo forensics →
   `submit_claim` → operator/admin review queue → insurer decision → status
   updates (SUBMITTED / UNDER_REVIEW / APPROVED / PAID / REJECTED).
3. **Agent — register (ref/upline) → verify → quote → submit → commission →
   withdrawal.** Referral/upline codes sanitize-validated; verification is a
   real gate for `create_policy_order`; order commission computed server-side
   from insurer products (base commission cap 25%); wallet → withdrawal
   request → admin disburse (Xendit disburse).
4. **Insurer PIC — token → review → decide.** Auth tokens issued by admin
   portal (`submit-policy-insurer`), `send-insurer-email` delivers review
   links; review updates order status; product config feeds the agent wizard
   (`sp_insurer_products`, optional `rating/benefits/advantages/disadvantages`
   — hidden in UI until admin fills them).
5. **Operator/admin — queue service.** Operator card queues for verification
   and claims; admin approvals screen (`PolicyOrdersAdmin`, pending-first);
   no silent load failures.
6. **Anyone — Pathy chat with documents.** 3-tap quote, OCR attachments
   (STNK/KTP/SIM/POLIS/INVOICE routed client-side), quotation PDF through the
   same pipeline as the wizard (`fromAgentQuote`), session resume, TTS toggle.

## 7. Functional scope (verified inventory)

- **Retail (customer):** car insurance wizard (vehicle DB bundled client-side —
  deliberate; see §13), KYC w/ KTP OCR, OJK pricing coverage selection
  (COMPREHENSIVE / TLO), addons, checkout, claims, orders, Pathy.
- **Agent:** province/vehicle-type catalog, insurer comparison (brand logos,
  optional rating/benefits fields), discount panel with 25% guardrail,
  tier system from `sp_agent_tiers` (admin-editable), leaderboard/network,
  wallet & coins (commission, coin rate), withdrawals.
- **Operator:** verification, claims, orders service screens (card-based).
- **Admin:** issuance/review, approvals, insurers + products/promos/tiers,
  finance (payments, commissions, financial reports), users, B2B, marketing
  view, content/notifications, settings. Admin AI tools (`ai-policy-review`,
  `ai-finance-review`) and the **AI Admin engine** (5-min tick via self-host
  `server.ts`, gated — see design/product security notes).
- **Insurer:** tokenized review, product management.
- **B2B:** group health/life-ish flows from B2B portal (inventory per
  `components/b2b`).
- **Platform:** OTP send/verify (rate-limited per device + IP), audit log
  (immutable, critical-table triggers), promo codes, notifications
  (Telegram active; WhatsApp/Fonnte **parked**; email Resend provisioned),
  daily reports, insurer reminders.

## 8. Roles & permissions (platform-level contract)

- All authorization is server-side at the gateway/RLS boundary. **Never** trust
  client role/owner IDs; write flows re-verify ownership
  (`caller.ownerIds`; claims/orders both re-check).
- Trust gate (LIVE since the v2.7.16 data-gateway deploy, 2026-10-30 — the
  dispatcher enforces it unconditionally, no flag; grandfathering keeps all
  accounts created before 2026-09-12 unblocked): 403 +
  `code:'VERIFICATION_REQUIRED'` for the six write actions on untrusted
  accounts — `create_policy_order`, `submit_claim`,
  `agent_request_withdrawal`, `redeem_coins`, `apply_referral`,
  `accept_agreement`; admin roles bypass. Domain check is already
  enforcing today (tier 0 for garbage domains even if `verified:true`) AND
  the `email_confirmed_at` signal is already meaningful: live Management-API
  read on 2026-10-30 shows `mailer_autoconfirm=false` (auto-confirm email is
  OFF in production — the "owner toggle" recorded as pending earlier is
  verified done; new email signups go through CHECK_EMAIL).
  Client readiness verified: both signup paths
  (`components/AuthGate.tsx`, `components/agent/AgentOnboarding.tsx`)
  handle the no-session case with an explicit CHECK_EMAIL state, resend
  support, explicit `emailRedirectTo`, and profile creation from signup
  metadata via `ensure_profile` on first login.
- Rate limits: ai-proxy 200 req/h; OTP 3/10min per phone + IP limits;
  gateway `checkRateLimit` for sensitive actions.
- Withdrawals and disbursement are FINANCE_ROLES-only; OPERATOR read/service
  only. MARKETING cannot touch money.

## 9. Cross-app consistency (non-negotiable)

1. **Shared primitives** — `PortalHeader`/`PortalTabBar` (agent+customer),
   shared components (InsurerLogos, NotificationDrawer, InstallAppSheet) are
   the required starting points; portal-specific copies are not allowed.
2. **Single gateway** — all data flows through `data-gateway`; no
   frontend-side direct table access on protected tables (RLS deny-all).
3. **Tier/product truth** — admin CMS feeds agent/customer lists; both sides
   must change in the same release when the shape changes (tests exist).
4. **Scroll reset** every internal navigation (shared `scrollReset.ts`).
5. **Version parity** — `src/version.ts` = single truth, mirrored to Android
   (`check:android`) and e2e fixtures at release time.
6. **Theme consistency** — see `design.md`; changes to shared primitives
   must be verified across all six portals.

## 10. Claims & insurance workflow expectations

- Pre-commit steps may be fail-open in the client (photo pre-validation), but
  the **committing** step is server-enforced (staged forensics, one-time
  tokens, expiry, user matching). Never let Pathy call money/claim tools
  directly: Pathy *prepares*, existing forms *commit*
  (`claimHandoff` pattern).
- Claim decisions are the insurer's; platform statuses are honest and
  timestamped. Fraud language is restrained; evidence skills belong to
  forensics, not to prose in chat.
- Money tables are **forbidden in Pathy agent briefings** (deterministic,
  money-free).
- `verify-otp` responses, webhook errors (`payErr`), and audit triggers are
  part of the claims/money integrity surface — treat any weakening as a
  release blocker.

## 11. Non-functional requirements (current gates)

| Area | Requirement (active) |
|---|---|
| Performance | Bundle hygiene: no client sourcemaps, `check-dist-clean` part of build; lazy chunks for heavy images (vehicle DB currently bundled deliberately; moving it to server = owner decision); PWA precache ~1.5MB→ keep near |
| Testing | `npm run lint`: tsc 0 + ESLint 0 errors; unit vitest 410/410 (35 files); Playwright 75+ pass/15 skip (flaky ≤1); edge-function posture check `check:functions`; Android parity `check:android` |
| Deploy | Vercel (prod) + Cloudflare Pages + Supabase Edge Functions (workflow-only; must be green whenever `supabase/functions/**` changes); post-merge verify Production via GitHub API — a queued deploy is NOT a healthy deploy |
| Observability | `sp_audit_log` (immutable) on critical tables; activity log without sensitive payloads; notification channels must be *actually* implemented before claimed (Telegram only today) |
| Mobile | Capacitor/Android: versionCode consistency, camera `Permissions-Policy` must not block capture (server.ts already `camera=(self)`; the `vercel.json` parity fix is in the open working tree, uncommitted) |

## 12. Security, privacy & compliance

- Trust boundary code style per AGENTS.md (server-side authorization at every
  write; input validation at boundaries; least privilege; audit without PII).
- **OCR & photos:** wizard photo audit sends compressed images to
  `pathy-agent` (session token, not anon key); Pathy **chat** attachments are
  classified client-side and only extracted *fields* are sent — the modality
  differs per flow; never route claim forensics through chat.
- **Secrets:** only VITE (public) Supabase URL/anon key in client; service
  role, Xendit, provider keys in server/Vault only. `VITE_ADMIN_KEY` is
  dev-only and stripped from production builds.
- **Self-host server (`server.ts`)**: internal `/api/*` (audit-log, cache
  stats, ai-admin, aistudio-test) **must** be secret-gated (fail-closed) —
  work `uncommitted` in the tree; payment simulator endpoints must never
  answer in production.
- Compliance posture: OJK rate tables as pricing source of truth; PSAKBI
  base-guarantee vocabulary; not-yet-implemented items (e.g. electronic
  policy fulfillment audits, OJK reporting) are `(planned)` only.
- OTP codes are stored **plaintext today** — flagged in the audit; hashing is
  the approved direction `(approved, not yet implemented on the fix branch)`.

## 13. Success metrics

North star (PRD §7): policies issued per month through the platform.
Dashboard of record per L1/L2 metric: MAU per portal, quote→order conversion,
claim cycle time, agent activation, premium volume, commission paid, NPS.
**Honesty requirement:** production data is early-stage (historically
`sp_payments` empty / link tables sparse — see `.memory` v2.5.x findings);
metrics dashboards must not be presented with seeded/fake numbers. Marketing
canonical view `v_produksi` (MARKETING_CRM_PLAN Phase 0) is the prerequisite
for any growth reporting `(planned)`.

## 14. Prioritization framework

P0 = security/money-correctness/deploy-integrity (edge functions actually
deployed when touched). P1 = blocked core journeys + verifiable owner
complaints. P2 = experience polish with verified findings (e.g. audit
v2.7.14 items). P3 = nice-to-have.
Current queue (updated 2026-10-30, v2.7.17 deployed): P1 security batch DONE
(`.or()` filter-injection guard shipped & deployed; `server.ts` admin gate
shipped; `camera=(self)` shipped and verified live in production headers) →
trust gate FULLY LIVE (auto-confirm verified OFF via Management API read;
no owner dashboard step remains for it) → admin light-first THEME
migration DONE v2.7.17 (light-only shell, dark twins removed, anti-drift
guard tests); remaining admin work is the pixel-level converge pass against
`admin-a.html` → email send-path prerequisites live only in the OWNER's
accounts (Resend API key + domain verify, ADMIN_DIGEST_EMAIL value, Fonnte
decision) → design debt (see `design.md` §15).

## 15. Acceptance criteria (release DoD)

A feature is done when **all** of these are verifiably true:
1. Tests added/updated (unit covers the shape change; e2e covers the user
   path); never weaken a test to pass.
2. Gates on the touched layer: tsc 0, ESLint 0 errors, vitest green,
   build + PWA ok, `check:android` (if versions touched),
   `check:functions` (if edges touched), full Playwright before release.
3. Docs updated (this file, `design.md`, CHANGELOG, PLAYBOOK when workflow
   changed) in the same release commit.
4. Deploy verified post-merge: Vercel Production status success for the
   exact sha; edge deploy green when edges changed.
5. No new silent-failure, no new guardrail bypass, no fake controls (see §16).

## 16. Explicit anti-invention rules (read before writing anything)

1. **Never describe as shipped** anything not evidenced by code/tests:
   push notification, WhatsApp verification (Fonnte `parked`), billing
   dashboards over real data, workshop directory (text-only in
   `aiKnowledge`), "instant approval" for any product (v1.55 sweep).
2. **Never fake controls or data**: no placeholder buttons, no mock wallets
   numbers in UI, no demo monetary values outside fixtures/tests.
3. **Never invent insurers, products, prices, guaranties, phone numbers**
   (`SUREPATH_WHATSAPP` is centralized — use the constant), or endpoints that
   do not exist; marketing copy must be technically defensible (see Pathy
   disclaimers + `decision_by: INSURER`).
4. **Never weaken security to make a demo easier** (incl. RLS, trust gate,
   rate limits, webhook verification).
5. **No broad refactors/duplicate features/destructive changes**
   without an owner-approved plan (AGENTS.md workflow: research → plan → test
   → implement narrow → review → verify → document → commit → push → merge →
   verify deploy).
6. When in doubt about an approved behavior, **ask the owner**; do not
   silently reinterpret this guideline.
