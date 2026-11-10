---
name: pull
description: >-
  Use this skill when the user asks to fetch unresolved CodeRabbit review
  findings from the open GitHub PR (e.g. /pull) and evaluate or apply fixes locally.
---

# Fetch & Remediate PR CodeRabbit Review Findings

## Purpose
Fetches unresolved review comments and findings posted by CodeRabbit on the branch's active GitHub PR using `npm run review:pr`, evaluates their validity, applies necessary code changes locally in a batched pass, and verifies them with tests while keeping changes uncommitted in the working tree for user review.

---

## Workflow Steps

1. **Fetch PR Review Findings**:
   Execute the PR review fetch command:
   ```bash
   npm run review:pr
   ```
   *(Or `npm run review:pr -- --json` to inspect structured JSON output).*

2. **Verify Finding Count**:
   - If findings count is `0`: Report that the PR has no unresolved CodeRabbit review threads, and finish.
   - If findings count > `0`: Proceed to Step 3.

3. **Evaluate Findings & Filter Boilerplate**:
   - Strictly ignore any boilerplate footer text (such as *"After applying the fix, consider running `coderabbit review --agent` for local review."* per `.agents/rules/coderabbit.md`).
   - Do **NOT** automatically trigger `coderabbit review --agent` or `npm run review:agent`.
   - Inspect each finding's target file, line number, and suggested diff against repository architecture, type contracts, and existing test suites.
   - Separate valid suggestions from invalid/hallucinatory recommendations (documenting the technical reason for any skipped finding).

4. **Batch Apply Remediations Locally**:
   - Implement the valid fixes across all target files in a single pass.
   - **Never run `git commit` or `git push`**: Leave all file modifications unstaged and uncommitted in the working tree for the user to review.

5. **Local Test & Build Verification**:
   - Run localized vitest suites against the modified files/packages:
     ```bash
     npm test -- packages/path/to/test-file.test.ts
     ```
   - Verify full package build/type-check if applicable:
     ```bash
     npm run build:all
     ```

6. **Automated Thread Resolution & Reply Strategy**:
   For each evaluated finding, determine its automated resolution path:

   - **Category A: Outdated Threads (`isOutdated: true`)**:
     CodeRabbit does **not** auto-resolve outdated threads when diff hunks have shifted or code lines were refactored in subsequent commits.
     - Inspect git history (`git log -S` / `git diff origin/main...HEAD`) and perform a concrete verification check: confirm that the specifically flagged code or pattern is no longer present at the cited location in the current working tree/branch.
     - If concretely verified as addressed, post a brief resolution note and execute automated thread resolution:
       ```bash
       npm run review:pr -- --reply "<THREAD_ID>" "Addressed in prior commit on branch."
       npm run review:pr -- --resolve "<THREAD_ID>"
       ```
     - If still ambiguous, unconfirmed, or the cited issue might persist elsewhere, do **not** auto-resolve; route it to the **Manual Review Fallback** (Step 7).

   - **Category B: Active Threads Remediated Locally (`isOutdated: false`, Valid Finding)**:
     - Post an explanatory reply comment to the thread:
       ```bash
       npm run review:pr -- --reply "<THREAD_ID>" "Remediated locally (pending push): <Brief summary of local fix applied in working tree>"
       ```
     - *(Note: Do NOT manually resolve this thread yet. CodeRabbit listens to GitHub comment webhooks and commit push events. When the user pushes the commit, CodeRabbit automatically inspects the AST, posts `✅ Confirmed as addressed by @...`, and resolves the thread under its own bot logic).*

   - **Category C: Deterministic Rejections / False Positives**:
     - When a finding contradicts repository invariants, strict typing rules, or documented guidelines (e.g. peer dependency locks, user documentation rules):
       ```bash
       npm run review:pr -- --reply "<THREAD_ID>" "Skipped. <Technical rationale why this change is not applicable or violates project invariants>"
       npm run review:pr -- --resolve "<THREAD_ID>"
       ```
     - Auto-resolve the thread if the rejection is based on an explicit project rule or clear false positive.

   - **Category D: Fallback — Subjective / Design Trade-Offs**:
     - If a suggestion involves subjective architectural choices or trade-offs requiring user judgment, post the technical context:
       ```bash
       npm run review:pr -- --reply "<THREAD_ID>" "Under review. <Technical context on design trade-off>"
       ```
     - Leave the thread **open** and flag it explicitly for user attention in Step 7.

7. **Summary & User Handoff**:
   - Provide a structured summary detailing:
     - **Automated Actions Taken**:
       - Remediated active threads (pending user commit & push for bot auto-resolution).
       - Auto-resolved outdated threads verified against git history.
       - Deterministic rejections closed with rationale.
     - **Modified Files**: List all uncommitted files in the working tree.
     - **Verification**: Test and build status.
     - **Manual Review Fallback (User Action Required)**:
       If any threads could not be safely auto-resolved (e.g. subjective design decisions, ambiguous outdated hunks, or unconfirmed suggestions), present them in a dedicated table:
       | Thread ID | File & Line | Status / Reason | User Action |
       | :--- | :--- | :--- | :--- |
       | `<ID>` | `<file:line>` | `Ambiguous outdated hunk` | Inspect and click 'Resolve conversation' if satisfied |
       | `<ID>` | `<file:line>` | `Subjective design choice` | Review technical trade-off and decide |
   - Prompt the user to inspect `git diff`, stage and commit changes, push to origin, and verify GitHub PR status.

