# Changelog

All notable changes to the `@magmacomputing/tempo-plugin-geo` project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
