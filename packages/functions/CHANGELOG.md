# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.3] - 2026-07-21

### Fixed
- **Dependencies**: Moved `@js-temporal/polyfill` from `peerDependencies` to `devDependencies` to prevent automatic forced downloads for end-users relying on native Temporal environment support.

## [0.1.0] - 2026-07-12

### Added
- **Initial Release**: Launch of `@magmacomputing/tempo-fns`, providing a comprehensive suite of pure functional utilities designed for the JavaScript Temporal API.
- **Business Functions**: `workingHoursUntil`, `isSameFiscalQuarter`.
- **Calendar Functions**: `getISOWeekOfYear`, `isFirstDayOfMonth`.
- **Duration Functions**: `normaliseFractionalDurations`.
- **Scheduling Functions**: `nextCron`, `prevCron`.
- **Interval Provision**: `Interval` is provided by the Tempo core and is transparently re-exported from `@magmacomputing/tempo`.
- **Timezone Functions**: `isDST`, `getOffsets`, `getHemisphere`, `normalizeUtcOffset`.
