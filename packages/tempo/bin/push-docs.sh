#!/bin/bash
# Push documentation changes from the current branch directly to main.
set -e

# Define the paths that constitute "documentation" in this repository/package.
# Since this script runs from within packages/tempo, paths are relative to this directory.
DOC_PATHS="doc/ img/ index.md typedoc.json .vitepress/"

CURRENT_BRANCH=$(git branch --show-current)

if [ "$CURRENT_BRANCH" = "main" ]; then
  echo "Already on main branch. Please use standard git commit and push."
  exit 1
fi

# Ensure workspace is clean to avoid losing uncommitted work
if ! git diff-index --quiet HEAD --; then
  echo "Working directory is not clean. Please commit or stash your changes first."
  exit 1
fi

echo "Switching to main branch..."
git checkout main

echo "Pulling latest main..."
git pull origin main

echo "Applying doc changes from $CURRENT_BRANCH to main..."
# Checkout only the doc files from the branch
git checkout $CURRENT_BRANCH -- $DOC_PATHS

# Check if there's actually anything to commit
if git diff-index --quiet HEAD --; then
  echo "No doc changes found between main and $CURRENT_BRANCH."
  echo "Switching back to $CURRENT_BRANCH..."
  git checkout $CURRENT_BRANCH
  exit 0
fi

echo "Committing doc changes..."
git commit -m "docs: quick publish from $CURRENT_BRANCH"

echo "Pushing directly to main..."
ALLOW_MAIN_PUSH=true git push origin main

echo "Switching back to $CURRENT_BRANCH..."
git checkout $CURRENT_BRANCH

echo "Done! Doc changes have been pushed to main."
