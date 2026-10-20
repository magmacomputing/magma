---
description: Run CodeRabbit review using a batched remediation strategy and verify a clean, PR-ready state
---

## Purpose
Prepares a clean, PR-ready branch by running CodeRabbit agent-mode reviews efficiently using a **batched remediation strategy** to conserve review limits (3 reviews / hour sliding window on standard tier) and leaving code changes in the working tree for user review.

---

## Workflow Steps

1. **Execute Review**:
   Run the CodeRabbit agent review command:
   ```bash
   npm run review:agent
   ```
   *(Or `npm run review:uncommitted` to target only pending working-tree edits against HEAD).*

2. **Parse & Collect All Findings**:
   Examine the JSON stream output:
   - Collect and catalogue all reported findings: `{"type": "finding", "severity": "...", "fileName": "...", ...}`.
   - Check the final summary event: `{"type": "complete", "status": "review_completed", "findings": N}`.
   - If a rate limit error is encountered (`"errorType": "rate_limit"`), pause further CLI invocations, complete local test verifications, and report findings status along with the cooldown window.

3. **Clean Outcome Check**:
   - If `findings` is `0`: Proceed directly to Step 6 (Final Verification).
   - If `findings` > `0`: Continue to Step 4.

4. **Batch All Remediations (Single Pass)**:
   Do **not** re-run reviews after each isolated fix. Instead, resolve the entire batch together:
   - For each finding, evaluate against repository architecture, type contracts, and tests.
   - Discard invalid/conflicting recommendations with clear technical rationale.
   - Implement minimal, cohesive code fixes across all target files in a single pass.
   - **Do not commit changes autonomously**: Leave all modifications unstaged/uncommitted in the working tree so the user can inspect diffs.

5. **Local Pre-Verification & Re-Review**:
   - Run localized vitest suites on all modified packages to verify fixes and prevent regressions:
     ```bash
     npm test -- packages/path/to/modified
     ```
   - Only after local tests pass completely, execute a single re-review to confirm clean findings:
     ```bash
     npm run review:agent
     ```

6. **Final Verification**:
   - Run the full monorepo build and test suites:
     ```bash
     npm run build:all && npm test
     ```
   - Check `git status` to ensure only intended, clean changes exist.
   - Report a clear, structured summary of resolved findings and leave commits for the user.
