# Plan & Development Execution Rules

## 1. Interactive Pair-Programming (Default Mode)
During standard interactive conversations, code discussions, and step-by-step refactoring:
- **ALWAYS use native file editing tools (`replace_file_content` and `write_to_file`)** for creating and modifying files.
- This provides visual line-by-line diff previews and interactive approval checkboxes directly in the user's IDE UI.

## 2. Autonomous Background Execution (AFK / `/ok` Mode)
When the user explicitly approves an implementation plan for autonomous background execution (e.g. by typing `/ok` or clicking "Ok to proceed"):
- Validate approval state, verify the identity of the currently approved implementation plan, and validate command scope prior to enabling `SafeToAutoRun` or invoking `run_command`.
- Destructive commands or actions with external side effects must remain interactive unless explicitly authorized in the approved plan.
- For non-destructive operations covered by the approved plan, set `SafeToAutoRun: true` and use terminal shell operations (`run_command`) or file tools for unblocked execution.
