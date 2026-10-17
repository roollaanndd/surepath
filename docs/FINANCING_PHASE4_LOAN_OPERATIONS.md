# Financing Core Phase 4 — Contract and Disbursement Controls

## Scope
This phase adds an audited contract workflow and maker-checker disbursement approval. It does not integrate e-signature or payment providers and does not move money.

## Contract workflow
1. A CREDIT_APPROVER records a formal application decision through the authorized workflow.
2. A CONTRACT_OFFICER creates a contract only for an application in APPROVED state, with the current application version and a configured active product rule.
3. The contract is created as PENDING_SIGNATURE and the application moves to OFFERED.
4. A separate COMPLIANCE user (not the contract creator) verifies the external signature evidence reference. This is a manual attestation, not cryptographic validation by SurePath.
5. The workflow records the contract as SIGNED, moves the application to CONTRACTED, and creates a loan account in PENDING_DISBURSEMENT.
6. Generic application status transitions are blocked from moving OFFERED directly to CONTRACTED; signature verification is the only supported path.

API actions:
- create_contract: CONTRACT_OFFICER or FINANCING_ADMIN. Params: application_id, expected_version, terms_version.
- verify_contract_signature: COMPLIANCE or FINANCING_ADMIN. Params: contract_id, expected_application_version, external_signature_ref.
- list_contracts: CONTRACT_OFFICER, COMPLIANCE, AUDITOR, FINANCING_ADMIN.

## Disbursement workflow
1. DISBURSEMENT_MAKER creates a request against a loan account in PENDING_DISBURSEMENT.
2. The pilot supports full-principal disbursement only; partial disbursement is rejected.
3. A different DISBURSEMENT_CHECKER approves the request.
4. Approval is only an internal workflow status. It does not call a payment provider, mark funds as sent, or activate the loan account.

API actions:
- create_disbursement_request: DISBURSEMENT_MAKER or FINANCING_ADMIN. Requires x-idempotency-key.
- approve_disbursement: DISBURSEMENT_CHECKER or FINANCING_ADMIN.
- list_loan_accounts: servicing, disbursement roles, auditor, admin.
- list_disbursement_requests: disbursement roles, auditor, admin.

Every mutation is a service-role-only database RPC with role checks, transaction boundaries, and audit events. The app's current version is checked to prevent stale contract creation or signature verification. Idempotent disbursement retries return the original request when the key and core fields match; conflicting reuse is rejected.

## Explicit limits
- No electronic-signature provider adapter exists. A compliance verifier must independently verify the signed document and record its evidence reference.
- No bank/payment/disbursement provider adapter exists. APPROVED means internally authorized only; it does not mean submitted or settled.
- No repayment allocation, interest accrual, double-entry ledger, reconciliation, or collection automation is activated in this phase.
- Do not mark a loan ACTIVE or report a payout as completed until a real disbursement integration and reconciliation controls are implemented and tested.

## Acceptance checklist
1. Non-CONTRACT_OFFICER cannot create a contract.
2. Contract creation fails unless application is APPROVED, version matches, and an active product rule is configured.
3. Direct OFFERED-to-CONTRACTED transition is rejected.
4. Contract signature verification requires COMPLIANCE/admin and a different user from the contract creator.
5. Successful verification creates one PENDING_DISBURSEMENT loan account atomically with application/contract state updates and audit record.
6. Disbursement requests require maker role, valid idempotency key, full principal, and pending account state.
7. Checker cannot approve their own request; repeated or invalid approvals are rejected.
8. All disbursement responses explicitly indicate moneyMoved=false.
