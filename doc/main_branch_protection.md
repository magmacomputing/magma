# Preventing Writes to the Main Branch Locally

To prevent accidental writes (commits and pushes) to the `main` branch on your local workstation, you can use **Git Hooks**.

## Summary of Changes
I have already set up local hooks for the `magma` repository:
1. **`pre-commit`**: Blocks direct commits to the `main` branch.
2. **`pre-push`**: Blocks pushing changes to the remote `main` branch.

### How to Override
If you genuinely need to write to `main` (e.g., for an urgent fix), you have two options:
- **Environment Variable**: Prepend the command with the override flag:
  - `ALLOW_MAIN_COMMIT=true git commit -m "Urgent fix"`
  - `ALLOW_MAIN_PUSH=true git push`
- **Skip Hooks**: Use the standard Git flag:
  - `git commit --no-verify`
  - `git push --no-verify`

---

## Applying This Globally (Recommended)
If you want this protection to apply to **every repository** on your workstation, you can configure a global hooks directory.

### 1. Create a Global Hooks Directory
Choose a location (e.g., `~/.git-hooks`) and move the hook scripts there:

```bash
mkdir -p ~/.git-hooks
# Copy the hooks from your repository (replace /path/to/repo with your repo root or use the command below)
# Example using git to find the repo root:
cp $(git rev-parse --show-toplevel)/.git/hooks/pre-commit ~/.git-hooks/
cp $(git rev-parse --show-toplevel)/.git/hooks/pre-push ~/.git-hooks/
chmod +x ~/.git-hooks/*
```


### 2. Configure Git Globally (with Important Warning)
Run this command to tell Git to use your new global hooks directory:

```bash
git config --global core.hooksPath ~/.git-hooks
```

**⚠️ Warning:** Setting `core.hooksPath` with the `--global` flag disables all per-repository `.git/hooks/*` scripts. This will break tools that rely on per-project hooks, such as Husky, lefthook, lint-staged, and others. Any hooks defined in individual repositories will be ignored as long as the global `core.hooksPath` is set.

#### Recommended Alternatives

- **Chain per-repo hooks from your global hook scripts:**
  - Manually update your global hook scripts (in `~/.git-hooks/`) to call any existing hooks in each repository’s `.git/hooks/` directory, so you don’t lose project-specific logic.
- **Scope the setting to individual repositories:**
  - Instead of using `--global`, set the hooks path only for the current repository:
    ```bash
    git config core.hooksPath ~/.git-hooks
    ```
  - This way, only the current repo is affected, and other repos keep their own `.git/hooks/*` scripts.

For more details, see the [Git documentation on `core.hooksPath`](https://git-scm.com/docs/git-config#Documentation/git-config.txt-corehookspath).

---

## Hook Implementation Details

### pre-commit
This script checks the current branch before every commit.

```bash
#!/bin/bash
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
if [ "$CURRENT_BRANCH" = "main" ]; then
  if [ "$ALLOW_MAIN_COMMIT" != "true" ]; then
    echo "❌ ERROR: Direct commit to 'main' branch is prohibited."
    exit 1
  fi
fi
```

### pre-push
This script checks the remote branch being pushed to.

```bash
#!/bin/bash
while read local_ref local_sha remote_ref remote_sha
do
    if [ "$remote_ref" = "refs/heads/main" ]; then
        if [ "$ALLOW_MAIN_PUSH" != "true" ]; then
            echo "❌ ERROR: Pushing to 'main' branch is prohibited."
            exit 1
        fi
    fi
done
```

---

## 🆘 I'm on 'main' and have changes, what do I do?

If you've already made changes on `main` and the hook blocks your commit, **don't panic and don't drop your stash!** You can easily move your work to a new branch.

### The "Magic" Command: Just Create a New Branch
Git allows you to create and switch to a new branch while keeping your uncommitted changes.

```bash
# 1. Create and switch to a new branch
git checkout -b feature/my-cool-feature
# OR (modern syntax)
git switch -c feature/my-cool-feature

# 2. Now you can commit normally
git add .
git commit -m "My feature changes"
```

### If you want to be extra safe (The Stash Method)
If you have a lot of complex changes and want to ensure `main` stays clean:

```bash
# 1. Save your work temporarily
git stash

# 2. Create and switch to the new branch
git checkout -b feature/my-cool-feature

# 3. Bring your changes back
git stash pop

# 4. Commit
git commit -am "My feature changes"
```

### "I accidentally committed before I added the hook!"
If you have local commits on `main` that you haven't pushed yet, you can move them to a new branch:

```bash
# 1. Create a new branch at your current (accidental) commit
git branch feature/my-feature

# 2. Reset your local 'main' back to where it should be (the remote version)
git reset --hard origin/main

# 3. Switch to your new branch to continue working
git checkout feature/my-feature
```

