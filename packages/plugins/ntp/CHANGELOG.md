# Changelog

All notable changes to the `@magmacomputing/tempo-plugin-ntp` project will be documented in this file.

## [1.1.0] - 2026-10-29

### Added
- **TC39 Signal Reactivity (`Tempo.ntp.signal`, `Tempo.ntp.toSignal()`)**:
  - Added reactive signals (`Tempo.ntp.signal` and `Tempo.ntp.toSignal()`) tracking NTP-synchronized timestamps.
  - Enhanced NTP clock signals to rebase immediately upon remote calibration updates and drift adjustments.

### Fixed
- **Proxy Method Delegation**:
  - Added missing proxy method forwarding across the `Tempo.ntp` static namespace.

## [1.0.0] - 2026-10-02

### Added
- **Initial Bootstrap Release**:
  - Implemented `ClockDriftEngine` utilizing Cristian's Algorithm for client-server time synchronization.
  - High-precision `Server-Timing: clock=...` header parsing with fallback to standard HTTP `Date` headers.
  - Exponential Moving Average (EMA) smoothing and high-latency RTT sample rejection.
  - Attached immutable `Tempo.ntp` static namespace with `.now()`, `.sync()`, `.drift`, `.offset`, `.isCalibrated`, and `.reset()`.
  - Added `Tempo.prototype.toNtpTime()` instance method.
  - Provided side-effect zero-boilerplate import via `@magmacomputing/tempo-plugin-ntp/install`.
  - Optional passive calibration through `globalThis.fetch` response interception.
  - Added `[Symbol.toStringTag]` getter returning `'Tempo.ClockDriftEngine'` on `ClockDriftEngine`.
