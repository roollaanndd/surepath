# SurePath Financing Core — temporary monorepo module

Status: **prototype/demo scaffold; not production-ready**.

This module is temporarily hosted inside `roollaanndd/surepath` under `financing-core/` until a dedicated private repository can be created. Keep the financing domain logically isolated; do not reuse insurance policy tables as financing records.

## Pilot scope

- Multi-product applications: motor vehicle, multipurpose, heavy equipment, working capital, and configurable partner products.
- Partner/tenant isolation for SurePath and each finance provider.
- Application intake, customer consent references, document checklist, verification requests, credit assessment, maker-checker decisions, offers/contracts, disbursement, repayment ledger, and insurance placement.
- Mutiara Finance is the first pilot partner; all access routes, bureau/e-KYC providers, and official verification integrations must be jointly validated with Mutiara before integration.

## Domain boundaries

- Financing applications and credit decisions are separate from insurance policies and insurer underwriting.
- Consent is explicit, purpose-bound, timestamped, revocable where applicable, and auditable.
- No production SLIK/OJK, Dukcapil, bank, payment, e-signature, or insurer integration is assumed.
- Demo UI uses fictional static records only. Demo access never creates a real user or grants a production role.

## Required production controls

1. Real Supabase Auth/SSO identity with server-validated tenant membership and role scopes.
2. Least-privilege database role, verified tenant isolation/RLS, immutable audit history, idempotent financial operations.
3. Maker-checker approval; separate credit analyst, approver, operations, and finance roles.
4. Encrypted documents, retention policy, data-subject handling, consent evidence, security monitoring.
5. Reconciliation for disbursements and repayments; append-only double-entry ledger before any live money movement.
6. Independent security review, UAT with Mutiara, compliance/legal approval, and verified build/deployment.

## Architecture direction

- Web workspace: React/TypeScript, shared SurePath design system, dedicated financing routes.
- API: versioned REST contract, JWT authentication, tenant context, schema validation, correlation IDs, idempotency.
- Data: PostgreSQL; separate financing schema/tables with row-level security and audit trail.
- Integrations: provider adapters behind explicit allowlists and per-partner configuration, never direct client-side secrets.

## Release gates

Do not enable real customer data, credit decisions, contracts, disbursement, or repayment processing until backend implementation, migrations, semantic typecheck, unit/integration/E2E tests, RLS isolation tests, partner UAT, and compliance review are complete.
