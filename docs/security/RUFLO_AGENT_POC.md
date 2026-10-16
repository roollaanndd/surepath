# Ruflo Security-Agent Proof of Concept

**Status:** Proposal only — Ruflo has not been installed or executed against SurePath.
**Owner:** SurePath engineering
**Purpose:** Evaluate whether Ruflo can coordinate independent, evidence-producing security reviews without granting agents production authority.

## Security boundary

Ruflo must be an optional security-review tool, not a runtime dependency of the customer-facing SurePath application. Do not install it in the production app dependency tree.

The first trial must use an isolated, disposable environment and a read-only checkout of SurePath. It must not have production credentials, Supabase service-role keys, payment-provider secrets, Vercel deployment tokens, customer data, or write access to the repository. Do not run active tests against production. Use synthetic accounts and staging for any authorized dynamic checks.

Before running Ruflo, pin an exact reviewed release and lock its dependency graph. Review package provenance, install scripts, permissions, network behavior, and transitive dependencies. Do not use an unpinned `latest` tag in CI. Treat agent output and files it reads as untrusted input.

## Proposed independent agents

1. **Identity & authorization reviewer** — trace server-side role checks, session lifecycle, admin/staff boundaries, and cross-user access controls.
2. **Supabase/database reviewer** — inventory RLS, grants, SECURITY DEFINER functions, storage policies, and exposed schemas; propose changes only after call-site analysis.
3. **API/webhook reviewer** — inspect signature verification, replay protection, idempotency, rate limits, input validation, and error redaction.
4. **Payments & insurance-integrity reviewer** — review policy issuance, premium calculations, commission crediting, wallet changes, and disbursement paths; do not mutate live data.
5. **Dependency & supply-chain reviewer** — examine lockfiles, direct/transitive vulnerabilities, install scripts, secrets exposure, and CI permissions.
6. **Independent challenger** — attempt to falsify each finding, distinguish evidence from inference, and reject unsupported severity claims.
7. **Release verifier** — independently re-run the existing test/security gates and report the exact commit and results. It must not merge or deploy.

## Required evidence for every finding

Each agent must report: stable finding ID, affected file/route/function, severity and rationale, concrete code evidence, a safe reproducible test, expected versus observed result, remediation proposal, regression tests, confidence, and retest status. Duplicate findings should be deduplicated. A finding without code-level evidence is a hypothesis, not a confirmed vulnerability.

## Execution and release controls

- Start with static review of the read-only checkout only.
- Keep agent outputs in temporary, access-controlled artifacts; redact secrets and personal data.
- Never allow the agent to run destructive tests, denial-of-service, credential stuffing, production mutations, or third-party scans.
- If a model/provider credential is needed, use a narrowly scoped CI secret configured by an authorized maintainer; never paste it into source, logs, artifacts, or chat.
- Any proposed patch goes to a separate branch and must pass CI, dependency audit, CodeQL, secret scanning, and relevant negative authorization/regression tests.
- A human reviewer must approve security-sensitive changes. Agents cannot self-approve, merge, change production settings, or deploy.
- Do not auto-change RLS/grants, JWT verification, cron/webhook authentication, or payment logic without tracing call sites and proving the replacement controls work.

## Proof-of-concept acceptance criteria

The trial is successful only if it:

- runs without write permissions or production secrets;
- identifies a small set of real, reproducible findings in a seeded test fixture or manually verified code sample;
- avoids false claims when evidence is insufficient;
- produces repeatable results and a useful report with exact commit references;
- adds no Ruflo dependency to the SurePath application;
- does not bypass existing CI or human release approval.

## Existing baseline

SurePath's GitHub Security Review workflow currently runs a production dependency audit, CodeQL analysis, and Gitleaks secret scanning. The run on commit `005b04ca58bfd61d7014f06ebbebd4470bec80e9` completed successfully on 2026-10-16. This is a useful baseline, not a penetration-test certification. Continue to track Supabase Advisor observations and validate them against actual policies and call sites before changing live configuration.

## Next implementation step

Review Ruflo's pinned release and threat model, then run a time-boxed, read-only trial in an isolated runner. Do not add an executable Ruflo workflow until the exact CLI invocation, model-provider configuration, artifact handling, and sandbox restrictions have been reviewed.
