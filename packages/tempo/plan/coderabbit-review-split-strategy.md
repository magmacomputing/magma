# CodeRabbit Staged PR Review & Merge Plan

## Executive Summary
To overcome CodeRabbit's hard limit of **100 files per pull request review**, the monolithic `feature/dynamic-functional-context` branch (245 modified files) has been decomposed into **3 clean, self-contained, stacked feature branches**.

Each branch contains a logical chunk of the monorepo, passes all 1,316 unit tests, and fits within CodeRabbit's review window.

---

## 1. Branch Topology & Diff Breakdown

```text
                       ┌─────────────────────────────────────────┐
                       │                  main                   │
                       └────────────────────┬────────────────────┘
                                            │
                                            ▼
                       ┌─────────────────────────────────────────┐
                       │   PR 1: feature/dfc-1-library           │
                       │   (71 files) - @magmacomputing/library   │
                       └────────────────────┬────────────────────┘
                                            │
                                            ▼
                       ┌─────────────────────────────────────────┐
                       │   PR 2: feature/dfc-2-tempo             │
                       │   (95 files) - @magmacomputing/tempo    │
                       └────────────────────┬────────────────────┘
                                            │
                                            ▼
                       ┌─────────────────────────────────────────┐
                       │   PR 3: feature/dfc-3-plugins           │
                       │   (53 files) - @magmacomputing/plugins  │
                       └─────────────────────────────────────────┘
```

| Branch Name | Primary Scope | File Count | Target Base |
| :--- | :--- | :---: | :--- |
| `feature/dfc-1-library` | `#library` primitives, evaluation runtime, assertions, pledge, proxy, temporal helpers | **71 files** | `main` |
| `feature/dfc-2-tempo` | `tempo` core engine, pattern deduplication, `MutateModule` aliases (`plus`/`minus`), `tempo-cli` | **95 files** | `feature/dfc-1-library` (or `main`) |
| `feature/dfc-3-plugins` | `ticker` plugin, `ai` plugin updates, `.std` terms, plugin ecosystem build config | **53 files** | `feature/dfc-2-tempo` (or `main`) |

---

## 2. Step-by-Step Execution Guide

### Phase 1: Push Local Stacked Branches to GitHub

Run the following command in terminal to publish all three pre-built branches:

```bash
git push origin feature/dfc-1-library
git push origin feature/dfc-2-tempo
git push origin feature/dfc-3-plugins
```

---

### Phase 2: PR 1 — Core Utility Library (`@magmacomputing/library`)

1. **Open Pull Request #1 on GitHub**:
   * **Base branch**: `main`
   * **Compare branch**: `feature/dfc-1-library`
   * **Title**: `feat(library): add dynamic functional context evaluation primitives and runtime`
   * **Description**:
     ```markdown
     ## Summary
     First phase of the v4.0.0 dynamic functional context release. Implements standalone `#library` utilities:
     - Dynamic function evaluation & pledge runtime (`evaluation.library.ts`, `pledge.class.ts`)
     - Type assertion guards & primitive extensions (`assertion.library.ts`, `type.library.ts`)
     - Proxy & serialization helpers (`proxy.library.ts`, `serialize.library.ts`)
     ```
2. **CodeRabbit Action**:
   * CodeRabbit will automatically review the ~71 files.
   * Address any CodeRabbit suggestions or comment `@coderabbitai review` if updates are pushed.
3. **Merge PR #1**:
   * Once approved, merge PR #1 into `main` using **Squash and Merge** or **Rebase and Merge**.

---

### Phase 3: PR 2 — Tempo Core Engine (`@magmacomputing/tempo`)

1. **Open Pull Request #2 on GitHub**:
   * **Base branch**: `main` (if PR #1 is already merged) OR `feature/dfc-1-library` (if stacking PRs)
   * **Compare branch**: `feature/dfc-2-tempo`
   * **Title**: `feat(tempo): integrate dynamic functional evaluation engine and mutation aliases`
   * **Description**:
     ```markdown
     ## Summary
     Second phase of the v4.0.0 dynamic functional context release:
     - Deduplicated capture group named alternations in `PatternCompiler`
     - Added `plus()` and `minus()` method aliases in `MutateModule`
     - Integrated variadic dynamic context evaluation across `Tempo.class.ts`
     - Fixed `tempo-cli` build dependency resolution
     ```
2. **CodeRabbit Action**:
   * CodeRabbit will review the ~95 files cleanly.
   * Address any CodeRabbit suggestions.
3. **Merge PR #2**:
   * Once approved, merge PR #2 into `main`.

---

### Phase 4: PR 3 — Plugins & Ecosystem (`@magmacomputing/tempo-plugin-*`)

1. **Open Pull Request #3 on GitHub**:
   * **Base branch**: `main` (if PR #2 is merged) OR `feature/dfc-2-tempo`
   * **Compare branch**: `feature/dfc-3-plugins`
   * **Title**: `feat(plugins): ticker plugin and plugin ecosystem updates for v4`
   * **Description**:
     ```markdown
     ## Summary
     Final phase of the v4.0.0 release:
     - New `@magmacomputing/tempo-plugin-ticker` package for cron and rrule task scheduling
     - Updated `@magmacomputing/tempo-plugin-ai` for dynamic evaluation support
     - Standardized `.std` terms and plugin build scripts
     ```
2. **CodeRabbit Action**:
   * CodeRabbit will review the ~53 files cleanly.
   * Address any feedback.
3. **Merge PR #3**:
   * Merge PR #3 into `main`.

---

## 3. Phase 5: Local Workspace Synchronization & Verification

After all 3 PRs are merged on GitHub, synchronize your local workspace:

```bash
# 1. Switch back to main and pull latest merged code
git checkout main
git pull origin main

# 2. Clean temporary branches
git branch -d feature/dfc-1-library feature/dfc-2-tempo feature/dfc-3-plugins

# 3. Verify build & full test suite
npm run build:all
npm run test
```

---

## 4. Verification Checklist

- [x] Local branches created and verified (`feature/dfc-1-library`, `feature/dfc-2-tempo`, `feature/dfc-3-plugins`).
- [x] All 1,316 tests pass across full monorepo on all 3 branches.
- [ ] Push 3 branches to GitHub (`git push origin feature/dfc-*`).
- [ ] Open PR #1 (`feature/dfc-1-library` -> `main`), await CodeRabbit review, merge.
- [ ] Open PR #2 (`feature/dfc-2-tempo` -> `main`), await CodeRabbit review, merge.
- [ ] Open PR #3 (`feature/dfc-3-plugins` -> `main`), await CodeRabbit review, merge.
- [ ] Pull `main` locally and verify `npm run build:all && npm run test`.
