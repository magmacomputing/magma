# 🚀 Tempo Release Process (v2.1.2+)

This document outlines the automated release process for the Tempo monorepo using **release-it**.

## 📋 Prerequisites Checklist

Before running the release command, ensure the following are met:

1.  **NPM Authentication**:
    You must be logged into NPM. Verify with:
    ```bash
    npm whoami
    ```
    If not logged in, run `npm login`.

2.  **GitHub Authentication**:
    `release-it` needs to create Tags and GitHub Releases.
    - **GitHub Token**: Ensure you have a Personal Access Token (PAT) with `repo` scope.
    - **Environment Variable**: Export your token as `GITHUB_TOKEN`:
      ```bash
      export GITHUB_TOKEN="your_token_here"
      ```

3.  **Clean Git Directory**:
    Commit all your changes before running the release. `release-it` will refuse to run with a dirty working directory.

4.  **Main Branch**:
    Always perform releases from the `main` branch.

## 🛠️ How to Publish a New Version

1.  **Stage your Changes**:
    Add any notable changes to the `## [Unreleased]` section of the root **`CHANGELOG.md`**.

2.  **Run the Release Command**:
    From the monorepo root, run:
    ```bash
    npm run release
    ```

3.  **Follow the Interactive Prompts**:
    `release-it` will ask you to:
    - Select the next version (Patch, Minor, Major).
    - Review the changelog.
    - Confirm the git commit and tag.
    - Confirm the NPM publish.
    - Confirm the GitHub Release creation.

## 🔗 Automated Workflow Details

The `npm run release` command triggers the following automated steps:
- **`npm test`**: Runs the full test suite.
- **Version Bumping**: Bumps the version in the root `package.json` and synchronizes both `@magmacomputing/tempo` and `@magmacomputing/library` packages.
- **`after:bump` Hook**: Automatically builds both packages *after* the version bump to ensure the built artifacts contain the correct version.
- **Changelog Automation**: The `keep-a-changelog` plugin automatically converts the `[Unreleased]` section into a new version block with the current date.
- **Git Operations**: Commits the version bump and changelog update, tags the release (e.g., `v2.1.3`), and pushes to GitHub.
- **NPM & GitHub**: Publishes the packages to NPM and creates a formal release on GitHub.

---
*Maintained by Magma Computing. For internal support, contact the project lead.*
