# Financing Core Phase 5 — Servicing and Double-Entry Ledger

## Scope
Phase 5 adds operator-attested disbursement settlement recording, amortization schedule generation, idempotent repayment receipts, explicit component-level payment allocation, and a double-entry journal. It records workflow and accounting evidence; SurePath does not initiate bank transfers or independently verify bank statements in this phase.

## Workflow

### 1. Record disbursement settlement and generate schedule
Action: settle_disbursement_and_generate_schedule
Role: FINANCING_ADMIN or SERVICING_FINANCE
Parameters: request_id, external_settlement_ref, first_due_date (YYYY-MM-DD).

The request must already be internally approved, the loan account must be PENDING_DISBURSEMENT, and the external settlement reference must be unique. The authorized operator is attesting that external settlement was confirmed. The function changes the request to SETTLED and loan account to ACTIVE, creates the full amortization schedule, posts the principal receivable / bank-clearing journal, and accrues contractual interest receivable/income. Replaying the same settled request with the same reference returns the existing result.

This is not a bank API or independent bank reconciliation. Never submit a reference until it has been verified against an authoritative bank/payment-provider source.

### 2. Record repayment receipt
Action: record_repayment
Role: FINANCING_ADMIN or SERVICING_FINANCE
Parameters: loan_account_id, amount, channel, external_reference, payment_date; header x-idempotency-key is required.

The loan must be ACTIVE. A matching retry returns the existing payment; reuse of the key with conflicting core fields is rejected. The receipt is posted to PAYMENT_SUSPENSE / UNALLOCATED_RECEIPTS until the incoming funds are reconciled and allocated. bank_reconciled is false; a receipt record is not proof of settled funds.

### 3. Allocate repayment
Action: allocate_repayment
Role: FINANCING_ADMIN or SERVICING_FINANCE
Parameters: repayment_id, schedule_id, principal_amount, interest_amount, fees_amount; header x-idempotency-key is required.

Allocation is explicit by component; no unapproved payment waterfall is assumed. The function verifies the payment balance, schedule component balances, same-loan relationship and outstanding principal, then records an allocation, updates the schedule/payment/account, posts a balanced journal and writes an audit event. Zero-value ledger lines are omitted. Conflicting idempotency-key reuse and over-allocation are rejected.

## Ledger accounts and journal logic
- DISBURSEMENT_SETTLEMENT: debit LOAN_PRINCIPAL_RECEIVABLE, credit BANK_CLEARING.
- INTEREST_ACCRUAL: debit INTEREST_RECEIVABLE, credit INTEREST_INCOME.
- PAYMENT_RECEIPT: debit PAYMENT_SUSPENSE, credit UNALLOCATED_RECEIPTS.
- PAYMENT_ALLOCATION: debit UNALLOCATED_RECEIPTS, credit the applicable principal, interest and fee receivables.

The private journal-posting function validates each line, requires at least two lines, and rejects unbalanced journals before insertion. Source type/id is unique to prevent duplicate postings. Ledger accounts, journals, entries and allocations have RLS enabled; direct client access is revoked.

## API read actions
- list_repayment_schedules (optional loan_account_id; limit capped at 500)
- list_repayments (optional loan_account_id; limit capped at 200)
- list_ledger_journals (limit capped at 200)
- get_ledger_trial_balance (returns totals by active account)

## Known limits
- No bank/payment provider integration or independent bank-statement reconciliation.
- No customer payment portal or automatic payment matching.
- No reversals, refunds, write-off accounting, early settlement, late fees, restructuring, or configurable allocation waterfall.
- The Phase 5 database migration and Edge Function changes do not by themselves wire these workflows into the Vercel dashboard.
- No active financing roles exist, so protected operations remain unavailable until authorized users are provisioned.
- The accounting policy and recognition treatment must be reviewed and approved by the financing company's finance/compliance owners before production use.

## Acceptance checklist
1. Replaying a matching disbursement settlement reference returns the same schedule and does not duplicate journals.
2. Conflicting settlement reference or unsettled request is rejected.
3. Every schedule amortizes the principal to zero with rounded amounts and a final-installment adjustment.
4. A matching repayment idempotency retry does not duplicate receipt or journal.
5. Conflicting idempotency-key reuse is rejected.
6. Allocation cannot exceed payment balance, installment component balance, or outstanding principal.
7. Allocation cannot target another loan's schedule or a waived schedule.
8. Zero-component allocations post no zero-value journal lines.
9. Every posted journal has equal total debits and credits.
10. Anonymous/authenticated client roles cannot call privileged RPCs or access tables directly.
