# Plan: Tempo v4 & v5 Concurrent Branching, Maintenance, and Release Strategy

## 1. Executive Summary

As Tempo prepares for the upcoming **v5.0.0** major milestone (including the `@tempo-dev` scope transition and architecture modernization), the ecosystem requires active concurrent maintenance:
- **v5.x (`main`)**: Active development of major breaking features, modern architecture, and `@tempo-dev` packaging.
- **v4.x (`v4.x` / `maintenance/v4`)**: Long-Term Support (LTS) maintenance for bug fixes, security patches, documentation enhancements, and stable community plugin support.

This document establishes the official procedures for branch topology, conflict-free realignment, multi-branch development via `git worktree`, backporting workflows, and npm release distribution tags.

---

## 2. Branch Topology & Lifecycle

```
                    v4.5.2       v4.5.3       v4.6.0 (Final minor)
v4.x branch  --------o------------o------------o-------------------> (LTS / Maintenance)
            \        ^            ^            ^
  (cut point)\      / (cherry-pick backports) /
              \    /                         /
main branch ---o--o-------------------------o----------------------> (v5.0.0 breaking work)
               v4.5.1
```

### Branch Roles
1. **`main`**: The primary development branch.
   - Prior to v5.0.0 cut: Tracks v4.6.0 finalization.
   - After v5.0.0 branch point: Becomes the home for v5 breaking changes.
2. **`v4.x` (or `maintenance/v4`)**: The stable LTS branch.
   - Cut from the stable release commit of v4.
   - Receives only patch fixes (`4.5.x`), security patches, and doc updates.
   - Never receives breaking changes.

---

## 3. Resolving Squash-Merge Divergence (Clean Feature Realignment)

### The Problem
When feature branches (e.g. `feature/evaluate`) are **squash-merged** onto `main`, Git condenses all intermediate commits into a single new commit hash. If another concurrent branch (e.g. `feature/term-lifecycle-hooks`) branched from an intermediate commit of that feature branch, running a standard `git merge main` causes:
1. False conflicts across files touched by intermediate commits (e.g. `#library` runtime utilities).
2. Re-introduction of already-squashed duplicate commits into the branch history.

### The Realignment Procedure (Step-by-Step)

When an in-flight feature branch needs to sync with `main` after a squash-merge:

1. **Ensure local `main` is fresh**:
   ```bash
   git checkout main
   git pull origin main
   ```

2. **Create a fresh alignment branch based on latest `main`**:
   ```bash
   git checkout -b feature/my-feature-aligned main
   ```

3. **Check out only the specific package/directories modified in the feature branch**:
   ```bash
   # Replaces only the feature files without touching shared packages
   git checkout feature/my-feature-original -- packages/tempo
   ```

4. **Verify tests and linting**:
   ```bash
   npm test
   npm run lint  # or review:agent
   ```

5. **Commit the clean feature changes**:
   ```bash
   git commit -m "feat(tempo): <description of feature>"
   ```

6. **Replace the old branch pointer and push**:
   ```bash
   git branch -D feature/my-feature-original
   git branch -m feature/my-feature-original
   git push -u origin feature/my-feature-original --force-with-lease
   ```

---

## 4. Concurrent Multi-Branch Management via `git worktree`

Switching branches back and forth in a single working directory triggers frequent dependency churn, cache invalidation, and slow `npm install` cycles. Industry standard practice is to use **`git worktree`**.

### Creating Worktrees for v4 and v5

```bash
# From inside the magma repository root:
# 1. Ensure you have the maintenance branch created
git branch v4.x origin/v4.x

# 2. Add an isolated worktree folder alongside magma
git worktree add ../magma-v4 v4.x
```

Your filesystem structure now looks like:
```text
Project/
├── magma/        # Active on 'main' (v5.0.0 development)
└── magma-v4/     # Active on 'v4.x' (LTS / v4 maintenance)
```

### Advantages of Worktrees
- **Independent `node_modules`**: No need to reinstall dependencies when switching between v4 and v5.
- **Side-by-Side IDE Windows**: Keep both versions open simultaneously to compare behavior, run tests, or debug.
- **Shared Git Database**: Commits, branches, and stashes are instantly shared between both directories without extra fetching.

### Worktree Housekeeping
When a maintenance branch is retired:
```bash
git worktree remove ../magma-v4
```

---

## 5. Backporting & Forward-Porting Workflows

To prevent divergence and maintain stability across active versions:

### Pattern A: "Fix on Oldest Supported" (Recommended)
1. Fix bugs on the **`v4.x`** maintenance branch first.
2. Verify tests on v4.
3. Switch to `main` (or worktree) and cherry-pick the fix:
   ```bash
   git checkout main
   git cherry-pick -x <v4-commit-hash>
   ```
   *The `-x` flag automatically records `(cherry picked from commit ...)` in the commit message for auditable traceability.*

### Pattern B: Forward Backporting with PR Automation
If a bug fix is originally implemented and reviewed on `main`:
1. Merge the PR on `main`.
2. Apply the label `backport:v4` to the GitHub PR.
3. A GitHub Action (e.g. `korthout/backport-action`) automatically cherry-picks the merged commit and opens a PR against the `v4.x` branch.

---

## 6. npm Distribution Tags & Release Safeguards

To prevent accidentally breaking consumer installs or overwriting production versions, npm distribution tags must be strictly isolated.

### Phase 1: Pre-v5.0.0 Release (v4 is Production)

| Package Version | npm Tag | Command | Result |
| :--- | :--- | :--- | :--- |
| **`v4.5.x` / `v4.6.0`** | `latest` (Default) | `npm publish` | Installed by `npm install @magmacomputing/tempo` |
| **`v5.0.0-alpha.x`** | `next` | `npm publish --tag next` | Installed only via `npm install @magmacomputing/tempo@next` |

### Phase 2: Post-v5.0.0 Release (v5 is Production)

| Package Version | npm Tag | Command | Result |
| :--- | :--- | :--- | :--- |
| **`v5.x.x`** | `latest` (Default) | `npm publish` | Installed by `npm install @tempo-dev/core` |
| **`v4.x.x` (LTS Patches)** | `legacy` or `v4` | `npm publish --tag legacy` | Installed only via `@magmacomputing/tempo@legacy` |

> [!CAUTION]
> **Never run bare `npm publish` on a `v4.x` branch after `v5.0.0` is published to `latest`!** Bare `npm publish` defaults to the `latest` dist-tag and would downgrade consumers from v5 back to v4.

### Release Script Verification Gate
Ensure publishing scripts (in `package.json` or `.bin/publish.mjs`) validate the version number before setting `--tag`:
```javascript
const version = semver.parse(packageJson.version);
const isV4 = semver.major(version) === 4;
const isV5 = semver.major(version) >= 5;

let distTag = 'latest';
if (isV4 && v5AlreadyReleased) {
  distTag = 'legacy';
} else if (isV5 && semver.prerelease(version)) {
  distTag = 'next';
}
```
