# SurePath Financing Core — v1 foundation

This isolated multi-finance workspace is built inside the SurePath repository while preserving the existing insurance modules. It is a foundational LOS/LMS implementation, not yet a licensed lender's production system. It does not execute disbursements or collect money.

## Included in this branch

- Responsive database-backed workspace at `/financing/dashboard`: overview, applications, customers, credit review, contracts, disbursements, repayments, collections, products, reports/audit and settings.
- Vercel serverless API at `/api/financing/*`.
- Supabase schema for tenants, products, customers, applications, documents, credit decisions, contracts, loan accounts, disbursement requests, repayment schedules/transactions, collection cases and audit events.
- Tenant resolution from verified Supabase Auth `app_metadata.financing_tenant_id`; role from `app_metadata.financing_role`.
- Server-side product amount/tenor validation, application state transitions, optimistic updates and audit events.
- Synthetic tenant + product catalogue only. No sample customers, balances or repayment transactions are seeded.

## Setup

1. Apply `supabase/migrations/202610180001_financing_core.sql` to the intended Supabase project.
2. Configure server-only Vercel environment variables:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY` (never expose this as a `VITE_*` variable)
3. For an isolated test deployment only, set `FINANCING_DEMO_MODE=true`. Unauthenticated access is restricted to the synthetic sandbox tenant. Turn this off for partner/production deployments.
4. In authenticated mode, assign users through a trusted admin process with Supabase `app_metadata.financing_tenant_id` and `app_metadata.financing_role`. Supported roles: `tenant_admin`, `operations_manager`, `credit_manager`, `credit_analyst`, `viewer`. Do not let users self-assign these claims.
5. Test `GET /api/financing/health`, `GET /api/financing/products`, create an application, then walk it through `new → documents_pending → documents_verified → credit_review`. Verify audit events for every write.
6. For partner production, disable demo mode and configure tenant identity/roles before exposing the route. Complete partner acceptance and compliance review before enabling integrations.

## API

- `GET /api/financing/health`
- `GET /api/financing/overview`
- `GET /api/financing/products`
- `GET /api/financing/customers`
- `GET /api/financing/applications?limit=100&status=credit_review`
- `POST /api/financing/applications` — creates a customer and application
- `PATCH /api/financing/applications/:id` — validates workflow transition
- `POST /api/financing/applications/:id/decision` — credit-manager role required outside sandbox; rationale is mandatory
- `GET /api/financing/contracts`
- `GET /api/financing/disbursements`
- `GET /api/financing/repayments`
- `GET /api/financing/collections`
- `GET /api/financing/audit-events`

## Not enabled yet

- Real disbursement, bank transfer, repayment collection or payment-provider execution.
- Credit bureau/SLIK, KYC vendors, e-signature, banking APIs and partner webhooks.
- Production contract generation/signing and legally reviewed loan schedules/interest calculations.
- Production identity/role administration UI, MFA enforcement, document storage lifecycle and retention jobs.
- General-ledger posting, reconciliation, provisioning, portfolio-at-risk calculations and regulatory filing exports.

The disbursement and repayment screens currently read persisted records only; they do not execute money movement. Empty states are intentional until real data is configured. No hardcoded portfolio KPIs are presented as live metrics.
