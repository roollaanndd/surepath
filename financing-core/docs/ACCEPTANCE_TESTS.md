# Financing Core acceptance tests (release-gate checklist)

- [ ] Anonymous visitor can open `/financing` and enter the clearly labelled read-only demo.
- [ ] Demo records are fictional; no API/database writes occur from demo interactions.
- [ ] Demo UI is responsive and keyboard accessible; reduced-motion preferences are respected.
- [ ] Production routes require a real authenticated identity and server-side tenant membership.
- [ ] Cross-tenant reads/writes are rejected by database policy and API authorization.
- [ ] Consent evidence exists before application creation and is tied to a stated purpose.
- [ ] Credit analyst cannot approve their own assessment; maker-checker separation is enforced server-side.
- [ ] Invalid state transitions are rejected and audited.
- [ ] Duplicate requests with the same idempotency key cannot create duplicate applications or financial movements.
- [ ] Disbursement/repayment operations use an append-only ledger and reconciliation workflow.
- [ ] Provider integration credentials are server-side only and access is audited.
- [ ] Full build, semantic typecheck, unit/integration tests, RLS tests, and browser E2E pass in CI.
- [ ] Mutiara Finance approves provider access routes, test data, process map, and UAT results.
