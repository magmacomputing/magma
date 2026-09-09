# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.2.0] - 2026-09-09

### Added
- **Elevation Support on Solar Term**: Exposed `elevation: number | null` on `t.term.solar` ([`TempoTermRegistry['solar']`](file:///home/michael/Project/magma/packages/plugins/celestial/src/index.ts#L52)).
- **Atmospheric Horizon Dip**: Factored `t.geo.elevation` into solar sunrise, sunset, and daylight duration calculations via `@magmacomputing/tempo-fns`. Observers at high elevations experience earlier sunrise and later sunset due to geometric horizon dip.

## [0.1.0] - 2026-09-02

### Added
- **Experimental Initial Release**: Launch of `@magmacomputing/tempo-plugin-celestial` (`v0.1.0`), bringing location-aware solar day state calculations (`t.term.sun`, `t.term.solar`) and lunar phase/ephemeris calculations (`t.term.moon`, `t.term.lunar`) to Tempo.
- **Tidal Term Resolution (`TidalTerm`)**: Introduced `TidalTerm` (`key: 'tide'`, `aliases: ['tides', 'tidal']`) for astronomical tide state resolution (`t.term.tide`, `t.term.tides`).
- **Astronomical Tidal Snap Anchors**: Enables boundary snapping for Spring (`#tide.spring`), Neap (`#tide.neap`), and King (`#tide.king`) tides based on solar-lunar alignment and orbital perigee proximity.
- **Location-Aware Moonrise & Moonset**: Added `t.term.lunar.moonrise` and `t.term.lunar.moonset` event resolution.
- **Solar Ephemeris Data**: Provides `t.term.solar.sunrise`, `t.term.solar.noon`, and `t.term.solar.sunset` along with twilight phases.
- **Universal Geolocation Integration**: Updated documentation and usage guides to feature `@magmacomputing/library`'s `geoLookup()` for automatic browser hardware and server IP geolocation mapping.
