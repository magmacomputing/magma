# Changelog

All notable changes to the `@magmacomputing/tempo-plugin-batch` project will be documented in this file.

## [1.1.0] - 2026-09-08

### Added & Enhanced
- **Worker Thread Runtime Flag Inheritance (`execArgv`)**:
  - Configured `BatchOrchestrator` to forward `process.execArgv` to spawned worker threads.
  - Workers automatically inherit native runtime flags (such as `--harmony-temporal`) or custom loader configurations (`--import`) without bundling or depending on a polyfill, strictly preserving Tempo's zero-dependency, native-first Temporal philosophy.
- **Shorthand Mutation Parsing**:
  - Added support for relative duration shorthand strings (e.g. `+1d`, `+1w`, `+1h`, `+1m`) alongside `{ Term: Value }` mutation objects.

## [1.0.2] - 2026-08-20

### Fixed
- **Peer Dependencies**: Expanded peerDependency range to support Tempo v4.0.0.

## [1.0.0] - 2026-06-29

### Added
- Initial release of the `tempo-plugin-batch` community plugin.
- Implements `BatchOrchestrator` for extreme-throughput parallel processing of Tempo mutation tasks.
- Utilizes a graceful degradation architecture: attempts lock-free `SharedArrayBuffer` mapping, gracefully falling back to `postMessage` arrays on unsupported environments.
- Adds the `Tempo.batch(epochs, mutationArgs)` namespace for executing mutations across millions of timestamps simultaneously without blocking the main event loop.
