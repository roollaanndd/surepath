# ECC Adoption in SurePath

**Status:** project policy integrated on branch `chore/ecc-engineering-system`; full upstream runtime/tool catalog is not vendored or installed by this change.

## Upstream

- Repository: https://github.com/affaan-m/ECC
- License: MIT (retain the upstream copyright/license notice when redistributing upstream code)
- Purpose: reusable engineering workflows, specialist agents/skills, hooks, memory/learning patterns, and security scanning.

SurePath adopts ECC's research-first, plan/test/review/verify loop while keeping product-specific security and release requirements in `/AGENTS.md`.

## How this is used

AI coding tools that read repository-level `AGENTS.md` should follow the SurePath rules automatically. Contributors should read that file before changing code. For the complete upstream toolset, follow the current official installation guide for the coding harness being used; supported features vary by harness. Do not blindly copy a full global install into this project or stack multiple installation methods.

## SurePath-specific policy

ECC is an engineering aid, not a security certification. It does not replace:
- GitHub CI and dependency auditing;
- Supabase RLS and server-side authorization reviews;
- secret scanning and vulnerability remediation;
- tests of insurer, agent, customer, commission, and wallet flows;
- verification of the actual Vercel deployment and production user journeys.

Known security follow-up: the existing security work had unresolved dependency audit findings involving Capacitor Android and transitive `esbuild`/`qs` packages. Verify current lockfile/audit state and close or formally triage those findings before treating the security baseline as complete.

## Adoption sequence

1. Apply the SurePath project rules in `AGENTS.md`.
2. Use the plan → test → implement → independent review → verify loop for non-trivial work.
3. Keep security checks in CI and require fixes/explicit triage for high-severity findings.
4. Add harness-specific ECC hooks/skills only after checking the current upstream installation guide, project compatibility, and CI behavior.
5. Verify CI, merge status, and the deployed production behavior separately.

## Attribution

ECC remains maintained by its upstream authors. SurePath is adopting and adapting its engineering methodology; this document does not imply ownership of the upstream project or its name.
