---
description: Run CodeRabbit review loop and address findings until a clean outcome is reported
---

## Purpose
Prepares a clean, PR-ready branch by running CodeRabbit agent-mode reviews in a loop and fixing all reported findings until zero issues remain.

---

## Workflow Steps

1. **Execute Review**:
   Run the CodeRabbit agent review command:
   ```bash
   npm run review:agent
   ```

2. **Parse Findings**:
   Examine the JSON stream output:
   - Review each `{"type": "finding", "severity": "...", "fileName": "...", ...}` entry.
   - Check the final summary event: `{"type": "complete", "status": "review_completed", "findings": N}`.

3. **Clean Outcome Check**:
   - If `findings` is `0`: Proceed directly to Step 6 (Final Verification).
   - If `findings` > `0`: Continue to Step 4.

4. **Address Findings**:
   For each reported finding:
   - Locate the target file and line numbers.
   - Analyze the review recommendation against repository architecture, types, and conventions.
   - Make the necessary minimal code fixes.

5. **Iterate**:
   - Run local tests on modified packages to verify no regressions (`npm test`).
   - Re-run `npm run review:agent`.
   - Repeat Steps 2–5 until CodeRabbit reports `findings: 0`.

6. **Final Verification**:
   - Run the monorepo build and test suites:
     ```bash
     npm run build:all && npm test
     ```
   - Ensure `git status` reflects only intended, clean changes.
   - Report a summary of resolved findings and confirm the branch is clean and ready for a GitHub Pull Request.
