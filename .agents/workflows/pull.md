---
description: Fetch unresolved CodeRabbit review findings from the open GitHub PR and evaluate/apply fixes locally
---

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

6. **Post Explanatory Comments on PR Threads**:
   - For each evaluated finding, post a concise reply comment to its GitHub PR review thread using `gh api graphql`:
     ```bash
     gh api graphql -f query='
     mutation($threadId: ID!, $body: String!) {
       addPullRequestReviewThreadReply(input: { pullRequestReviewThreadId: $threadId, body: $body }) {
         comment { id }
       }
     }' -f threadId="<THREAD_ID>" -f body="<Accepted. ... / Skipped. ...>"
     ```
   - If **Remediated**: Format reply starting with `Remediated locally (pending push): <Brief summary of the local fix applied in the working tree>`.
     *(Note: Omitting the trigger word `Accepted.` keeps the thread open on GitHub until the commit is pushed. Upon git push, CodeRabbit automatically inspects the commit diff, verifies the fix, and auto-resolves the thread).*
   - If **Skipped**: Format reply starting with `Skipped. <Clear technical rationale why no change was needed>`.
   - **Do NOT call `resolveReviewThread` directly**: The agent never manually executes thread resolution mutations; thread resolution is handled natively by CodeRabbit's bot after verifying the pushed commit, or left for the user's manual review.

7. **Summary & User Handoff**:
   - Provide a concise summary table or list detailing:
     - Each finding addressed (Accepted vs Skipped with rationale).
     - Confirmation that thread reply comments were posted on GitHub.
     - Modified files left in the working tree.
     - Test run results.
   - Prompt the user to inspect `git diff`, push commits, and verify any remaining unresolved threads on GitHub.
