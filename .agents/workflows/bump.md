---
description: Bump package version, update CHANGELOG, release notes, and documentation
---

When invoked with a package argument (e.g. `/bump tempo`, `/bump celestial`, `/bump library`):

1. **Version Bump**:
   - Locate the target package's `package.json`.
   - Increment the semantic version (patch by default, unless minor or major is specified).
   - Verify workspace inter-package dependencies if applicable.

2. **CHANGELOG Update**:
   - Add a new release section to the target package's `CHANGELOG.md` with the bumped version and current date.
   - Document all additions, modifications, fixes, deprecations, and type improvements made in the release.

3. **Release Notes (for Tempo)**:
   - If bumping `@magmacomputing/tempo`, update the active release notes document (e.g. `packages/tempo/doc/8-project-and-support/releases/v4.x.md`) with the new version section and release summary.  please keep the mono-repo and the tempo and library workspaces aligned

4. **User Documentation**:
   - Introduce or update any relevant documentation files (in `doc/` or `user-docs`) corresponding to new features, methods, or term hooks.
   - **Strict Rule**: User documentation must **never** mention, reference, or promote "Tempo Premium Plugins" or commercial offerings.

5. **Verification**:
   - Execute package build and test suites (`npm run build && npm test`) to verify all changes pass without regressions.