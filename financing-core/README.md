# SurePath Financing Core — v1 / phase 2

This workspace extends the existing SurePath Financing Core foundation already present in Supabase. It reuses the live `sp_financing_*` tables and secured RPCs; it does not create a duplicate core schema or expose service-role access through Vercel.

## Included

- Responsive Multifinance Control Center at `/financing/dashboard`.
- Extended existing Supabase Edge Function `financing-api` as the API boundary.
- Authenticated mode using explicit active roles in `sp_financing_user_roles`.
- Isolated public sandbox stored only in `sp_financing_demo_*` tables; sandbox actions cannot touch production financing tables.
- Multi-product catalogue: motor vehicle, multipurpose, heavy equipment, and working capital.
- Application creation uses existing `sp_financing_create_application` RPC with idempotency.
- Status transitions use existing `sp_financing_transition_application` RPC with optimistic version checks.
- Credit decisions use a new transactional RPC that updates application status, stores the decision, and emits an audit event.
- Phase-2 tables for contracts, loan accounts, maker-checker disbursement requests, repayment schedules/transactions and collections.
- Shared database-backed rate limiting for public sandbox requests.

## Database and function setup

1. The existing SurePath Supabase project already contains phase-1 financing tables and RPCs. Do not recreate them.
2. Migration `supabase/migrations/202610180001_financing_lms_phase2.sql` adds phase-2 servicing tables and the atomic credit-decision RPC.
3. Deploy `supabase/functions/financing-api/index.ts` to the existing SurePath Supabase project. It uses the existing Edge Function secrets `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY`.
4. The function uses `verify_jwt = false` only because it verifies authenticated sessions internally and also serves the isolated public sandbox. Never add a public action that reads or writes production financing records.
5. Authenticated users need an active role in `sp_financing_user_roles`. Roles: `FINANCING_ADMIN`, `ORIGINATION`, `VERIFICATION_ANALYST`, `CREDIT_ANALYST`, `CREDIT_APPROVER`, `CONTRACT_OFFICER`, `DISBURSEMENT_MAKER`, `DISBURSEMENT_CHECKER`, `SERVICING_FINANCE`, `COLLECTIONS`, `AUDITOR`, `COMPLIANCE`.
6. The sandbox requires no account but stores only synthetic submissions in separate `sp_financing_demo_*` tables. Use fictional customer names only. Sandbox has no real disbursement or repayment execution.

## API actions

The browser calls `supabase.functions.invoke('financing-api')` with an action and params:
- `health`, `products`, `overview`, `applications`, `customers`
- `create_application`, `transition_application`, `record_credit_decision`
- `contracts`, `disbursements`, `repayments`, `collections`, `audit-events`
- Public sandbox-only variants are prefixed with `demo_` and restricted to synthetic tables.

## Operational safety boundaries

- Disbursement requests are stored with maker/checker fields; this phase does not call a bank, transfer funds, or mark money as settled automatically.
- Repayment records are not yet allocated against schedules; no balance is changed by a UI-only action.
- Contract generation/signature, external KYC/SLIK, bank/payment provider integrations, general ledger, reconciliation, provisioning, PAR/NPF calculations and regulatory filing exports still need implementation and partner acceptance.
- Production role assignment is explicit; the public sandbox cannot grant roles or query production data.
- No illustrative portfolio totals are seeded as live metrics; empty states show when there is no database data.
