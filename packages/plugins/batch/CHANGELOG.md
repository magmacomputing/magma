# Changelog

All notable changes to the `@magmacomputing/tempo-plugin-batch` project will be documented in this file.

## [1.0.0] - 2026-06-29

### Added
- Initial release of the `tempo-plugin-batch` community plugin.
- Implements `BatchOrchestrator` for extreme-throughput parallel processing of Tempo mutation tasks.
- Utilizes a graceful degradation architecture: attempts lock-free `SharedArrayBuffer` mapping, gracefully falling back to `postMessage` arrays on unsupported environments.
- Adds the `Tempo.batch(epochs, mutationArgs)` namespace for executing mutations across millions of timestamps simultaneously without blocking the main event loop.
