#!/usr/bin/env bash
# Compare plugin files in current branch against main branch to verify version bumps

set -e

MAIN_BRANCH="${1:-main}"
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"

printf "%-25s | %-13s | %-14s | %-14s | %-30s\n" "Plugin Package" "Files Changed" "Main Version" "Branch Version" "Version Bump Status"
printf "%-25s-+-%-13s-+-%-14s-+-%-14s-+-%-30s\n" "-------------------------" "-------------" "--------------" "--------------" "------------------------------"

for plugin_dir in "${REPO_ROOT}/packages/plugins"/*; do
  if [ -d "${plugin_dir}" ] && [ -f "${plugin_dir}/package.json" ]; then
    plugin_name=$(basename "${plugin_dir}")
    rel_path="packages/plugins/${plugin_name}"
    
    # Count changed files in this plugin (excluding package.json)
    changed_count=$(git diff --name-only "${MAIN_BRANCH}...HEAD" -- "${rel_path}" 2>/dev/null | grep -v "package.json" | wc -l || echo "0")
    
    # Read version from main branch
    main_version=$(git show "${MAIN_BRANCH}:${rel_path}/package.json" 2>/dev/null | node --input-type=module -e "import fs from 'fs'; console.log(JSON.parse(fs.readFileSync(process.stdin.fd, 'utf8')).version)" 2>/dev/null || echo "[NEW]")
    
    # Read version from current working branch
    branch_version=$(node --input-type=module -e "import fs from 'fs'; console.log(JSON.parse(fs.readFileSync(process.argv[2], 'utf8')).version)" dummy "${plugin_dir}/package.json" 2>/dev/null || echo "unknown")
    
    # Determine status
    status="Clean (Unchanged)"
    if [ "${main_version}" = "[NEW]" ]; then
      status="🆕 New Plugin (v${branch_version})"
    elif [ "${changed_count}" -gt 0 ]; then
      if [ "${main_version}" = "${branch_version}" ]; then
        status="🚨 MODIFIED WITHOUT VERSION BUMP!"
      else
        status="✅ Bumped (v${main_version} -> v${branch_version})"
      fi
    fi
    
    printf "%-25s | %-13s | %-14s | %-14s | %-30s\n" "${plugin_name}" "${changed_count}" "${main_version}" "${branch_version}" "${status}"
  fi
done
