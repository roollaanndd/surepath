#!/usr/bin/env bash
set -euo pipefail

# Pinned ECC release; review upstream release notes before changing this version.
ECC_VERSION="2.2.3"

# Install the broad engineering toolkit while excluding an unrelated restricted
# module. ECC's installer filters unsupported components for the Antigravity
# project adapter and writes the local tooling into ./.agents/.
ECC_MODULES="rules-core,agents-core,commands-core,hooks-runtime,platform-configs,framework-language,database,workflow-quality,skill-unified-memory,security,research-apis,business-content,operator-workflows,optimization-workflows,operator-desk-patterns,ito-compute,nasiko-control-plane,social-distribution,media-generation,orchestration,swift-apple,agentic-patterns,devops-infra,machine-learning,supply-chain-domain,document-processing"

args=(install --target antigravity --modules "$ECC_MODULES")
if [[ "${1:-}" == "--dry-run" ]]; then
  args+=(--dry-run)
elif [[ "$#" -gt 0 ]]; then
  echo "Usage: bash scripts/install-ecc.sh [--dry-run]" >&2
  exit 2
fi

exec npx --yes "ecc-universal@${ECC_VERSION}" "${args[@]}"
