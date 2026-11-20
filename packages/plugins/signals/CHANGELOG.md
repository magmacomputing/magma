# Changelog

All notable changes to the `@magmacomputing/tempo-plugin-signals` project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - Unreleased

### Added
- Initial release of `@magmacomputing/tempo-plugin-signals`.
- **Tree-Shakeable Plugin Architecture**: Pure, side-effect-free root entrypoint (`.`) with isolated auto-registration entrypoint (`./install`) and `SignalsPlugin` for `Tempo.use()`.
- **Reactive Relative Time Signals**: Adaptive, battery-friendly relative-time signal tracking that schedules updates only at meaningful unit boundaries.
- **Interval State Signals**: Boundary-scheduled interval status transitions (`isCurrent`, `isPast`, `isFuture`) with periodic active `progress` updates every 1,000 ms by default (configurable via `progressInterval`, or `false` for boundary-only updates).
- **Global Configuration Reactivity**: Reactive signals for global `Tempo` configuration (`locale`, `timeZone`) synchronized via `onConfigChange`.
