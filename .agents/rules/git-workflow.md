# Git Workflow Rules

- **NEVER RUN `git commit`**: Do not execute `git commit` under any circumstances. Committing changes is strictly reserved for the user to review diffs and manage git history.
- **NEVER RUN `git push`**: Do not execute `git push` under any circumstances. Pushing branches or tags to remote repositories is strictly reserved for the user.
- **Inspection Commands Only**: You may only use non-destructive read-only inspection commands (e.g. `git status`, `git diff`, `git log`) or local staging (`git add`) if explicitly requested, but never commit or push.
