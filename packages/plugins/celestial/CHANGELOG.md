# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-09-02

### Added
- **Initial Release**: Launch of `@magmacomputing/tempo-plugin-celestial`, bringing location-aware solar day state calculations (`t.term.sun`, `t.term.solar`) and lunar phase/ephemeris calculations (`t.term.moon`, `t.term.lunar`) to Tempo.
- **Location-Aware Moonrise & Moonset**: Added `t.term.lunar.moonrise` and `t.term.lunar.moonset` event resolution.
- **Solar Ephemeris Data**: Provides `t.term.solar.sunrise`, `t.term.solar.noon`, and `t.term.solar.sunset` along with twilight phases.
- **Universal Geolocation Integration**: Updated documentation and usage guides to feature `@magmacomputing/library`'s `geoLookup()` for automatic browser hardware and server IP geolocation mapping.
