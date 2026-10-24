# SurePath Multifinance Implementation Blueprint

**Status:** Architecture and delivery specification; not evidence of implementation.
**Business model:** One financing company, with multiple external partner integrations.
**Products:** Motor vehicle, multipurpose, heavy equipment, working capital.
**Current repository:** `roollaanndd/surepath`; financing domain is temporarily colocated and must remain logically isolated.
**First pilot:** Mutiara Finance, subject to partner UAT, access authorization, and compliance approval.

## 1. Current-state repository inspection

Inspected the default branch files `package.json`, `server.ts`, `src/pages/FinancingPage.tsx`, `tsconfig.json`, `vercel.json`, and `financing-core/README.md`.

Observed:
- React/TypeScript/Vite frontend and an Express server exist. Supabase client and SDK dependencies exist in the project.
- `src/pages/FinancingPage.tsx` is a client-side demo: sample applications and KPI values are hardcoded; newly created applications are stored in component state and the UI explicitly says no real customer record was saved.
- `financing-core/README.md` documents the intended architecture and production gates.
- The repository has financing feature branches that diverge from main. Do not merge them blindly; inspect and reconcile their changes first.
- This inspection does not establish that a financing API, financing database migrations, production authentication, partner connections, or end-to-end loan lifecycle are working. Verify each from source, tests, and deployed behavior before calling it implemented.

## 2. Product principles and scope

1. One licensed financing company is the operating entity; model partner organizations as integration counterparties, not as a SaaS multi-tenant product.
2. Support the four named products from day one using configurable product definitions and versioned terms, not product-specific copies of the loan engine.
3. Keep customer/application, credit decision, contract, loan account, payment, accounting, and audit records distinct.
4. Use an API-first contract for external partners. Each provider is an adapter with capability configuration, credentials, timeouts, retries, webhook verification, and health status.
5. No live SLIK/OJK, Dukcapil, e-KYC, bank, payment, e-signature, or insurer access is assumed. Obtain partner authorization, legal basis/consent, credentials, and provider acceptance before activation.
6. AI may assist document extraction and analyst summaries, but cannot silently approve credit, alter balances, sign contracts, or initiate money movement.
7. Demo fixtures must be labelled as fictional. Production workflows must use authenticated API-backed data.

## 3. Module boundaries

### A. Workspace and identity
- Real sign-in via approved identity provider; MFA for privileged users.
- Roles: system administrator, product/configuration administrator, sales/origination, verification analyst, credit analyst, credit approver, contract officer, disbursement maker, disbursement checker, servicing/finance, collections, auditor, compliance.
- Server-side permission checks and separation of duties. A user cannot approve their own restricted action.

### B. Origination and customer
- Lead/referral intake, individual/business customer profile, application, requested product/amount/tenor, consent records, document checklist, status timeline, duplicate detection.
- Support person and business identity records; store only necessary attributes and provider references.
- KYC/KYB, bureau and SLIK results are versioned verification records with source, purpose, consent/legal basis, timestamp, expiry, and status. Store minimal response data and references where possible.

### C. Product and pricing
- Product definitions: motor vehicle, multipurpose, heavy equipment, working capital.
- Versioned product rules: eligible customer/asset types, minimum/maximum amount, tenor bounds, down payment/collateral requirements, fees, interest method, payment frequency, grace rules, and approval matrix.
- Every application and contract references the exact product/rate/fee version used. Changes apply prospectively unless an explicit migration is approved.
- Validate rates and disclosures with the financing company's compliance and legal teams; do not hardcode regulatory assumptions as universal truth.

### D. Verification and fraud operations
- Document upload via private object storage; short-lived signed URLs; malware/content checks; OCR output as untrusted extracted data.
- Provider checks run asynchronously and are traceable. Store provider, request ID, result status, checked-at time, evidence reference, and error details with PII redacted from logs.
- Manual override requires reason, actor, timestamp, and (for high-risk checks) second approval.

