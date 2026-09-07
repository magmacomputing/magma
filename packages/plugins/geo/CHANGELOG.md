# Changelog

All notable changes to the `@magmacomputing/tempo-plugin-geo` project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-09-07

### Added
- **Initial Community Release**:
  - Decoupled IP geolocation lookup and browser hardware location services from core `@magmacomputing/tempo`.
  - Exported functional utilities: `geoLookup()`, `resolveGeoCoordinates()`, `serverGeoLocation()`, `serverGeoCoords()`, `serverMapHemisphere()`, `geoLocation()`, `coerceGeo()`, `getStashedGeo()`.
  - Exported `GeoPlugin` installing `withGeo()` and `lookupGeo()` on Tempo instances alongside static helpers on `Tempo`.
