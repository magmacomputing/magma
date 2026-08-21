# Changelog

All notable changes to the `@magmacomputing/tempo-plugin-ticker` project will be documented in this file.

## [2.3.0] - 2026-08-20

### Changed
- **Community Edition Transition**: Open-sourced under the MIT license as a native Community plugin within the Magma monorepo.
- Removed obfuscation and proprietary license key requirement.

### Added
- **RFC 5545 RRULE Support**: Integrated native RRULE string and `TempoRecurrenceRule` support into `Ticker` and `Ticker.Options`. Tickers can now step using deterministic calendar recurrence rules (e.g. `FREQ=DAILY;INTERVAL=1`, `FREQ=WEEKLY;BYDAY=MO`).
- **Snapshot Alignment**: Included `rrule?: string` on `Ticker.Snapshot` and `info` properties so active tickers list their active recurrence rule.

## [2.2.1] - 2026-07-18

### Changed
- **Ticker Plugin Documentation**: Expanded the Ticker documentation to explicitly clarify the difference between snapping (using directional shorthands like `>`) and relative shifting (using numeric values).

## [2.2.0] - 2026-07-06

### Added
- **Shorthand Duration Keys**: `Ticker.Options` now natively supports Tempo shorthand keys (e.g., `yy`, `mm`, `ww`, `dd`, `hh`, `mi`, `ss`, etc.). This enables writing compact and highly ergonomic intervals (e.g., `Tempo.ticker({ mi: 5, ss: 30 })`), achieving total API consistency with the broader v3.6.0 Tempo ecosystem.

## [1.0.4] - 2026-06-11

### Added
- **Label Identification**: Added the `label?: string` property to `Ticker.Options`. Developers can now easily tag and group tickers without needing external memory-tracking structures (like `WeakMap`). This label is natively exposed on `Tempo.tickers` snapshots.

### Fixed
- **NPM Registry Metadata**: Explicitly added `README.md`, `CHANGELOG.md`, and `LICENSE` to the `files` array in `package.json` to ensure the npmjs.com registry correctly renders package documentation.
- **Test Integrity**: Updated internal test fixtures to correctly align with Tempo Core's standard capitalization and the recent rename of the `period` term to `timeOfDay`.

## [1.0.0] - 2026-06-01

### Added
- Initial release of the Ticker plugin.
- A highly accurate and CPU-efficient periodic timer designed as an alternative to native `setInterval`.
- Features pause, resume, reset, and configurable jitter compensation.
- Supports both `EventEmitter` and callback-based listener patterns.