### E. Credit and decisioning
- Credit case separates applicant facts, verification evidence, bureau data, affordability calculation, collateral/asset valuation, score/model version, analyst recommendation, and final decision.
- Configurable decision matrix and approval limits; maker-checker; explicit pending-information, approved, declined, and referred states.
- Preserve decision snapshots and reasons. Reassessment creates a new version rather than overwriting history.
- No AI-only final credit decision. Avoid using protected or prohibited attributes; validate model governance with compliance.

### F. Offer, contract and loan booking
- Generate a versioned offer from an approved decision; record acceptance and expiry.
- Contract documents are immutable versioned artifacts; signature status comes from an approved signing provider or verified manual process.
- Booking creates one loan account only after required approvals, valid contract, and booking checks. Enforce uniqueness against duplicate booking.
- Support early settlement, restructuring, refunds, reversals, and closure as explicit workflows.

### G. Disbursement and treasury
- Maker prepares payment instruction; checker approves; beneficiary details are verified; integration request uses idempotency key.
- States: queued, approved, submitted, confirmed, failed, reversed/reconciled. A timeout is an unknown outcome, not proof of failure; query provider status before retrying.
- Never call a disbursement successful based only on a frontend response.

### H. Loan servicing and repayment
- Versioned amortization schedule generated using documented rounding, day-count, rate, fee, and holiday conventions.
- Payment ingestion supports provider webhooks, bank statements, virtual accounts, and controlled manual receipts.
- Allocation policy is versioned and explicit (fees, interest, principal or contract-defined priority). Each receipt/allocation is immutable; corrections use reversal and replacement entries.
- Partial payments, overpayments, early settlement, failed payments, refunds, disputes, rescheduling, and write-offs have explicit state transitions.

### I. Collections and portfolio
- Aging buckets, promise-to-pay, contact/task history, dispute and hardship flags, assignment, escalation, and lawful communication preferences.
- Portfolio metrics must be derived from persisted data with defined cut-off/as-of times: outstanding principal, arrears, PAR aging, collection rate, vintage, roll rate, concentration and write-off/recovery.
- Show unavailable data as unavailable; never display fabricated KPI values as live portfolio results.

### J. Finance, ledger and reconciliation
- Append-only double-entry journal with balanced entries, accounting period, currency, source event, idempotency key, and reversal link.
- Separate operational loan ledger/subledger from general-ledger mapping. Define accounts and posting rules with the finance team.
- Reconcile provider/bank statement lines to disbursement and repayment transactions; unresolved breaks enter an exception queue.
- Financial postings use database transactions; balances are derived from posted entries or a controlled materialized balance with reconciliation.

### K. Partner integration and API operations
- Versioned REST API under `/api/v1/financing`; OpenAPI contract; request validation; pagination; correlation IDs.
- Adapter interface for identity verification, bureau/SLIK where authorized, e-signature, bank/disbursement, payments, dealer/merchant, and insurance placement.
- Per-provider configuration and allowlists; secret vault/environment configuration; signed webhook verification; timestamp/nonce/replay protection; bounded retries with backoff; dead-letter/exception queue; circuit breaker; provider health dashboard.
- Use transactional outbox for events emitted after database commit. Consumers must be idempotent.
- Partner API versioning, quotas, scopes, sandbox credentials, contract tests and deprecation policy.

### L. Reporting, audit and compliance
- Role-scoped operational reports and exports; exports are audited and PII-minimized.
- Append-only audit events for login/authorization failures, consent, document access, verification, decisions, overrides, contract changes, payment instructions, postings, reversals, configuration and exports.
- Audit record: actor/service, action, entity type/ID, timestamp, correlation ID, reason, result, and redacted before/after diff where appropriate.
- Retention, data-subject handling, breach response, disclosures, complaints, and regulatory reporting must be mapped with the licensed partner and counsel.

## 4. Core data model

Use PostgreSQL with migrations. UUID primary keys; UTC timestamps; explicit currency (initially IDR where contractually applicable); decimal/numeric for money/rates; no floating-point arithmetic for financial values. Apply foreign keys, check constraints, unique constraints, and tenant/company scoping even though the pilot has one financing company.

