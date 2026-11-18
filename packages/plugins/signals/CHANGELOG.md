# Changelog

All notable changes to the `@magmacomputing/tempo-plugin-signals` project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - Unreleased

### Added
- Initial release of `@magmacomputing/tempo-plugin-signals`.
- **Tree-Shakeable Plugin Architecture**: Pure, side-effect-free root entrypoint (`.`) with isolated auto-registration entrypoint (`./install`) and `SignalsPlugin` for `Tempo.use()`.
- **Reactive Relative Time Signals**: Adaptive, battery-friendly relative-time signal tracking that schedules updates only at meaningful unit boundaries.
- **Interval State Signals**: Event-driven interval status and progress signals (`isCurrent`, `isPast`, `isFuture`, `progress`) without continuous polling.
- **Global Configuration Reactivity**: Reactive signals for global `Tempo` configuration (`locale`, `timeZone`) synchronized via `onConfigChange`.
