# Financing Core Phase 2 — Credit Decisioning

## Scope
Phase 2 adds a versioned, auditable underwriting-rule layer and an indicative affordability assessment. It does not automatically approve or decline a financing application, and it does not call a credit bureau or SLIK provider.

## Required configuration
No rule sets are seeded because SurePath must not invent the financing company's approved underwriting policy. A verified FINANCING_ADMIN must configure the real policy for each product before credit assessment can run.

Rule fields:
- min_amount, max_amount in IDR
- min_tenor_months, max_tenor_months
- annual_interest_rate_pct
- max_dti_pct
- min_monthly_income

Every configuration creates a new version, deactivates the prior version for that product, and writes an audit event. Existing assessments retain the exact rule version and the financial assumptions used.

## API actions
All actions use the existing financing-api function and require a valid Supabase user JWT plus an active financing role.

### list_product_rules
Read access for authorized financing roles. Returns only active rules.

### configure_product_rule
Role: FINANCING_ADMIN only. Required params example:
~~~json
{
  "product_code": "MOTOR_VEHICLE",
  "min_amount": 10000000,
  "max_amount": 500000000,
  "min_tenor_months": 6,
  "max_tenor_months": 60,
  "annual_interest_rate_pct": 12,
  "max_dti_pct": 35,
  "min_monthly_income": 5000000
}
~~~
The values above are illustrative API shape only, not recommended or approved underwriting policy. Do not copy them into production without formal approval by the financing company.

### evaluate_credit
Roles: CREDIT_ANALYST or FINANCING_ADMIN. Required params example:
~~~json
{
  "application_id": "<application UUID>",
  "monthly_income": 15000000,
  "existing_monthly_obligations": 2000000,
  "down_payment": 25000000,
  "notes": "Optional assessment note"
}
~~~
The amounts above are illustrative API shape only. Assessment is allowed only while the application is in CREDIT_REVIEW and only after an active product rule has been configured.

The API estimates the monthly installment using the configured annual nominal rate and requested tenor, then calculates DTI as (existing monthly obligations + estimated monthly installment) / monthly income * 100. Outcomes are RECOMMEND_REVIEW, REFER, or INELIGIBLE; none is an approval decision. Amount/tenor outside policy produces INELIGIBLE; income/DTI policy flags produce REFER. A qualified human approver must still make the formal application state transition.

### list_credit_assessments
Roles: FINANCING_ADMIN, CREDIT_ANALYST, CREDIT_APPROVER, or AUDITOR. Can filter by application ID and limit the result count. Treat income and affordability fields as confidential financial information.

## Data protection and controls
- New tables have RLS enabled; direct anon/authenticated table grants are revoked.
- All writes use server-side RPCs granted only to service_role; the Edge Function checks the caller's role first.
- Product rules are versioned; new configuration creates a new version.
- Assessment writes are transactional with an audit event, verify the application is still in credit review, and enforce product-rule/application consistency.
- The result always returns humanDecisionRequired: true.
- No bureau/SLIK data is fetched or stored in this phase.

## Acceptance checklist
1. Unauthenticated requests are rejected.
2. A user without a financing role receives 403.
3. Only FINANCING_ADMIN can configure a rule; invalid ranges and percentages are rejected.
4. Rule version increments and prior active version is deactivated.
5. Assessment fails closed when rules are missing or application is not in credit review.
6. A product's rule cannot be used to assess another product's application.
7. Assessment outcomes and reasons are persisted with the rule version and audit event.
8. ORIGINATION cannot configure rules or assess credit.
9. Assessment is an advisory calculation only and cannot transition application status.
10. Regression/build checks pass before production promotion.
