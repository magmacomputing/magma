# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.3.3] - 2026-08-20

### Fixed
- **Peer Dependencies**: Expanded peerDependency range to support Tempo v4.0.0.

## [1.3.1] - 2026-07-15

### Fixed
- **Sub-Second Precision Math**: The fractional rounding algorithm now accurately factors in all lower-level active components (e.g., nanoseconds now properly drift into milliseconds) for perfect precision.
- **Safety Enforcer**: Added strict checks against `NaN` and `Infinity` inputs via `Number.isFinite()` to prevent infinite loops and math corruption.

## [1.3.0] - 2026-07-08

### Added
- **Directional Snapping**: Added an optional `direction` parameter (`'up'` or `'down'`) to forcefully snap times using `Math.ceil` or `Math.floor` instead of standard round-to-nearest behavior.

### Fixed
- **Plugin API Import**: Updated `definePlugin` import to correctly point to the unified `@magmacomputing/tempo/plugin-api` barrel export.

## [1.2.0] - 2026-07-08

### Added
- **Sub-Second Snapping**: Added support for snapping to sub-second precision (`ms`, `us`, `ns`) to support telemetry aggregation, multimedia synchronization, and database timestamp normalization.

### Fixed

- **Version Tracking**: Plugins will now register their 'version' with Tempo.versions

## [1.1.0] - 2026-07-07

### Changed

- **Idiomatic Argument Syntax**: Refactored the `snap` method signature from positional arguments (`t.snap('mi', 15)`) to a standard object-based API (`t.snap({ mi: 15 })`) to natively align with Tempo's core mutation syntax.
- **Shorthand Aliases**: Expanded the parameter typing to officially support long-form time aliases (e.g., `hours`, `minutes`, `seconds`) in addition to the standard shorthand keys (`hh`, `mi`, `ss`).

### Fixed

- **Runtime Validation**: Implemented strict runtime validation (powered by an internal `OneKey` utility type) to guarantee that only a single time component can be snapped at once. Passing date components (like `days` or `years`) will now safely throw explicit validation errors instead of silently failing.