| Entity/table | Purpose and key relationships |
|---|---|
| `financing_users`, `roles`, `permissions`, `user_role_assignments` | Identity mapping and role grants; identity provider remains source of authentication |
| `customers`, `customer_addresses`, `customer_identifiers` | Individual/business profile and minimized identifiers; identifiers encrypted/tokenized where appropriate |
| `consents` | Customer, purpose, legal basis, wording/version, captured-at, channel, expiry/revocation, evidence reference |
| `applications` | Customer, product-version, requested amount/tenor, source channel, owner, current workflow state, optimistic-lock version |
| `application_parties`, `assets`, `collateral` | Guarantors/co-applicants, financed motor vehicle/heavy equipment, valuation and security details |
| `documents`, `document_versions`, `document_access_events` | Private storage key, classification, checksum, scan status, uploader, retention and access evidence |
| `verification_cases`, `verification_results` | Provider, purpose/consent reference, external request ID, status, result summary, evidence reference, expiry |
| `credit_cases`, `credit_assessments`, `credit_decisions` | Versioned input snapshot, affordability/score outputs, model/rule version, recommendation, decision, reason and approvers |
| `financing_products`, `product_versions`, `pricing_versions`, `approval_matrices` | Product eligibility, rates, fees, calculation conventions, limits and effective dates |
| `offers`, `contracts`, `contract_versions`, `signature_events` | Approved offer terms, acceptance, immutable contract artifact, signing evidence |
| `loan_accounts`, `loan_schedule_versions`, `installments` | Booked facility, contract/product version, original terms, schedule and installment state |
| `disbursement_instructions`, `disbursement_events` | Maker/checker, beneficiary reference, provider idempotency key, external status and reconciliation |
| `payment_receipts`, `payment_allocations`, `payment_events` | Inbound receipt, allocation to installments/fee/interest/principal, provider reference and reversals |
| `collection_cases`, `collection_activities`, `promises_to_pay` | Aging, assigned collector, contact history, promise and outcome |
| `journal_entries`, `journal_lines`, `ledger_accounts`, `reconciliation_runs`, `reconciliation_items` | Balanced double-entry postings and statement/provider matching |
| `partner_connections`, `partner_credentials_refs`, `partner_requests`, `partner_webhooks` | Provider configuration and status; secret values remain outside the database |
| `workflow_instances`, `workflow_events`, `outbox_events`, `idempotency_records` | State transitions, reliable events and duplicate-request prevention |
| `audit_events`, `report_runs` | Security/business audit trail and reproducible report metadata |

Avoid one overloaded `status` field for the entire lifecycle. Each aggregate owns its state machine; cross-module transitions are explicit domain events. Store raw external payloads only when justified, encrypted, access-controlled, redacted from logs, and subject to retention rules.

## 5. API boundaries

Illustrative resource families (exact schemas and status codes are defined in OpenAPI):
- `/api/v1/financing/applications`: create, search, retrieve, submit, request missing documents.
- `/customers`, `/consents`, `/documents`: customer profile, purpose-bound consent and document metadata.
- `/verifications`: request and review provider checks; asynchronous status and evidence references.
- `/credit-cases`, `/credit-decisions`: assessment snapshots and approval/rejection/referral with reason and approval control.
- `/products`, `/product-versions`, `/offers`, `/contracts`: versioned product rules and contract lifecycle.
- `/loan-accounts`, `/schedules`, `/disbursements`: booking, schedule, payment instruction and status.
- `/payments`, `/allocations`, `/collections`: receipts, allocation, reversals and collection work.
- `/ledger`, `/reconciliation`, `/reports`: restricted finance and operational reporting.
- `/integrations/{provider}/webhooks`: provider-specific verified inbound events.
- `/health` and restricted operational diagnostics: readiness/liveness without exposing secrets or PII.

Write endpoints require schema validation, authorization, CSRF protection where cookie auth is used, rate limits, correlation IDs, and idempotency for non-repeatable operations. Return stable error codes and never leak provider secrets or sensitive verification details.

## 6. Security baseline

