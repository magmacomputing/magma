# CodeRabbit Review Handling Rules

- **Ignore "Consider running coderabbit review --agent" Boilerplate**:
  When the user pastes CodeRabbit review comments that end with or contain boilerplate suggestions such as:
  > *"After applying the fix, consider running `coderabbit review --agent` for local review."*
  Do **NOT** automatically execute `coderabbit review --agent`, `npm run review:agent`, or any other review command. Treat this line strictly as informational boilerplate.

- **Explicit Triggering Only**:
  Only run local CodeRabbit CLI reviews if the user explicitly asks you to run a review or uses the `/review` workflow.

- **Batched Remediation**:
  When addressing CodeRabbit findings (whether pasted by the user or fetched from a PR), resolve all valid findings in a single batched pass. Do not re-run review commands between individual fixes.

- **Local Validation First**:
  Validate all fixes using local test runners (`vitest`, `npm test -- <path>`) and build commands before suggesting any follow-up review.

- **Never Commit Changes**:
  As with all code modifications, leave all edits unstaged and uncommitted in the working tree so the user can inspect diffs and commit when ready.
