---
description: Bump package version, update CHANGELOG, release notes, and documentation
---

When invoked with a package argument (e.g. `/bump tempo`, `/bump celestial`, `/bump library`):

1. **Version Bump**:
   - Locate the target package's `package.json`.
   - Increment the semantic version (patch by default, unless minor or major is specified).
   - Verify workspace inter-package dependencies if applicable.
   - **Plugin Catalog Synchronization**:
     - When bumping any plugin in `packages/plugins/*` (e.g. `dialects`, `ai`, `celestial`, `snap`, etc.), synchronize the bumped version and description in:
       - `packages/plugins/.setup/catalog.json`
       - `packages/tempo/.vitepress/theme/data/catalog.json`
       - `packages/tempo/public/repl/plugins.manifest.js` (if registered for online REPL loading)

2. **CHANGELOG Update**:
   - Add a new release section to the target package's `CHANGELOG.md` with the bumped version and current date.
   - Document all additions, modifications, fixes, deprecations, and type improvements made in the release.

3. **Release Notes (for Tempo - `/bump tempo`)**:
   - If bumping `@magmacomputing/tempo`, update the active release notes document (e.g. `packages/tempo/doc/8-project-and-support/releases/v4.x.md` or `v5.x.md`).
   - **Placement**: Always prepend the new release block directly at the top of the release document (immediately below the `# 📜 Version X.x History` title), so latest releases appear first for GitHub Pages readers. Never use draft or "in-flight" markers.
   - **Tone**: Adopt a relaxed, approachable developer tone (in contrast to the strict, formal, low-level technical format of `CHANGELOG.md`). Focus on developer experience, why changes matter, and migration ease.
   - **CodeRabbit Summary Integration**:
     - When a GitHub PR is active, query the CodeRabbit release summary via `gh`:
       ```bash
       gh pr view --json body --jq '.body' | awk '/## Summary by CodeRabbit/{flag=1} /<!-- end of auto-generated comment/{flag=0} flag'
       ```
     - Adapt and incorporate these high-level points into the release highlights.
     - **Monorepo Scoping**: Filter out changes that belong to other workspace packages (e.g. `@magmacomputing/tempo-plugin-ai`, `@magmacomputing/tempo-fns`, or `#library`) so Tempo's release notes remain strictly focused on the core `#tempo` engine and APIs.
   - **Alignment**: Keep the monorepo root, `tempo`, and `library` workspaces aligned in versioning and dependencies.

4. **User Documentation**:
   - Introduce or update any relevant documentation files (in `doc/` or `user-docs`) corresponding to new features, methods, or term hooks.
   - **Strict Rule**: User documentation must **never** mention, reference, or promote "Tempo Premium Plugins" or commercial offerings.

5. **Verification**:
   - Execute package build and test suites (`npm run build:all && npm test`) to verify all changes pass without regressions.