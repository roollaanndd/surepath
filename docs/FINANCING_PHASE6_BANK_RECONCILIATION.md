# Financing Core Phase 6 — Bank Statement Reconciliation

## Scope
Phase 6 adds a controlled import of normalized bank-statement lines and explicit matching against recorded repayment receipts or internally recorded disbursement settlements. It does not connect directly to a bank, fetch statements, or initiate transfers.

## Import a statement batch
API action: import_reconciliation_batch
Roles: FINANCING_ADMIN, SERVICING_FINANCE, AUDITOR

Parameters:
- statement_reference: unique statement/batch reference
- masked_bank_account: must be masked (for example ****1234); never submit a full bank account number
- period_start / period_end: YYYY-MM-DD
- lines: 1–500 normalized records with transaction_date, direction (IN/OUT), amount, external_reference, and optional SHA-256 description_hash

Raw statement descriptions are not stored; only an optional description hash is accepted. The import is transactional: invalid rows reject the batch. Re-importing the same statement reference is rejected to avoid duplicate lines.

## Reconcile one statement line
API action: reconcile_statement_line
Roles: FINANCING_ADMIN or SERVICING_FINANCE
Parameters: statement_line_id, entity_type (REPAYMENT or DISBURSEMENT), entity_id.

A line matches only when direction, amount, external reference and target lifecycle state agree exactly:
- IN + a RECEIVED/ALLOCATED repayment with the same amount and external reference. This posts Dr OPERATING_BANK / Cr PAYMENT_SUSPENSE and marks the receipt bank-reconciled.
- OUT + a SETTLED disbursement request with the same amount and external reference. This posts Dr BANK_CLEARING / Cr OPERATING_BANK and marks the request bank-reconciled.

Mismatches are persisted as EXCEPTION with a reason code and audit event; no journal is posted. A line can be reconciled only once. Batch status becomes RECONCILED only when every line matches; otherwise it remains PARTIAL or EXCEPTION.

## Read actions
- list_reconciliation_batches: batch summary and matched/exception counts.
- list_reconciliation_lines: lines for a batch, including match status and exception reason.

## Security and controls
- New tables use RLS; direct anon/authenticated access is revoked.
- Import, match and list operations are gated by the authenticated financing API and server-side role checks.
- Bank account identifiers must be masked. Raw statement descriptions and full account numbers are not accepted.
- All successful matches create a balanced ledger journal and audit event. Source uniqueness prevents duplicate journal postings.
- Reconciliation is based on a human-imported statement and operator match; it is not a bank API or cryptographic verification of the source document.

## Known limits
- No direct bank API or automatic CSV/file upload parser is implemented; the operator must normalize rows into the documented JSON shape.
- No auto-match, unmatched-line suggestions, reversal flow, correction/reopen flow, or multi-currency support.
- Accounting policy, bank statement format and evidence retention need approval from the financing company's finance/compliance owners.
- No production reconciliation batches are seeded.

## Acceptance checklist
1. Full/unmasked bank account numbers are rejected.
2. A duplicate statement reference is rejected.
3. Invalid line dates, directions, amounts or references roll back the entire batch.
4. Payment matching requires IN direction, equal amount, exact reference and eligible payment status.
5. Disbursement matching requires OUT direction, equal amount, exact reference and SETTLED status.
6. Mismatches are persisted as EXCEPTION without posting a journal.
7. A successful match posts a balanced journal and updates reconciliation fields.
8. Repeating a match cannot post a second journal.
9. The batch is RECONCILED only when every statement line is MATCHED.
10. Client roles cannot execute privileged RPCs or access the new tables directly.
