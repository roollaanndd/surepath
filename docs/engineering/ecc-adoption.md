# ECC Toolkit in SurePath

SurePath uses the upstream Everything Claude Code (ECC) toolkit as a project-local developer toolset. The installer pins ECC to release `2.2.3` and installs the broad engineering catalog supported by ECC's Antigravity project adapter into `.agents/`. One unrelated restricted module is intentionally excluded.

Upstream: https://github.com/affaan-m/ECC
Release: `ecc-universal@2.2.3`
License: MIT; upstream attribution and license remain with ECC.

## Install

From the repository root, preview the exact operations first:

```bash
bash scripts/install-ecc.sh --dry-run
```

Then install the project-local toolkit:

```bash
bash scripts/install-ecc.sh
```

The installer writes into `.agents/`, which is ignored by the existing `.gitignore` so generated tooling does not pollute application releases or client handover. Run the install in each developer workspace that needs ECC. Node.js 18 or newer and network access to the npm registry are required.

## What is included

The selected compatible modules cover coding agents, skills, rules, workflow commands, database and TypeScript practices, test/review workflows, security review, research/documentation, DevOps, and related engineering support. ECC's installer automatically skips components unsupported by the selected project adapter.

## SurePath guardrails

- Root `AGENTS.md` remains the source of truth for SurePath-specific engineering and security requirements.
- Preserve Supabase RLS and server-side authorization; never expose secrets, service-role keys, customer data, or insurance documents to agents or logs.
- Review hooks and executable scripts before enabling them. A security scanner is useful evidence, not a security certification.
- ECC does not replace dependency auditing, CI, negative authorization tests, webhook replay tests, or production verification.
- The ECC toolkit is developer tooling; it must not be imported into or bundled with the customer-facing Vite application.

## Updating

Do not silently float to latest. Review ECC release notes and source, update the pinned version and module selection intentionally, preview the installer, then run SurePath quality gates. Do not stack multiple install methods for the same coding harness.
