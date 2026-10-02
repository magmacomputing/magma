# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.2.0] - 2026-10-01

### Added
- **Lunar Anti-Transit & Lower Culmination Metrics** (`@magmacomputing/tempo-fns/celestial`):
  - `getLunarAntiTransit`: Calculates the exact local lower meridian transit timestamp (`antiTransitMs`) of the Moon (lower culmination / nadir).
  - Enhanced `getLunarPosition` and `LunarPositionResult` with `antiTransitMs` and `zenith` (angular distance in degrees from overhead zenith, `90° - altitude`).
- **Solar Nadir & Lower Culmination Coordinates**:
  - Enhanced `getSunriseSunset` and `SunriseSunsetResult` with `solarNadirMs` (epoch millisecond timestamp of solar midnight / lower culmination).
  - Enhanced `getSolarPosition` and `SolarPositionResult` with `nadir` angle (angular distance in degrees from nadir, `90° + altitude`).
- **Core Calendar Extensions** (`@magmacomputing/tempo-fns/calendar`):
  - `isLastDayOfMonth`: Determines whether a date is the final day of its calendar month, accounting for leap years.
  - `isLeapYear`: Fast Gregorian leap year check for year numbers, dates, ISO strings, or Tempo instances.
  - `daysInMonth`: Calculates the exact number of days (28, 29, 30, or 31) for a specified year and month.
  - `isWeekend` & `isWeekday`: Determines if a date falls on a weekend or weekday, with support for standard ISO 8601 boundaries (`[6, 7]`), regional cultural adaptation (`options.locale`), and custom `options.weekendDays`.
- **Business Day & Working Day Math** (`@magmacomputing/tempo-fns/business`):
  - `isBusinessDay`: Determines whether a date is an active working business day, accounting for custom/cultural weekend boundaries and dynamic holiday lists or predicates.
  - `nextBusinessDay` & `prevBusinessDay`: Calculates the subsequent or preceding business day from any reference date.
  - `addBusinessDays`: Advances or rewinds a date by $N$ working business days, supporting standard financial settlement schedules (e.g., T+2 settlement).
  - `businessDaysBetween`: Computes the signed integer count of working business days between two dates.
- **Spatial Navigation & Geodesy** (`@magmacomputing/tempo-fns/spatial`):
  - `calculateDestination`: Computes destination coordinates from a starting point, distance, and forward compass bearing using the Great-Circle spherical law of cosines forward geodesic equations.
  - `closestCoordinate`: Finds the nearest coordinate and Great-Circle distance from a collection of candidate points relative to a target coordinate.
- **Timezones & DST Analysis** (`@magmacomputing/tempo-fns/timezone`):
  - `isValidTimeZone`: Safe, non-throwing validator verifying whether a string is a valid IANA timezone identifier accepted by the runtime environment.
  - `getDSTTransitions`: Resolves exact epoch millisecond timestamps of Spring Forward and Fall Back transitions along with shift magnitude for any timezone and calendar year.
- **Universal Coordinate Normalization & Root Re-exports** (`@magmacomputing/tempo-fns/support`):
  - `normalizeCoords`, `extractRawCoords`, `resolveCoordinates`: Centralized universal coordinate extraction supporting `[lat, lng]` tuples, comma strings, property bags, and wrapped instances.
  - `extractEpochMs` & `toEpochMs`: Universal epoch timestamp extraction for Tempo, Temporal, Date, strings, and numbers.
  - Re-exported runtime type assertion guards (`isNumber`, `isString`, `isText`, `isBoolean`, `isFunction`, `isNullish`, `isUndefined`, `isDefined`, `isDate`, `isPrimitive`, `isObject`, `isReference`, `isTempo`, `isTemporal`) directly from the root package.
- **Astronomical Duration Constants**:
  - Exported `HALF_DAY_MS` (`43_200_000` ms) and `DAY_MS` (`86_400_000` ms) from the root package and celestial submodule.

## [1.1.0] - 2026-09-27

### Added
- **Pure GIS & Spatial Navigation Module** (`@magmacomputing/tempo-fns/spatial`):
  - `haversineDistance`: Calculates Great-Circle spherical distance between coordinates in `km`, `miles`, or `m`.
  - `calculateBearing`: Computes initial forward azimuth compass bearing (0° to 360° True North) along Great-Circle routes.
  - `calculateMidpoint`: Calculates the geographic midpoint between two coordinate points with hemisphere inference.
  - `calculateVelocity`: Calculates travel speed between timestamped instances in `km/h`, `mph`, or `m/s`.
  - `isImpossibleTravel`: Evaluates impossible travel anomalies across logins/events based on commercial aviation velocity thresholds.
  - `isWithin`: Efficient proximity filtering testing whether coordinates are within a specified radius.
  - `inBoundingBox`: Spatial inclusion query testing containment within rectangular bounding boxes (with antimeridian wrap support).
  - `solarOffset`: Calculates natural solar time offset between civil clock time and actual solar noon.
  - `resolveCulturalLocale`: Resolves country-specific BCP 47 cultural locales with regional adaptation and native options.
