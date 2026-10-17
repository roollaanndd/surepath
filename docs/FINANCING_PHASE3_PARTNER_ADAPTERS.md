# Financing Core Phase 3 — Partner Adapter Foundation

## What this phase does
This phase establishes the controlled registry for multiple external verification, credit-bureau/SLIK, document-verification and vehicle-valuation providers. It records provider metadata and creates a privacy-conscious request ledger schema for future adapter implementations.

This is deliberately not a live integration release: no provider has been selected, no credentials have been provisioned, and no outbound requests are sent by the current API.

## Provider configuration
API action: configure_partner_provider. Role: FINANCING_ADMIN only.

Required parameters:
- provider_code: uppercase stable code, e.g. VENDOR_X (example only)
- provider_name
- capability: IDENTITY_VERIFICATION, CREDIT_BUREAU, SLIK, DOCUMENT_VERIFICATION, VEHICLE_VALUATION
- environment: SANDBOX or PRODUCTION
- endpoint_base_url: public HTTPS base URL
- secret_env_key: name of a server-side environment variable, never its secret value

Configuration returns CONFIGURED at most. It never activates a provider. Reconfiguring a provider resets it to CONFIGURED, requiring a new approval/test cycle. Never store API tokens, passwords, identity data, bureau reports, or raw request/response payloads in the registry.

API action: list_partner_providers. Roles: FINANCING_ADMIN, COMPLIANCE, AUDITOR. It returns only whether an endpoint and secret environment-variable name are configured, not their values.

## Approval gates
- DRAFT: provider metadata only / incomplete configuration.
- CONFIGURED: endpoint and secret environment-variable name are present.
- SANDBOX_TESTED: set only after documented contract, authentication, timeout, retry, idempotency, signature, error mapping, and privacy tests pass.
- LIVE_APPROVED: set only after the business owner, compliance, and security approve the vendor, contract, lawful data-sharing basis, retention, and production credentials.
- PAUSED: provider disabled pending investigation or maintenance.

The current Edge Function intentionally has no outbound partner-dispatch action. A provider-specific adapter must be implemented and tested before any network request can be sent. A generic arbitrary-URL HTTP proxy is not permitted.

## Request ledger
The sp_financing_partner_requests table is designed to record provider/application references, operation, idempotency key, SHA-256 request hash, status, correlation ID, sanitized response summary, and timestamps. It deliberately has no raw request body or raw response body column. This phase does not yet write request rows because the adapter execution lifecycle is not enabled.

## Security controls
- RLS enabled; direct anon/authenticated table grants revoked.
- Provider writes use a service-role-only RPC that independently checks FINANCING_ADMIN.
- Provider status cannot be set to SANDBOX_TESTED or LIVE_APPROVED via the API.
- HTTPS URL validation rejects URL credentials, query strings, fragments, and common private/local host patterns.
- No credentials are stored in Postgres; secret_env_key is a variable name only.
- Configuration changes are audit logged and reset provider status to CONFIGURED.

## Acceptance checklist
1. Unauthenticated requests rejected by the Supabase gateway.
2. ORIGINATION/CREDIT_ANALYST cannot list or configure providers.
3. FINANCING_ADMIN can configure provider metadata and receives only safe configuration metadata.
4. No API action can activate LIVE_APPROVED or dispatch a provider request.
5. Reconfiguring an approved provider resets it to CONFIGURED.
6. Provider secrets and raw verification/bureau payloads are never persisted.
7. Vendor-specific sandbox tests are completed before a later phase enables any outbound calls.
