# @magmacomputing/tempo-plugin-finance

## [1.1.0] - 2026-09-18

### Added
- **Subpath Side-Effect Installation (`/install`)**:
  - Added dedicated `@magmacomputing/tempo-plugin-finance/install` entrypoint for zero-boilerplate side-effect registration on the global `Tempo` instance via `autoInstall`.
  - Configured `package.json` with `"sideEffects": ["./dist/install.js"]` to ensure the root package entrypoint remains 100% pure and tree-shakeable.

## [1.0.4] - 2026-08-20

### Fixed
- **Peer Dependencies**: Expanded peerDependency range to support Tempo v4.0.0.

## 1.0.0

### Major Changes

- Initial release of the finance plugin for Temporal and Tempo.
