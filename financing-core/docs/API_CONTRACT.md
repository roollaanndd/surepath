# API contract outline

Base path: `/api/v1/financing` (proposed; not live).

| Method | Path | Purpose | Access |
|---|---|---|---|
| GET | `/products` | List partner-enabled financing products | authenticated tenant member |
| POST | `/applications` | Create application with consent reference and idempotency key | maker / partner user |
| GET | `/applications` | Search tenant-scoped applications | permitted role |
| GET | `/applications/{id}` | Read application and timeline | permitted tenant role |
| POST | `/applications/{id}/documents` | Register/upload document metadata | maker / operations |
| POST | `/applications/{id}/verification-requests` | Request approved provider verification | verification role |
| POST | `/applications/{id}/assessments` | Record credit assessment | credit analyst |
| POST | `/applications/{id}/decisions` | Approve/reject with maker-checker separation | authorized approver |
| POST | `/applications/{id}/offers` | Generate versioned offer | authorized operations |
| POST | `/contracts/{id}/signing-sessions` | Create approved e-sign flow | authorized operations |
| POST | `/contracts/{id}/disbursements` | Initiate partner-approved disbursement | finance + dual approval |
| GET | `/accounts/{id}/repayments` | Read repayment schedule and posted receipts | finance / permitted customer |
| POST | `/webhooks/{provider}` | Receive signed provider events | provider signature verification |

All endpoints are **proposed only**. Every production request must enforce JWT, tenant membership, purpose-bound consent, schema validation, idempotency for mutations, correlation ID, audit events, rate limits, and least-privilege database access. Do not expose provider credentials or credit bureau responses to the browser.
