# Financing Core Phase 1 — Operations and Acceptance

## Deployment status
- Database migrations have been applied to the SurePath Supabase project `uyjgeteelnswphyzkjwi` as additive tables/functions only.
- Edge Function financing-api is deployed and validates the bearer token with Supabase Auth inside the handler. Gateway-level verify_jwt should be rechecked as part of release hardening.
- The Phase 1 frontend/API wiring is merged to main and the production deployment for commit 593f8538b795aec1a7b2434640484bc4ce563641 is READY. Production runtime/browser verification remains a separate acceptance check.
- No financing user role is automatically assigned. No real application, credit bureau, signing, payment, or disbursement provider is enabled by this Phase 1.

## Role provisioning
Provision only after confirming the person's identity, employment, approved responsibilities, and Supabase Auth user UUID with the financing company's administrator. Use a trusted administrative SQL session. Do not provision a demo login.

Available roles:
- `FINANCING_ADMIN`
- `ORIGINATION`
- `VERIFICATION_ANALYST`
- `CREDIT_ANALYST`
- `CREDIT_APPROVER`
- `CONTRACT_OFFICER`
- `DISBURSEMENT_MAKER`
- `DISBURSEMENT_CHECKER`
- `SERVICING_FINANCE`
- `COLLECTIONS`
- `AUDITOR`
- `COMPLIANCE`

Example after independently verifying the UUID and role:
```sql
insert into public.sp_financing_user_roles (user_id, role, active)
values ('<VERIFIED_AUTH_USER_UUID>'::uuid, 'ORIGINATION', true)
on conflict (user_id, role) do update set active = excluded.active, updated_at = now();
```
Replace the placeholder with a verified UUID; never use a customer's email or accept role assignment from a browser request. Role revocation:
```sql
update public.sp_financing_user_roles set active = false, updated_at = now()
where user_id = '<VERIFIED_AUTH_USER_UUID>'::uuid and role = 'ORIGINATION';
```

## Phase 1 API actions
The `financing-api` Supabase Edge Function requires a valid Supabase JWT and active financing role.
- `list_products`: returns the four configured product types.
- `list_applications`: paginated applications with customer/product display metadata.
- `overview`: counts and requested amount derived from persisted applications. Large portfolios indicate when aggregation is partial.
- `create_application`: server-side validation and required `x-idempotency-key`; atomic customer + application + audit creation via PostgreSQL RPC.
- `transition_application`: version-checked state transition, role gate, required reason and audit record.

Client roles have no direct table grants. The service role is used only inside the Edge Function. Never expose the service-role key to the frontend.

## Acceptance checks
1. Confirm all six `sp_financing_*` tables have RLS enabled and direct `anon`/`authenticated` grants revoked.
2. Confirm four active product rows exist.
3. No JWT: gateway rejects request (401).
4. Valid JWT without an active financing role: API returns 403 and records an access-denied audit event.
5. Active ORIGINATION role: can list products, list applications and create an application with valid inputs.
6. Same idempotency key + same request returns the same application; same key + different request returns conflict.
7. ORIGINATION cannot approve a credit case; only CREDIT_APPROVER can decide from CREDIT_REVIEW.
8. Stale expected version and illegal transitions are rejected without state changes.
9. Invalid amount/tenor/customer type/product is rejected.
10. The dashboard displays API data only after successful authorized API responses; otherwise it explicitly remains in demo mode.
11. Vercel preview build and browser smoke tests pass before promotion.
12. Partner sandbox tests, credit calculation tests, ledger and money-movement controls remain release gates for later phases.

## Phase 2 credit decisioning (backend deployed)
- Versioned product rules and credit assessments are applied to production Supabase by migration financing_credit_decisioning_phase2; the source migration is 20261018100000_financing_credit_decisioning_phase2.sql.
- No underwriting rules are seeded. A verified FINANCING_ADMIN must configure policy approved by the financing company before an assessment can run.
- API actions: list_product_rules, configure_product_rule, evaluate_credit, and list_credit_assessments.
- Assessment outcomes are advisory only (RECOMMEND_REVIEW, REFER, INELIGIBLE) and never auto-approve or decline an application. See docs/FINANCING_PHASE2_CREDIT_DECISIONING.md.
- Edge Function financing-api is deployed as version 4 with gateway JWT verification enabled. SQL checks confirm both Phase 2 tables have RLS enabled, client roles cannot execute the privileged RPCs, and service_role can configure rules.
- No product rules or financing user roles are seeded, so credit assessments intentionally fail closed until authorized policy and user access are configured.
- Vercel preview builds are currently rate-limited by the provider; no frontend UI was changed in Phase 2 and no browser E2E test is claimed.

## Phase 3 partner adapter foundation (backend deployed)
- Provider registry and sanitized request-ledger schema are applied in production Supabase by migration financing_partner_adapter_foundation.
- Edge Function financing-api is deployed as version 5 with gateway JWT verification enabled.
- SQL checks confirm both provider tables have RLS enabled and the provider configuration RPC is not executable by anon/authenticated roles.
- No providers are configured. No provider-specific adapter, credentials, outbound calls, KYC/SLIK/bureau lookup, or live partner integration is enabled. Provider metadata can only be configured by FINANCING_ADMIN and is never automatically activated.
- Vercel deployment is currently rate-limited by the provider; no frontend UI changes are included in this phase.

## Phase 4 contract and disbursement controls (backend deployed)
- Migration financing_loan_operations_phase4 is applied in production; financing-api is deployed as version 6 with gateway JWT verification enabled.
- Added role-gated contract creation, manual signature-evidence verification by a separate compliance user, loan-account creation in PENDING_DISBURSEMENT, and disbursement maker-checker request/approval.
- SQL checks confirm four Phase 4 RPCs exist, lifecycle tables have RLS enabled, and anon/authenticated roles cannot execute privileged RPCs.
- These controls do not call e-signature or payout providers and do not move money. No active financing roles are assigned, so protected actions are unavailable until authorized role provisioning.
- Vercel builds remain rate-limited by the provider; this phase includes no frontend changes.

## Phase 5 servicing and ledger (backend deployed)
- Migration financing_servicing_ledger_phase5 is applied to production Supabase; financing-api is deployed as version 7 with gateway JWT verification enabled.
- Added amortization schedule generation after operator-attested disbursement settlement, idempotent repayment receipt, explicit component-level allocation, balanced double-entry journals, and trial-balance reporting.
- SQL checks confirm eight ledger accounts, RLS on the new ledger/allocation tables and existing repayment tables, and no execute privilege for anon/authenticated on repayment/allocation RPCs. An acceptance test confirmed unbalanced journals are rejected before posting.
- The production database currently has zero repayment records and zero journals; no test transaction or customer data was created. No active financing roles are assigned.
- Settlement/payment entries are operator-attested records only. No bank integration, independent bank reconciliation, or money movement is enabled. Vercel dashboard UI is not yet wired to Phase 5 actions.

## Known Phase 1 limits
- No production KYC/bureau/SLIK provider adapter is enabled.
- No loan contract signing, loan schedule, disbursement, payment allocation, collections execution or double-entry loan ledger is implemented yet.
- Overview requested-amount aggregation reads up to 10,000 rows; if total applications exceed that bound it sets `partial: true`. Replace with a database aggregate RPC before production-scale reporting.
- Role provisioning is intentionally an administrator-controlled operation and is not self-service.