- **Definitive Runtime Type Assertion Suite** (`@magmacomputing/tempo-fns/support`):
  - Added comprehensive type guard assertions: `isNumber`, `isString`, `isText`, `isBoolean`, `isFunction`, `isNullish`, `isDefined`, `isDate`, `isPrimitive`, `isObject`, and `isReference`.

## [1.0.0] - 2026-09-26

### Added
- **Real-Time Solar Coordinates & Photometric Lighting**:
  - `getSolarPosition`: Computes topocentric solar altitude angle (corrected for atmospheric refraction), compass azimuth bearing (0°..360° True North), angular distance from overhead zenith, photometric lighting indicators (`isGoldenHour`, `isBlueHour`), and vertical object shadow length multiplier (`shadowRatio`).
- **Polar Regions Handling (Midnight Sun & Polar Night)**:
  - `getSunriseSunset`: Enhanced with high-latitude boundary detection identifying 24-hour continuous daylight (`isMidnightSun`) and 24-hour continuous night (`isPolarNight`), returning `null` for non-occurring sunrise/sunset while correctly evaluating polar twilight windows.
- **Local Coastal Tide Predictions & Port Calibration**:
  - `getTidalState`: Expanded with coordinate-aware coastal tide predictions resolving `nextHighTideMs`, `nextLowTideMs`, hydrodynamic port calibration offsets (`lunitidalIntervalMin`), and tidal regime classification (`regime`: `'semi-diurnal'`, `'diurnal'`, or `'mixed'`).
- **Topocentric Lunar Ephemeris & Horizon Position**:
  - `getLunarPosition`: Calculates real-time topocentric altitude (corrected for horizontal parallax and atmospheric refraction), compass azimuth bearing (0°..360° North through East), visibility (`isAboveHorizon`), and apparent Right Ascension / Declination.
- **Local Meridian Transit**:
  - `getLunarTransit`: Computes the exact timestamp (`transitMs`) of lunar upper culmination (highest altitude transit in the observer's local 24-hour day).
- **Lunar Distance, Parallax & Supermoon/Micromoon Classification**:
  - `getLunarDistance`: Computes observer-to-Moon distance in kilometers (`distanceKm`), apparent angular diameter in arcminutes (`angularDiameterArcmin`), horizontal parallax, and evaluates `isSupermoon` / `isMicromoon` during syzygy (New/Full Moon).
- **Crescent Tilt & Bright Limb Angle**:
  - `getCrescentTilt`: Calculates bright limb position angle relative to celestial north (`brightLimbAngleDeg`), parallactic angle (`parallacticAngleDeg`), and crescent tilt angle relative to local zenith (`crescentTiltDeg`) to support accurate rendering of tropical "Wet Moon" orientations.
- **Local Solar & Lunar Eclipse Obscuration**:
  - `getEclipse`: Calculates local solar and lunar eclipse classification (`'total-solar'`, `'annular-solar'`, `'partial-solar'`, `'total-lunar'`, `'partial-lunar'`, `'penumbral-lunar'`), disk obscuration fraction (0.0 to 1.0), horizon visibility, and angular separation using 3D equatorial topocentric parallax.
- **Modular Celestial Sub-Modules**:
  - Reorganized `celestial/` into maintainable sub-modules (`lunar.ts`, `solar.ts`, `tidal.ts`, `eclipse.ts`, `zodiac.ts`, `support.ts`) unified by a clean `index.ts` barrel.
- **Production Release**:
  - Promoted `@magmacomputing/tempo-fns` to `1.0.0` general availability with complete tree-shakeable API surface, robust type definitions, and zero runtime dependencies.


## [0.2.0] - 2026-09-09

### Added
- **Elevation Horizon Dip**: Integrated observer elevation (meters above sea level) into `getSunriseSunset()` apparent solar timing calculations:
  - Added optional `elevation` parameter to `SolarOptions` and included resolved `elevation` in `SunriseSunsetResult`.
  - Factors atmospheric horizon dip (Δθ ≈ 0.0347° × √(max(0, elevation))) into the solar zenith angle (90.833° + Δθ).
  - Correctly shifts sunrise earlier, sunset later, and expands daylight duration for elevated observers while keeping true solar noon transit invariant.
- **Celestial Utilities**: Introduced new pure astronomical, celestial, solar, lunar, and zodiac utility module (`@magmacomputing/tempo-fns/celestial`):
  - `getLunarPhase`: Calculates lunar phase name, 1-based index (1..8), illumination 0.0–1.0 fraction, age in days, waxing status, and hemisphere-aware emojis.
  - `getLunarPhaseRange`: Resolves start/end boundaries for active lunar phase cycles.
  - `getTidalState`: Pure astronomical solar-lunar ecliptic alignment (Δλ) and orbital perigee calculation function resolving `spring`, `neap`, and `normal` tide states along with `isKingTide` indicators and semi-diurnal lunar tide cycle offsets.
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
