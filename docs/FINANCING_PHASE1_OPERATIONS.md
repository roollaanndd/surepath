# Financing Core Phase 1 — Operations and Acceptance

## Deployment status
- Database migrations have been applied to the SurePath Supabase project `uyjgeteelnswphyzkjwi` as additive tables/functions only.
- Edge Function `financing-api` is deployed with JWT verification enabled.
- The frontend/API client changes are on branch `feat/financing-core-phase1` and are not live until the Vercel build is reviewed and promoted.
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

## Known Phase 1 limits
- No production KYC/bureau/SLIK provider adapter is enabled.
- No loan contract signing, loan schedule, disbursement, payment allocation, collections execution or double-entry loan ledger is implemented yet.
- Overview requested-amount aggregation reads up to 10,000 rows; if total applications exceed that bound it sets `partial: true`. Replace with a database aggregate RPC before production-scale reporting.
- Role provisioning is intentionally an administrator-controlled operation and is not self-service.