- Authenticate every production request; no sessionStorage flag or public demo route can grant a production identity.
- Authorize on the server for every object and action. Apply PostgreSQL RLS/least-privilege DB roles as defense in depth; test cross-user and cross-company boundaries even in a single-company deployment.
- Keep service-role keys, provider credentials, signing secrets, and database credentials server-side in managed secrets.
- MFA for privileged roles; short-lived sessions/tokens, secure cookies where applicable, revocation, login throttling and access reviews.
- Encrypt in transit and at rest; field-level protection for high-risk identifiers; private document buckets with short-lived URLs.
- Separate duties for credit decision, disbursement, and ledger adjustments; require step-up verification for high-risk actions.
- Never mutate posted journal entries or confirmed payment events; use compensating reversals.
- Validate webhook signatures, timestamps and replay windows; do not trust client-supplied provider status.
- Redact KTP, bank data, tokens and credentials from logs, traces and error messages.
- Dependency/security scans, threat model, penetration test, backup/restore drill, incident response runbook and retention schedule before production.
- AI outputs are suggestions with provenance; no autonomous approval, signature, disbursement or journal posting.

## 7. Frontend implementation

Retain the current visual language as a starting point but replace hardcoded demo state with typed API services and query/loading/error/empty states.

Primary navigation:
1. Executive overview and action queue
2. Applications and customer profiles
3. Verification and document center
4. Credit workbench and approval inbox
5. Product/pricing configuration
6. Offers and contracts
7. Disbursement control room
8. Loan accounts, schedules and repayment ledger
9. Collections
10. Finance ledger and reconciliation
11. Partner integrations and webhook/event health
12. Reports, audit and workspace settings

UX requirements:
- Clearly mark demo fixtures and environment (sandbox vs production).
- Show source, as-of time and calculation definitions for KPIs.
- Provide a detail timeline and action history for each application/loan.
- Show loading, permission denied, provider timeout, retrying, stale data and no-data states.
- Use confirmation and second-person approval screens for high-impact actions; do not make one-click UI actions bypass backend controls.
- Make tables responsive and accessible; support keyboard navigation, explicit labels, sensible empty states and non-color-only status cues.
- The frontend cannot be the authority for balances, credit decisions, workflow transitions or permissions.

## 8. Implementation sequence and gates

### Phase 0 — Repository and threat-model gate
- Reconcile the existing financing branches without blind merges; identify route and design-system dependencies.
- Decide API hosting/runtime, database ownership, migrations, auth claims, secret management and deployment environments.
- Publish OpenAPI, state diagrams, data classification and financial calculation conventions.
- Deliverable: reviewed architecture, threat model, migration plan and test matrix.

### Phase 1 — Secure backend foundation
- Create financing schema/migrations, auth middleware, server-side RBAC, request validation, audit events, correlation IDs, idempotency table and health checks.
- Add API-backed application/customer/product CRUD and workflow transition service.
- Tests: auth required, role denial, validation, duplicate request, concurrent update and RLS isolation.
- Gate: no production PII; demo mode isolated from production.

### Phase 2 — Origination and verification
- Customer, consent, document metadata/upload, checklist, provider adapter contract, verification status and application timeline.
- Use mock adapters in automated tests; production adapters remain disabled until credentials and approvals exist.
- Gate: consent purpose/version and document access audit proven.

### Phase 3 — Credit and contract
- Versioned affordability and scoring inputs, decision matrix, maker-checker approvals, reason codes, offer and contract/signature status.
- Gate: no self-approval, all decision snapshots reproducible, no credit action based only on AI.

### Phase 4 — Loan servicing and money movement
- Booking, schedule engine, disbursement state machine, payment ingestion/allocation, reversals, collections and double-entry ledger.
- Build golden test cases for amortization, rounding, partial payment, overpayment, early settlement, missed payment, refunds and reversal.
- Gate: finance signs off calculations; all ledger postings balance; reconciliation exceptions are visible; sandbox provider contract tests pass.

### Phase 5 — Partner API and operations
- Partner adapter registry, OAuth/mTLS or provider-specific auth as supported, signed webhooks, retries, circuit breaker, outbox, dead-letter queue and health dashboards.
- Gate: replay, duplicate, timeout, out-of-order and provider outage tests pass; partner UAT completed.

