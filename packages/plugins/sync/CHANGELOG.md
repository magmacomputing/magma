# Changelog

All notable changes to the `@tempo-kit/plugin-sync` project will be documented in this file.

## [2.0.0] - 2026-11-27

### Breaking Changes
- Migrated package namespace from `@magmacomputing/tempo-plugin-sync` to `@tempo-kit/plugin-sync`.
- Updated `peerDependencies` to `tempo-kit@^5.0.0`.

## [2.0.0] - 2026-11-27

### Breaking Changes
- Migrated package namespace from `@magmacomputing/tempo-plugin-sync` to `@tempo-kit/plugin-sync`.
- Updated `peerDependencies` to `tempo-kit@^5.0.0`.

## [1.1.2] - 2026-10-02

### Enhanced
- **Runtime Introspection & Branding**:
  - Added `[Symbol.toStringTag]` getters to `AtomicClock` (`'Tempo.AtomicClock'`) and `AtomicReader` (`'Tempo.AtomicReader'`), providing TC39-aligned branding for `Object.prototype.toString` and debugging tools.

## [1.1.1] - 2026-09-29

### Performance & Memory
- **Dual-Layer Lifecycle Management**:
  - Implemented `Finalizer.register` and `[Symbol.dispose]` on `AtomicClock` to ensure timer interval loops are deterministically stopped on explicit disposal or automatically cleaned up on GC collection when unreferenced.

## [1.1.0] - 2026-09-18

### Added
- **Subpath Side-Effect Installation (`/install`)**:
  - Added dedicated `@tempo-kit/plugin-sync/install` entrypoint for zero-boilerplate side-effect registration on the global `Tempo` instance via `autoInstall`.
  - Configured `package.json` with `"sideEffects": ["./dist/install.js"]` to ensure the root package entrypoint remains 100% pure and tree-shakeable.

## [1.0.3] - 2026-07-20

### Fixed
- **API Alignment**: Aligned the `startClock` implementation with its documented usage by ensuring it correctly returns the `AtomicClock` instance, allowing consumers to directly read the clock buffer.

## [1.0.0] - 2026-06-29

### Added

- Initial release of the `tempo-plugin-sync` (AtomicClock) premium plugin.
- Implements `AtomicClock` (Master) and `AtomicReader` (Worker) components for `O(1)` non-blocking time synchronization.
- Utilizes `SharedArrayBuffer` and native `Atomics` for nanosecond-accurate multi-threading.
- Exposes `now()` (millisecond fallback) and `nowNano()` (BigInt nanoseconds) on the `AtomicReader`.
- Directly supports hydrating `Tempo` engine instances with zero precision-loss.
