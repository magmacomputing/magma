# Changelog

All notable changes to the `@magmacomputing/tempo-plugin-astro` project will be documented in this file.

## [2.2.0] - 2026-08-31

### Added
- **Lunar Cycle Engine (`LunarTerm`)**: Added comprehensive lunar phase calculations, introducing `t.term.moon` and `t.term.lunar` terms.
- **Machine Keys & Human Phase Names**: `t.term.moon` and `t.term.lunar.key` resolve short machine-friendly keys (`'new-moon'`, `'waxing-crescent'`, `'full-moon'`, etc.), while `t.term.lunar.phase` provides full human-readable phase names (`'New Moon'`, `'Waxing Crescent'`, `'Full Moon'`, etc.).
- **1-Based Phase Index (`index`)**: `t.term.lunar.index` provides a 1-based step index (`1`: New Moon ... `5`: Full Moon ... `8`: Waning Crescent) for numerical step calculations. Note that for JavaScript 0-based array access, `index - 1` must be used to prevent `phases[lunar.index]` from skipping index 0 or exceeding array bounds at index 8.
- **Phase Metadata**: Resolves illumination percentage (0..1), moon age in days, waxing/waning status, and range boundary `start` / `end` Tempo instances.
- **Hemisphere Awareness**: Lunar phase emojis automatically adjust orientation when `sphere` is set to Southern (`sphere: 'south'`) vs Northern (`sphere: 'north'`), and evaluate to `undefined` if `sphere` is omitted.
- **Plugin Bundle Export**: Exported `AstroPlugin` (`[AstroTerm, LunarTerm]`) as the default export. Importing `@magmacomputing/tempo-plugin-astro` auto-registers both terms into Tempo's term database via side-effects.
- **Standalone Helper**: Exported `getLunarPhase(tempo)` standalone calculation function.

## [2.1.4] - 2026-08-15

### Changed
- **Performance**: Switched hemisphere resolution to access `t.sphere` directly from the `Tempo` instance, bypassing `t.config` proxy evaluation in the hot resolution path.

## [2.1.2] - 2026-07-15

### Fixed
- Fixed an issue where the polynomial algorithm could return mathematical garbage for years outside the Jean Meeus limit. It now strictly enforces the `-1000` to `+3000` year bounds by throwing a `RangeError`.

## [2.1.0] - 2026-07-02

### Changed
- **Open Source Transition**: The Astro plugin is now officially a Community plugin! It is 100% free and open-source under the MIT License.
- **Licensing Removal**: Removed all proprietary licensing logic and initialization token checks.
- **Clear-Text Build**: Removed `javascript-obfuscator` from the build pipeline. The published NPM artifact is now fully readable clear-text JavaScript.
- Updated documentation and README to reflect the new open-source structure.

## [1.1.6] - 2026-06-11

### Changed
- Renamed the metadata payload property `type` to `event` (Equinox vs. Solstice) to better reflect astronomical terminology and reduce naming collisions.
- Refactored internal `calculateAstroMoment` parameter from `season` to `quarter` to resolve semantic ambiguity between meteorological seasons and astronomical quarters.
- Augmented the `@magmacomputing/tempo/core` module to natively type the `TempoTermRegistry` for `astro` and `astronomy`, providing full strict IntelliSense autocomplete for IDEs.

### Fixed
- **Type Definitions**: Added missing `start: Tempo` and `end: Tempo` boundaries to the `TempoTermRegistry` augmentation, ensuring accurate typings for the dynamic range boundaries injected by the core resolver.
- **NPM Registry Metadata**: Explicitly added `README.md`, `CHANGELOG.md`, and `LICENSE` to the `files` array in `package.json` to ensure the npmjs.com registry correctly renders package documentation.

## [1.1.3] - 2026-06-07

### Security
- Migrated licensing enforcement from `jose` to the native WebCrypto Tempo Core primitives.

### Fixed
- Replaced all usage of the global `Date` object with the `instant()` temporal engine in the core validator to ensure timeline consistency.
- Corrected test environment resolution boundaries that caused unhandled asynchronous Promise verification leaks.

## [1.1.2] - 2026-06-04

### Fixed
- Resolved the "Ghost-Trap" architectural conflict that prevented validation when used with Tempo v3.0.0.
- Decoupled proprietary term definition and cryptographic validation from the plugin bundle. Licensing engine state and references are now directly imported from the Tempo Core (`@magmacomputing/tempo/plugin`).
- Removed the `@magmacomputing/tempo-plugin-core` bundled `devDependency` to prevent duplicate initialization.

## [1.0.2] - 2026-05-25

### Security
- Migrated licensing enforcement to the newly decoupled `@magmacomputing/tempo-plugin-core` workspace.
- The proprietary license verification and string-obfuscation logic is now baked directly into the plugin bundle during the build step, decentralizing the security model and eliminating reliance on the open-source engine for validation.
- Updated `devDependencies` to automatically resolve the new internal `@core` monorepo symlink via `tsup`.

## [1.0.0] - 2026-05-18

### Added
- Initial release of the Astronomical Seasons plugin.
- Implements the Jean Meeus polynomial approximation algorithm for precise Equinox and Solstice moments.
- Returns fully scoped astronomical objects containing:
  - Precise start/end dates for each astronomical season
  - The astronomical `key` (Vernal, Summer, Autumnal, Winter)
  - The colloquial traditional `season` mapping (Spring, Summer, Autumn, Winter)
  - The `event` (Equinox vs. Solstice)
- Fully supports automatic label inversion for Northern vs. Southern hemisphere configurations (`sphere: 'south'`).
- Implements the `v2.10.0` Tempo Core Licensing API via cryptographic JSON Web Signatures (JWS).
- Auto-registers itself via side-effect upon import.