### Phase 6 — Portfolio, compliance and production release
- Data-derived KPIs, aging/PAR/vintage reporting, audited exports, retention/deletion workflows and monitoring.
- Complete penetration test, restore drill, load test, access review, incident response exercise, compliance/legal review and Mutiara UAT.
- Release only after all gates pass and the deployed commit/build has been verified.

## 9. Acceptance test matrix

| ID | Scenario | Acceptance condition |
|---|---|---|
| AUTH-01 | Unauthenticated request to any protected API | 401; no data disclosed |
| AUTH-02 | Role lacks permission for credit approval/disbursement/ledger adjustment | 403; no state change; audit/security event recorded |
| AUTH-03 | User requests another user's restricted document or record | Access denied; no existence/PII leakage |
| AUTH-04 | Maker attempts to approve own restricted action | Rejected server-side |
| DATA-01 | Create application for each of four products | Validated, persisted, retrievable after restart; product version captured |
| DATA-02 | Invalid amount, tenor, currency or missing required fields | Validation error; no partial record |
| CONS-01 | Required consent absent, expired or for another purpose | External verification request blocked |
| DOC-01 | Unauthorized or expired signed document URL | Access denied; document bucket remains private |
| WF-01 | Illegal state transition (e.g. disburse before contract/approval) | Rejected; no side effects |
| CREDIT-01 | Analyst attempts final approval without required checker | Pending/rejected according to approval matrix; no approved state |
| CREDIT-02 | Credit decision changed after review | New version/reason/actor captured; previous decision preserved |
| CONTRACT-01 | Duplicate booking request | Exactly one loan account created |
| FIN-01 | Schedule golden cases across supported rate/rounding rules | Exact expected amounts and totals match finance-approved fixtures |
| FIN-02 | Concurrent duplicate disbursement request | One provider instruction only; same idempotent result returned |
| FIN-03 | Provider timeout after instruction submission | Status treated as unknown/pending; reconciliation/status lookup before retry |
| PAY-01 | Duplicate payment webhook | Receipt and allocations posted once |
| PAY-02 | Partial, excess, late and early payment | Allocation follows configured policy and produces expected balances |
| PAY-03 | Refund or correction | Reversal/compensating entries; original posting remains immutable |
| LEDGER-01 | Any journal posting | Debits equal credits per journal and currency; invalid posting rolls back |
| RECON-01 | Statement has unmatched/mismatched line | Exception queue entry with traceable owner and no silent auto-clear |
| INT-01 | Invalid webhook signature or replay | Rejected; no business state change |
| INT-02 | Provider outage/rate limit | Bounded retries, observable failure state, no duplicate side effect |
| AUD-01 | Consent, decision, export, configuration or money movement | Actor/service, action, timestamp, correlation and outcome captured |
| KPI-01 | Empty database or stale source data | No invented values; empty/stale status and as-of time shown |
| UI-01 | Dashboard create/search/filter/detail flow | Data comes from API; loading/error/empty/permission states work |
| UI-02 | Demo mode | Clearly labelled synthetic data; cannot create production identity or call live financial endpoints |
| OPS-01 | Database restore drill | Restore validated against documented recovery objectives |
| OPS-02 | Deployment smoke test | Auth, migrations, key routes, API health and PWA asset delivery verified on the actual deployment |

## 10. Definition of done

A module is not “done” because its screen exists. It is done only when:
- database schema/migration and rollback strategy are reviewed;
- API contract and server-side authorization are implemented;
- domain/state transitions and audit are enforced on the server;
- unit, integration, negative security, and relevant E2E tests pass;
- external integrations are proven in provider sandbox or explicitly remain disabled;
- frontend uses real API data and shows failures honestly;
- deployment build/commit and smoke tests are verified;
- partner operations, finance, security and compliance sign off where applicable.

**Production warning:** Until these gates pass, the workspace is a demo/scaffold. Do not process real customer PII, make actual credit decisions, execute disbursements, or post live repayments through it.
