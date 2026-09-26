# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.0] - 2026-09-25

### Added
- **Real-Time Horizontal Solar Coordinates & Photometric Lighting**:
  - Exposes `t.term.solar.altitude` (-90°..+90° topocentric elevation), `t.term.solar.azimuth` (0°..360° compass bearing), `t.term.solar.zenith` (`90° - altitude`), `t.term.solar.isGoldenHour` (altitude between -4° and +6°), `t.term.solar.isBlueHour` (altitude between -6° and -4°), and `t.term.solar.shadowRatio` (vertical shadow multiplier `cot(altitude)`).
- **Polar Regions Handling (`isMidnightSun`, `isPolarNight`)**:
  - Added continuous polar daylight (`t.term.solar.isMidnightSun`) and continuous polar night (`t.term.solar.isPolarNight`) flags with graceful `null` handling for non-occurring sunrise/sunset times in high latitudes (|lat| > 66.5°).
- **Local Coastal Tide Predictions & Port Calibration**:
  - Exposes `t.term.tides.nextHighTide` and `t.term.tides.nextLowTide` as local `Tempo` instances calculated from observer meridian transits, with port hydrodynamic offset calibration via `geo.lunitidalIntervalMin` and regime classification (`t.term.tides.regime`).
- **Topocentric Real-Time Ephemeris (`t.term.lunar.altitude`, `t.term.lunar.azimuth`, `t.term.lunar.isAboveHorizon`)**:
  - Computes observer-specific lunar altitude angle (corrected for horizontal parallax and atmospheric refraction), compass azimuth bearing (0°..360° True North), and real-time horizon visibility flag.
- **Local Meridian Transit (`t.term.lunar.transit`)**:
  - Resolves exact `Tempo` instance for the Moon's upper culmination (highest sky altitude) within the observer's local 24-hour calendar day.
- **Bright Limb Crescent Tilt (`t.term.lunar.crescentTiltDeg`)**:
  - Calculates apparent crescent tilt angle relative to local zenith (0°..360°), enabling accurate rendering of tropical "Wet Moon" / Cheshire Cat crescent orientations.
- **Lunar Distance, Parallax & Supermoon/Micromoon**:
  - Exposes `t.term.lunar.distanceKm`, `t.term.lunar.angularDiameterArcmin`, `t.term.lunar.isSupermoon`, and `t.term.lunar.isMicromoon` to identify close orbital approaches during New/Full Moon.
- **Local Solar & Lunar Eclipse Detection (`t.term.lunar.eclipse`, `t.term.lunar.obscuration`)**:
  - Provides observer-specific eclipse classification (`'total-solar'`, `'annular-solar'`, `'partial-solar'`, `'total-lunar'`, `'partial-lunar'`, `'penumbral-lunar'`) and fraction of disk obscured (0.0..1.0) on both `t.term.lunar` and `t.term.solar`.
- **Hemisphere-Aware Emojis**:
  - Dynamically renders Northern or Southern hemisphere lunar crescent emojis based on observer latitude / `sphere` configuration.
- **Local Apparent Solar Time (`t.term.solar.solarTime`)**:
  - Added `solarTime` to `t.term.solar` ([`TempoTermRegistry['solar']`](src/index.ts)). Returns a `Tempo` instance representing exact local apparent solar time (AST) factoring in longitudinal displacement (Δλ × 4 min/deg) and the Equation of Time (EoT).
  - Evaluates to `null` when geographic coordinates are omitted in adherence to the location-dependent null contract.
- **Solar Noon Precision Verification**:
  - Fully verified `t.term.solar.noon` meridian transit calculations with comprehensive test coverage.


## [1.0.0] - 2026-09-18

### Added
- **Production GA Release**:
  - Promoted `@magmacomputing/tempo-plugin-celestial` from experimental status to official `v1.0.0` production release.
- **`/install` Subpath Side-Effect Entry Point**:
  - Added dedicated `@magmacomputing/tempo-plugin-celestial/install` subpath for one-line side-effect installation (`import '@magmacomputing/tempo-plugin-celestial/install'`).
  - Automatically registers `CelestialPlugin` (`SolarTerm`, `LunarTerm`, `TidalTerm`) onto `Tempo` upon side-effect import while preserving 100% tree-shakeability for the main package entry point.

## [0.2.0] - 2026-09-09

### Added
- **Elevation Support on Solar Term**: Exposed `elevation: number | null` on `t.term.solar` ([`TempoTermRegistry['solar']`](src/index.ts)).
- **Atmospheric Horizon Dip**: Factored `t.geo.elevation` into solar sunrise, sunset, and daylight duration calculations via `@magmacomputing/tempo-fns`. Observers at high elevations experience earlier sunrise and later sunset due to geometric horizon dip.

## [0.1.0] - 2026-09-02

### Added
- **Experimental Initial Release**: Launch of `@magmacomputing/tempo-plugin-celestial` (`v0.1.0`), bringing location-aware solar day state calculations (`t.term.sun`, `t.term.solar`) and lunar phase/ephemeris calculations (`t.term.moon`, `t.term.lunar`) to Tempo.
- **Tidal Term Resolution (`TidalTerm`)**: Introduced `TidalTerm` (`key: 'tide'`, `aliases: ['tides', 'tidal']`) for astronomical tide state resolution (`t.term.tide`, `t.term.tides`).
- **Astronomical Tidal Snap Anchors**: Enables boundary snapping for Spring (`#tide.spring`), Neap (`#tide.neap`), and King (`#tide.king`) tides based on solar-lunar alignment and orbital perigee proximity.
- **Location-Aware Moonrise & Moonset**: Added `t.term.lunar.moonrise` and `t.term.lunar.moonset` event resolution.
- **Solar Ephemeris Data**: Provides `t.term.solar.sunrise`, `t.term.solar.noon`, and `t.term.solar.sunset` along with twilight phases.
- **Universal Geolocation Integration**: Updated documentation and usage guides to feature `@magmacomputing/library`'s `geoLookup()` for automatic browser hardware and server IP geolocation mapping.
