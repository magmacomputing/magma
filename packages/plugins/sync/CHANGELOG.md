# Changelog

All notable changes to the `@magmacomputing/tempo-plugin-sync` project will be documented in this file.

## [1.0.0] - 2026-06-29

### Added

- Initial release of the `tempo-plugin-sync` (AtomicClock) premium plugin.
- Implements `AtomicClock` (Master) and `AtomicReader` (Worker) components for `O(1)` non-blocking time synchronization.
- Utilizes `SharedArrayBuffer` and native `Atomics` for nanosecond-accurate multi-threading.
- Exposes `now()` (millisecond fallback) and `nowNano()` (BigInt nanoseconds) on the `AtomicReader`.
- Directly supports hydrating `Tempo` engine instances with zero precision-loss.
