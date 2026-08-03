#!/usr/bin/env bash
# Check published NPM versions vs local workspace versions for Tempo and plugins

set -e

packages=(
  "tempo:packages/tempo/package.json"
  "tempo-plugin-ai:packages/plugins/ai/package.json"
  "tempo-plugin-astro:packages/plugins/astro/package.json"
  "tempo-plugin-batch:packages/plugins/batch/package.json"
  "tempo-plugin-finance:packages/plugins/finance/package.json"
  "tempo-plugin-snap:packages/plugins/snap/package.json"
  "tempo-plugin-sync:packages/plugins/sync/package.json"
)

# Resolve repository root path (3 levels up from packages/plugins/.bin)
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"

printf "%-38s | %-16s | %-16s | %-12s\n" "Package Name" "Published (NPM)" "Local Workspace" "Status"
printf "%-38s-+-%-16s-+-%-16s-+-%-12s\n" "--------------------------------------" "----------------" "----------------" "------------"

for entry in "${packages[@]}"; do
  pkg_name="${entry%%:*}"
  rel_path="${entry#*:}"
  full_npm_name="@magmacomputing/${pkg_name}"
  
  # Fetch published version from NPM registry
  published_ver=$(npm view "${full_npm_name}" version 2>/dev/null || echo "not published")
  
  # Read local version from package.json
  local_ver="unknown"
  target_json="${REPO_ROOT}/${rel_path}"
  if [ -f "${target_json}" ]; then
    local_ver=$(node --input-type=module -e "import fs from 'fs'; console.log(JSON.parse(fs.readFileSync(process.argv[2], 'utf8')).version)" dummy "${target_json}" 2>/dev/null || echo "unknown")
  fi
  
  status="Up to date"
  if [ "${published_ver}" != "${local_ver}" ]; then
    status="Out of sync"
  fi
  
  printf "%-38s | %-16s | %-16s | %-12s\n" "${full_npm_name}" "${published_ver}" "${local_ver}" "${status}"
done
