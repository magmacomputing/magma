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

has_error=0

for entry in "${packages[@]}"; do
  pkg_name="${entry%%:*}"
  rel_path="${entry#*:}"
  full_npm_name="@magmacomputing/${pkg_name}"
  
  # Fetch published version from NPM registry
  npm_out=$(npm view "${full_npm_name}" version 2>&1) && npm_code=0 || npm_code=$?
  if [ "${npm_code}" -eq 0 ]; then
    published_ver="${npm_out}"
  elif echo "${npm_out}" | grep -q -E "E404|404 Not Found"; then
    published_ver="not published"
  else
    published_ver="lookup failed"
    has_error=1
  fi
  
  # Read local version from package.json
  local_ver="unknown"
  target_json="${REPO_ROOT}/${rel_path}"
  if [ -f "${target_json}" ]; then
    local_ver=$(node --input-type=module -e "import fs from 'fs'; console.log(JSON.parse(fs.readFileSync(process.argv[2], 'utf8')).version)" dummy "${target_json}" 2>/dev/null || echo "unknown")
  fi
  if [ "${local_ver}" = "unknown" ]; then
    has_error=1
  fi
  
  status="Up to date"
  if [ "${published_ver}" != "${local_ver}" ]; then
    status="Out of sync"
    has_error=1
  fi
  
  printf "%-38s | %-16s | %-16s | %-12s\n" "${full_npm_name}" "${published_ver}" "${local_ver}" "${status}"
done

exit ${has_error}
