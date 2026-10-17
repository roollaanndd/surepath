# SurePath Engineering Instructions (ECC-adapted)

SurePath is a production insurance platform. These project instructions adapt the open-source Everything Claude Code (ECC) engineering workflow to this repository; they do not claim that every upstream ECC agent, hook, or skill is installed.

## Required workflow

For every non-trivial change:

1. **Research first:** inspect the existing implementation, tests, migrations, deployment configuration, and current behavior before proposing a change.
2. **Plan:** identify scope, affected files, dependencies, failure modes, rollback strategy, and acceptance criteria.
3. **Test first:** add or update a regression test before fixing a defect where practical. Never weaken a test merely to make it pass.
4. **Implement narrowly:** preserve existing architecture and API contracts; avoid unrelated refactors and unnecessary dependencies.
5. **Review independently:** inspect the diff for correctness, authorization gaps, data exposure, race conditions, and unintended side effects.
6. **Verify:** run the relevant tests and checks; report exact commands and outcomes. Do not claim a check passed unless it ran successfully.
7. **Document:** update operator or developer documentation when behavior, configuration, security posture, or deployment changes.
8. **Remember:** record durable project conventions in these instructions or focused docs rather than relying on chat history.

## SurePath architecture guardrails

- Frontend: React, TypeScript, Vite.
- Backend/data: Supabase Auth, Edge Functions, PostgreSQL, and Row Level Security (RLS).
- Deployment: Vercel; do not claim production is healthy based only on a successful GitHub change or a deployment being queued.
- Mobile: Capacitor/Android exists; changes to shared frontend dependencies must consider native compatibility.
- Preserve SurePath branding, product behavior, insurer/agent/customer roles, and commission/wallet business rules unless the task explicitly changes them.

## Security rules (non-negotiable)

- Treat all user input, uploaded documents, OCR output, model output, webhooks, and third-party responses as untrusted.
- Enforce authorization server-side. Never rely on UI hiding or client-supplied role/owner IDs. Check Supabase RLS policies and Edge Function authorization for sensitive operations.
- Never commit secrets, service-role keys, tokens, production data, or private customer/insurance documents. Use environment variables and approved secret storage.
- Validate inputs at trust boundaries; use least privilege, safe error messages, rate limiting where appropriate, and audit logging without sensitive payloads.
- Do not disable security controls or loosen RLS to make a test or feature work.
- Treat dependency audit findings as release blockers until triaged. Document any accepted exception with scope, owner, rationale, and expiry.
- Security tests must cover unauthenticated, unauthorized, cross-tenant, and malformed-input paths for sensitive flows.
- Never run destructive database migrations or production actions without an explicit rollback/recovery plan.

## Quality gates

Use the repository's existing scripts as the source of truth:

- `npm run lint` — edge-function checks, TypeScript, ESLint, and Vitest.
- `npm run test` — unit tests and Playwright end-to-end tests.
- `npm run build` — production build and distribution cleanliness check.
- `npm run check:android` — Android version consistency when relevant.

Run focused checks during iteration, then the broadest feasible suite before merge. If a command cannot run, state why; never substitute an assumption for evidence.

## Git and release discipline

- Work on a focused feature/fix branch; do not commit directly to `main` for non-trivial work.
- Keep diffs reviewable and avoid unrelated changes.
- Require review and passing applicable CI before merging.
- Never merge a failing or unverified security change just to satisfy a deadline.
- After merge, verify the exact commit and Vercel deployment status. A green build is not proof that production routes or user flows work.
- Report blockers explicitly, including dependency vulnerabilities and unavailable deployment checks.

## ECC workflow mapping

Follow the ECC pattern: **plan → test → implement → review → verify → document**. For security-sensitive work, perform a dedicated security review and use the project's approved security scanning tools. The upstream ECC repository remains the source for its full, evolving agent/skill catalog; this file is the SurePath-specific policy layer, not a vendored copy of the entire upstream project.
