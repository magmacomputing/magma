# Changelog

All notable changes to the `@magmacomputing/tempo-plugin-geo` project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.3.0] - 2026-09-25

### Added
- **Navigation & Transit Analytics (`Tempo.geo` Static Namespace)**:
  - `Tempo.geo.velocity(from, to, options?)`: Calculates travel speed between two timestamped geographic instances or coordinate objects in `km/h`, `mph`, or `m/s`.
  - `Tempo.geo.isImpossibleTravel(from, to, options?)`: Evaluates physical travel feasibility against commercial aviation thresholds (default: 900 km/h) for cybersecurity anomaly detection and impossible travel prevention.
  - `Tempo.geo.bearing(from, to, options?)`: Computes Great-Circle forward azimuth compass bearing in degrees ($0^\circ$ to $360^\circ$).
  - `Tempo.geo.midpoint(from, to)`: Computes Great-Circle geographic midpoint with automatic hemisphere inference (`{ latitude, longitude, sphere }`).
- **Exported Standalone Functional Utilities**:
  - Direct named exports: `calculateBearing`, `calculateMidpoint`, `calculateVelocity`, `isImpossibleTravel`, and types `BearingOptions`, `VelocityOptions`, `ImpossibleTravelOptions`, `TimeUnit`.

## [1.2.0] - 2026-09-18

### Added
- **`/install` Subpath Side-Effect Entry Point**:
  - Added dedicated `@magmacomputing/tempo-plugin-geo/install` subpath for one-line side-effect installation (`import '@magmacomputing/tempo-plugin-geo/install'`).
  - Automatically mounts `Tempo.geo` on `globalThis.Tempo` or imported `Tempo` while preserving 100% tree-shakeability for the main package entry point.

## [1.1.0] - 2026-09-16

### Added
- **Plugin Options Merging & Callable Plugin Support**:
  - `GeoPlugin.install` now accepts resolved options passed by `Tempo.use(GeoPlugin, options)` or `Tempo.use(GeoPlugin(options))` or tuple syntax `[GeoPlugin, options]`.
  - Merges class defaults (`installedClass.config?.pluginOptions?.geo`), plugin registration options, instance options, and call-site options prior to coordinate resolution and lookup.
  - Ensures call-site options override configured defaults (such as `timeout` and `highAccuracy`) while preserving existing coordinate resolution behavior.

## [1.0.0] - 2026-09-08

### Changed (Breaking Changes)
- **Consolidated `Tempo.geo` Namespace**:
  - Removed loose static methods mounted directly on the `Tempo` root class (`Tempo.geoLookup`, `Tempo.resolveGeoCoordinates`, `Tempo.serverGeoLocation`, `Tempo.geoLocation`) to prevent flat base class pollution.
  - All static geolocation utilities are now organized under the dedicated, immutable **`Tempo.geo`** namespace (`Tempo.geo.lookup`, `Tempo.geo.resolve`, `Tempo.geo.server`, `Tempo.geo.browser`, `Tempo.geo.stash`, `Tempo.geo.clear`, `Tempo.geo.get`, and `Tempo.geo.current`).
  - Standalone tree-shakeable functions (`geoLookup`, `resolveGeoCoordinates`, `serverGeoLocation`, etc.) remain available as direct named exports from the package for tree-shaking.
- **Storage Key Scoping**:
  - Standardized ambient coordinate storage on `_magma_geo_`.

### Added
- **24-Hour TTL Caching & Multi-Tenant Partitioning**:
  - Added automatic 24-hour TTL caching for `Tempo.geo.lookup()` with `{ refresh: true }` cache bypass support.
  - Added multi-tenant partitioning in `Tempo.geo.stash()`, `Tempo.geo.get()`, and `Tempo.geo.clear()`, scoping storage under `_magma_geo_:<tenant-id>`.
  - Added `Tempo.geo.current` read-only getter to inspect active ambient coordinates snapshot.
- **Immutability Hardening**:
  - The `Tempo.geo` namespace and attached utilities are recursively frozen via `deepFreeze()`.
- **Stable Community Release**:
  - Official 1.0.0 release of `@magmacomputing/tempo-plugin-geo`.
  - Configured npm Trusted Publisher automation for CI/CD publishing with Sigstore provenance.

## [0.1.0] - 2026-09-07

### Added
- **Initial Community Release (Bootstrap)**:
  - Decoupled IP geolocation lookup and browser hardware location services from core `@magmacomputing/tempo`.
  - Exported functional utilities: `geoLookup()`, `resolveGeoCoordinates()`, `serverGeoLocation()`, `serverGeoCoords()`, `serverMapHemisphere()`, `geoLocation()`, `coerceGeo()`, `getStashedGeo()`.
  - Exported `GeoPlugin` installing `geoLocate()` and `geoLookup()` on Tempo instances alongside static helpers on `Tempo`.
