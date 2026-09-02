# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.2.0] - 2026-09-02

### Added
- **Celestial Utilities**: Introduced new pure astronomical, celestial, solar, lunar, and zodiac utility module (`@magmacomputing/tempo-fns/celestial`):
  - `getLunarPhase`: Calculates lunar phase name, 1-based index (1..8), illumination 0.0–1.0 fraction, age in days, waxing status, and hemisphere-aware emojis.
  - `getLunarPhaseRange`: Resolves start/end boundaries for active lunar phase cycles.
  - `getSolarEvents`: Calculates Jean Meeus (Ch 27) equinoxes and solstices.
  - `getSunriseSunset`: Resolves location-aware (lat/lon, `lat`/`long`/`lng`) daily sunrise, sunset, solar noon, daylight duration, 1-based solar index (1..5), and solar phase state (`daylight`, `night`, `civil-twilight`, `nautical-twilight`, `astronomical-twilight`).
  - `getZodiacSign`: Resolves Western Tropical Zodiac signs.
  - `getChineseZodiac`: Calculates Chinese Zodiac animal, element, and Yin/Yang state for any given year.
- **Lunar Ephemeris & DRY Coordinate Helpers**: Added `getMoonriseMoonset()` for Jean Meeus lunar ephemeris calculations and centralized internal `resolveCoordinates()` / `getStartOfLocalDayMs()` helpers across celestial functions.

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
