# Plan & Development Execution Rules

## 1. Interactive Pair-Programming (Default Mode)
During standard interactive conversations, code discussions, and step-by-step refactoring:
- **ALWAYS use native file editing tools (`edit_file`, `write_file`, `replace_file_content`, `write_to_file`)** for creating and modifying files.
- This provides visual line-by-line diff previews and interactive approval checkboxes directly in the user's IDE UI.

## 2. Autonomous Background Execution (AFK / `/ok` Mode)
When the user explicitly approves an implementation plan for autonomous background execution (e.g. by typing `/ok` or clicking "Proceed"):
- Validate approval state, verify the identity of the currently approved implementation plan, and validate command scope prior to invoking `run_command`.
- Destructive commands or actions with external side effects must remain interactive unless explicitly authorized in the approved plan.
- For non-destructive operations covered by the approved plan, use standard sandboxed terminal operations (`run_command`) or native file tools for unblocked execution.

## 3. Implementation Plan Requirements
For all Implementation Plans:
- **Estimated Effort**: Must include an estimated effort assessment (e.g. hours / engineering days with complexity breakdown).
- **SemVer Classification**: Must explicitly classify whether the release is a **Patch**, **Minor**, or **Major** bump under Semantic Versioning, with rationale.

## 4. Git & Version Control Rules
- **NEVER run `git commit` without explicit instruction**: Never execute `git commit` autonomously, even when completing setup, running version bumps, or finishing tasks. The user uses `git commit` manually in order to identify changes and review work.

## 5. Monorepo Lockfile Alignment
- **Automatic Lockfile Synchronization**: Whenever any `package.json` in the monorepo is modified (e.g. version bump, dependency added, modified, or removed across `packages/*` or `packages/plugins/*`), ALWAYS run `npm run lock:sync` (`npm install --package-lock-only`) from the repo root to ensure `package-lock.json` is perfectly aligned before final validation, code review, or commit.

