# ECC Toolkit in SurePath

SurePath vendors the upstream Everything Claude Code (ECC) toolkit as a Git submodule at `.agents/`, pinned to a reviewed upstream commit. This keeps the upstream license and source intact instead of copying or modifying hundreds of upstream files.

Upstream: https://github.com/affaan-m/ECC
Pinned revision: `b92f181b3b748d1abbc2afd94af6aa7d8c8fca29`
License: MIT; see `.agents/LICENSE`.

## Checkout

Fresh clones must initialize the submodule:

```bash
git submodule update --init --recursive
```

If you omit this step, the `.agents/` directory will be empty and ECC skills/agents will not be available.

## Use

The submodule exposes ECC's upstream `agents/`, `skills/`, `commands/`, `hooks/`, `rules/`, and harness adapters under `.agents/`. Use the native installation path documented by ECC for the coding harness you actually run; do not stack multiple install methods into the same harness. The repository-level `AGENTS.md` remains the source of truth for SurePath-specific guardrails and business logic.

ECC is a developer workflow toolkit, not a production runtime dependency. It should not be imported into the customer-facing Vite application or bundled into production assets.

## Updating ECC

1. Review the upstream changes and release/security notes.
2. Update the submodule pointer to an exact reviewed commit.
3. Run the applicable SurePath quality gates and inspect the diff.
4. Merge only after the PR and deployment checks are green.

Do not blindly auto-update the submodule. ECC can include executable hooks and scripts; treat them as code and review them before enabling.

## SurePath-specific limits

- Preserve server-side authorization, Supabase RLS, and least privilege.
- Never expose secrets, service-role keys, customer data, or insurance documents to agents or logs.
- AgentShield findings do not replace dependency audits, CodeQL, secret scanning, or tests of authorization and payment/webhook flows.
- A successful web build does not prove ECC agents are installed in a developer's local harness, and a green Vercel deployment does not certify the security of the insurance platform.
