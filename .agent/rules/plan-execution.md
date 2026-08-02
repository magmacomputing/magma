# Plan & Development Execution Rules

## 1. Interactive Pair-Programming (Default Mode)
During standard interactive conversations, code discussions, and step-by-step refactoring:
- **ALWAYS use native file editing tools (`replace_file_content` and `write_to_file`)** for creating and modifying files.
- This provides visual line-by-line diff previews and interactive approval checkboxes directly in the user's IDE UI.

## 2. Autonomous Background Execution (AFK / `/ok` Mode)
When the user explicitly approves an implementation plan for autonomous background execution (e.g. by typing `/ok` or clicking "Ok to proceed"):
- Set `SafeToAutoRun: true` on execution tools.
- Prefer using terminal shell operations (`run_command` with `SafeToAutoRun: true`) for batch file modifications and test execution to ensure unblocked execution while the user is away.
