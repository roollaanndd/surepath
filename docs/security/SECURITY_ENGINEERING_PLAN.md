# SurePath Security Engineering Plan

**Status:** Initial baseline; not a penetration-test certification.
**Scope:** SurePath web/PWA, admin and staff portals, Supabase Auth/Postgres/Storage/Edge Functions, partner/insurer API, Xendit webhooks, Vercel deployment.
**Standard:** Use OWASP ASVS 5.0.0 as a verification checklist. Only test systems and accounts we own or are explicitly authorized to assess.

## Operating rules

- No destructive tests, production data modification, denial-of-service, credential stuffing, or tests against third parties.
- Prefer static review and non-mutating tests. Use staging and synthetic accounts for active checks.
- Never put credentials, tokens, personal data, or raw payment payloads in logs or test artifacts.
- Every finding needs severity, evidence, affected component, reproducible safe test, remediation, owner, and retest result.
- Do not merge a security change solely because the UI looks correct. Require CI and negative authorization tests.
- Do not change live database policies or Edge Function JWT settings without reviewing call sites and validating webhook/cron authentication; some endpoints intentionally receive unauthenticated platform callbacks.

## Independent review workstreams

### Workstream A — Identity and authorization
- Test unauthenticated access, invalid/expired/revoked sessions, role escalation, cross-user object access, and staff/admin route/API access.
- Verify role checks on the server and database; frontend menu hiding is not an authorization control.
- Verify admin MFA, recovery flow, session revocation, and password-leak protection settings.

### Workstream B — Database, storage, and secrets
- Inventory exposed schemas, RLS policies, grants, SECURITY DEFINER functions, storage buckets and object policies.
- Confirm each RLS-enabled table with no policy is intentionally deny-by-default and that intended server-side paths still work.
- Scan source and CI artifacts for accidental secrets; confirm service-role and provider credentials never reach client bundles.
- Review backups, document access, API-key hashing/rotation, and audit-log tamper resistance.

### Workstream C — API, payments, and business abuse
- Review every Edge Function with verify_jwt disabled and document its compensating authentication (signed webhook, cron secret, one-time token, or explicit public behavior).
- Verify webhook signature validation, idempotency, replay handling, rate limiting, payload size limits, input validation, and error redaction.
- Verify policy issuance, commission crediting, wallet changes, and disbursements cannot be invoked by unauthorized roles or duplicated by retries.
- Review partner API scopes, key revocation, quotas, and webhook delivery retry behavior.

### Workstream D — Build and operations
- Run TypeScript, lint, unit/integration tests, dependency checks, secret scanning, and CodeQL.
- Review deployment protection, branch protections, CI permissions, dependency pinning, and production environment separation.
- Verify alert delivery, incident response steps, backup restore, and rollback.

## Initial confirmed Supabase Advisor observations (2026-10-16)

1. Leaked-password protection is disabled. Enable it in Supabase Auth settings after confirming the project's supported configuration.
2. Advisor flags public RPC execution for `is_admin()`, `is_operator()`, and `is_staff()` because they are SECURITY DEFINER functions callable by authenticated users. Review definitions and all RLS/function call sites before changing grants; blanket revocation can break policies.
3. Seven tables have RLS enabled but no policies: `sp_activity_log`, `sp_api_idempotency`, `sp_api_keys`, `sp_api_requests`, `sp_api_webhook_deliveries`, `sp_db_object_backup`, and `sp_user_documents`. Confirm intentional deny-by-default and service-role-only access.
4. `pg_net` is installed in `public`; inspect dependencies before moving it.

These are findings to validate, not proof of exploitable vulnerabilities. The Advisor output is not a full penetration test.

## Release gates

- [ ] Every high/critical finding is fixed or explicitly risk-accepted with compensating controls.
- [ ] Negative tests prove anonymous and cross-user requests are denied.
- [ ] Edge Functions with JWT verification disabled have documented alternate authentication.
- [ ] Payment and disbursement flows pass replay/idempotency tests in staging.
- [ ] CI security checks pass and reviewers inspect the diff.
- [ ] Production deploy is READY, smoke-tested, and rollback path is known.
- [ ] Re-run Supabase Security Advisor and record remaining warnings.

## Incident response minimum

1. Triage and preserve relevant audit evidence.
2. Revoke compromised sessions/API keys and rotate affected secrets.
3. Contain the affected endpoint or integration without disabling unrelated critical business flows.
4. Assess data exposure and payment/business impact.
5. Restore from a verified clean state if needed, then retest and document follow-up actions.
