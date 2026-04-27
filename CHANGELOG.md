# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [2.7.0] - 2026-04-27

### Added
- **Grouped Configuration Options**: Consolidated `monthDay` and `relativeTime` options into nested objects.
- **Internal layout detection**: Added `isMonthDay` detection for improved regional layout resolution.
- **CI Benchmarks**: Added performance benchmarking suite to CI.

### Fixed
- **Event Overrides**: Fixed `$setEvents` logic to correctly handle custom event overrides.
- **TimeZone Fallbacks**: Improved and cleaned up the IANA TimeZone fallback list.
- **Intl.Locale Debugging**: Enhanced diagnostic logging for locale resolution.

## [2.6.0] - 2026-04-25

### Added
- **Standardized UTC Offsets**: Added `normalizeUtcOffset` utility for transforming informal UTC-offset strings.
- **Custom Layout Order**: Added `layoutOrder` option to customize parsing element precedence.

### Changed
- **Season Scope Simplification (Breaking)**: Removed Chinese-specific object from `term.season` scope.
- **Refined TimeZone Normalization**: Improved UTC offset handling during initialization.

### Fixed
- **Layout Pattern Resolution**: Fixed ordering to respect intended sequence.

## [2.5.0] - 2026-04-24

### Added
- **Sandbox Factory Mode**: Introduced `Tempo.create()`, a static factory method for creating isolated `Tempo` subclasses with independent configurations and registries.
- **Layout Order Resolver Module**: Extracted layout-ordering decision logic into a dedicated `engine.layout` module.
- **Layout Controller Framework**: Implemented minimal controller-map infrastructure for future input-class pre-filtering.
- **Debug Layout Order Visibility**: Added optional debug output in `Tempo.#swapLayout` to emit the resolved layout order for diagnostics.

### Changed
- **Internal Layout Resolution**: Refactored `Tempo.#swapLayout` to delegate ordering to the external resolver.
- **Alias Precedence**: User-defined `event` and `period` aliases now take precedence over built-in aliases.
- **Module Path Flattening**: Relocated core modules to `src/module/` for a flatter, more intuitive internal architecture.

### Fixed
- **Determinism Coverage**: Added comprehensive unit tests for layout resolution and multi-pair swap handling.

## [2.4.0] - (Skipped)

_Version 2.4.0 was not released; the project merged new functionality from 2.4.0 into 2.5.0._

## [2.3.0] - 2026-04-22

### Added
- **Standalone Parse Engine**: Extracted the natural language engine into a standalone `parse()` function for instance-free datetime resolution.
- **Noise Filtering**: Added an `ignore` option to strip irrelevant words during string parsing.
- **Backtracking Security**: Implemented `Match.backtrack` safety guards in the snippet registry.
- **Ecosystem Installation Guide**: Released comprehensive installation instructions for Node.js, Deno, and standard browser environments.

### Changed
- **Automatic Context Sync**: Hemisphere settings now automatically synchronize with timezone updates.
- **State Optimization**: Refactored the internal parser state machine for reduced memory usage.
- **Interactive Playground**: Enhanced the browser-based demo with live timezone selectors and real-time clock updates.

### Fixed
- **Resolution Resilience**: Hardened the resolution loop with safety valves to prevent infinite loops in extreme date ranges.
- **Type Safety**: Hardened TypeScript definitions for all `parse` and `term` resolution functions.


## [2.2.6] - 2026-04-20

### Added
- **Premium Browser Test Dashboard**: Overhauled the browser-based test suite with a modern, glassmorphism-inspired UI featuring interactive feedback, live result streaming, and robust error visualization.
- **Isomorphic Export Support**: Enhanced the `dist/tempo.bundle.esm.js` to provide both a default export and a named `{ Tempo }` export, ensuring the exact same import syntax works seamlessly across Node.js and browser environments.

### Changed
- **Unified Import Syntax**: Standardized all documentation and testing examples to use named imports (`import { Tempo } from '@magmacomputing/tempo'`), eliminating environment-specific inconsistencies.

### Fixed
- **JSBI Resolution**: Explicitly added `jsbi` to all documentation import maps to resolve bare-specifier errors in `@js-temporal/polyfill` when running in strict browser environments.
- **Documentation Formatting**: Corrected orphaned script blocks and added missing headers to the `Tempo.md` guide for better readability.


## [2.2.5] - 2026-04-20

### Added
- **Cross-Bundle Singleton Stability**: Implemented a symbol-based brand check for `TempoRuntime` to ensure reliable singleton resolution even when multiple versions of the library are loaded.

### Changed
- **Consolidated Internal Storage**: Merged redundant internal term/plugin arrays into a unified, validated `pluginsDb` within `TempoRuntime`, reducing memory overhead and improving consistency.
- **Refined Year Semantics**: Normalized the `year` component in term templates to intelligently distinguish between relative offsets (e.g., year `0`) and absolute historical years (e.g., year `2000`).
- **Improved Type Safety**: Introduced `MatchResult` as a type alias for `Internal.Match` to resolve naming conflicts with the `Match` runtime class, while maintaining the public `Match` export for backward compatibility.

### Fixed
- **Term Resolution Accuracy**: Fixed a sorting bug in the yearly-cycle resolution engine that caused incorrect anchor identification for non-calendar-ordered term groups (e.g., seasons).
- **Documentation Integrity**: Updated architecture and README guides to point to the correct `#tempo/support` module and provided functional, complete importmap examples for browser environments.
- **HTML Standards Compliance**: Wrapped library demonstration and test pages in proper HTML5 skeletons to ensure consistent rendering and prevent quirks-mode issues.
- **Package Optimization**: Refined `sideEffects` in `package.json` to exclude non-published source files, improving tree-shaking for consumer builds.


## [2.2.4] - 2026-04-19

### Fixed
- **Ticker Redefinition**: Added safety guards to `TickerModule.install` to prevent `TypeError: Cannot redefine property: ticker` when extending an already-initialized or `@Immutable` class.
- **Granular ESM Resolution**: Bundled `tslib` into granular ESM distribution files to resolve browser-side "Failed to resolve module specifier" errors.
- **Documentation Build**: Resolved dead links in `Tempo.md` to ensure successful VitePress production builds.
- **Verification Dashboard**: Synchronized the browser verification dashboard with current build artifacts and updated to `v2.2.4`.

## [2.2.3] - 2026-04-19

### Added
- **Dual-Bundle Strategy**: Modernized the Rollup configuration to produce both a "batteries-included" ESM bundle (`tempo.bundle.esm.js`) and a classic IIFE bundle (`tempo.bundle.js`).
- **Global Export Map**: Added `./bundle` (ESM) and `./global` (IIFE) export mappings to `package.json` for better consumer clarity.

### Changed
- **Parsing Priority**: Reordered `ParseEngine.result` validation to ensure `isTempo` instances are converted to `Temporal.ZonedDateTime` before primitive-type validation occurs.
- **Registry Error Hints**: Improved module-resolution error messages to suggest cleaner import specifiers (e.g., `#tempo/parse` instead of `#tempo/parsemodule`).

### Fixed
- **Version Synchronization**: Unified versions across the monorepo root, `tempo`, and `library` packages.
- **Test Infrastructure**: Updated `vitest.workspace.ts` and library configurations to use the renamed `temporal-polyfill.ts` setup file.

## [2.2.1] - 2026-04-17

### Added
- **Live Documentation Links**: Updated the package README to link directly to the live VitePress site.

### Fixed
- **CI/CD Hardening**: Resolved dependency resolution and build target issues in the GitHub Actions deployment pipeline.

## [2.2.0] - 2026-04-17

### Added
- **Modular Mutation Engine**: Refactored `add()` and `set()` into a standalone `MutateModule`. While the public entry point remains "batteries-included," this refactor allows advanced users to import a slimmed-down `Tempo` core and only opt-in to mutation logic as needed.
- **VitePress Documentation Site**: Launched a comprehensive, searchable documentation platform with deep TypeDoc integration and interactive guides.
- **Browser Distribution Dashboard**: Introduced a unified verification suite at `/demo/index.html` to validate ESM, IIFE, and modular distributions in real-time.
- **Enhanced Payload Validation**: Implemented strict validation for Ticker payloads to prevent ambiguous mixing of directional and relative mutations.

### Changed
- **Semantic Event Update**: Refactored `tomorrow` and `yesterday` to be instance-relative rather than system-anchored, providing more predictable behavior during complex temporal shifts.
- **Internal State Protection**: Hardened the `[sym.$Internal]()` accessor, making the underlying `zdt` read-only to guarantee instance immutability.

### Fixed
- **Arithmetic Precision**: Resolved out-of-bounds access and floating-point indexing errors in term range resolution through floored cycle calculations.
- **State Propagation**: Fixed inconsistent `mutateDepth` propagation in error fallback paths, ensuring robust recursive protection.
- **Primitive Integrity**: Corrected the `distinct` utility to properly respect and bind `thisArg` during mapping operations.
- **Redundant State Removal**: Eliminated the unused global `STATE` constant from utilities to prevent potential cross-instance state leakage.

## [2.1.2] - 2026-04-16

### Added
- **VitePress Documentation**: Launched a modern, searchable documentation site powered by VitePress and TypeDoc.
- **Proxy-Delegator Pattern**: Refined the lazy-evaluation engine for $O(1)$ property access.
- **Scan-and-Consume Guard**: Implemented high-performance token matching for v2.1.2 stabilization.
- **Ticker Stability Guard**: Implemented a 10,000-iteration safety break in `resolveTermShift` to prevent infinite loops when resolving malformed or non-advancing custom terms.
- **Unified Diagnostics (`Logify`)**: Integrated the `Logify` utility into core internal classes. This provides a standardized mechanism for `debug`, `catch`, and `silent` modes across the library.

### Changed
- **High-Precision Ticker**: Migrated `TickerPlugin` from `Date.now()` to `instant().epochMilliseconds`, ensuring consistent use of high-precision timing without legacy `Date` object dependencies.
- **Test Performance**: Standardized the test suite on `vitest --pool=forks` to ensure deterministic execution of asynchronous ticker and generator tests.
- **Vitest Upgrade Deferral**: Intentionally deferred the upgrade to Vitest 4.x and maintained version `^2.1.8`. The current Vitest 4 transformer (Oxc) does not yet support the Stage 3 (ECMAScript) decorators used extensively by this library's `@Immutable` and `Logify` utilities.

### Fixed
- **Term Plugin Resolution**: Corrected package export mappings for term-based plugins in `package.json`, resolving module resolution errors in development and test environments.
- **Numeric Word Parsing**: Fixed regressions in numeric word resolution (e.g., "eleven days hence") by ensuring registry synchronization during late-import scenarios.

---

## [2.0.0] (Internal) - 2026-03-30

### Added
- **Zero-Cost Constructor**: Optimized the instantiation path to $O(1)$ by deferring all parsing and property registration until the first property access.
- **Generic Lazy Delegator**: Introduced `getLazyDelegator` to standardize on-demand property discovery for `fmt` and `term` objects.
- **Anchor-Aware Parsing**: Added native support for anchoring relative date strings (e.g., "next Friday") to a specific reference date via the `anchor` option.
- **Timezone Safety**: Implemented graceful fallback to `UTC` (with a warning) for invalid IANA TimeZone IDs when `catch: true` is enabled.

### Fixed
- **Parsing Robustness**: Resolved 299/299 regressions in the core and plugin test suites.
- **Immutability Performance**: Fixed `TypeError` during lazy discovery on secured instances by implementing defensive prototype-shadowing.

---

## [1.3.0] - 2026-03-26

### Added
- **Reactive Registration Hook (`$Register`)**: Introduced a global reactive hook that allow plugins to automatically trigger `Tempo.init()` if they are imported after the main library. This resolves several "late import" edge cases in complex bundle environments.
- **Strictly Typed Enums**: Refactored `tempo.enum.ts` with private `const` key arrays, restoring 100% strict type inference (no more `any`) while maintaining a clean, code-minimal declaration pattern.
- **Dynamic Registry Mapping**: Implemented a centralized `REGISTRIES` map in `tempo.enum.ts`, providing a single point of change for all discoverable registries (`NUMBER`, `FORMAT`, `TIMEZONE`, etc.).

### Changed
- **Plugin Architecture Consolidation**: Centralized all core registration logic, symbols ($Tempo, $Plugins, $Register), and factory methods (`definePlugin`, `defineTerm`) into a single module at `packages/tempo/src/plugins/tempo.plugin.ts`.
- **API Consistency**: Updated `Tempo.init()` to return `this` (the static class instance) to better support fluent chaining patterns (e.g., `Tempo.init({...}).extend(...)`).
- **Circular Dependency Resolution**: Relocated term plugins and adopted a strict "import type" policy in the plugin layer to break core-plugin cycles and improve build stability.

### Fixed
- **Type-Safe Discovery Symbols**: Updated `BaseOptions` to natively support `symbol` as a discovery key, resolving "not assignable" errors across the test suite and production environments.
- **Ticker Plugin Typing**: Resolved implicit `any` and reduction-type errors in the ticker plugin for better safety in strict mode.
- **Weekday/Month Alignment**: Restored 1-based alignment (ISO 8601) for `WEEKDAY` and `MONTH` enums by ensuring `All`/`Everyday` placeholders remain at index 0.

---

## [1.2.0] - 2026-03-23

### Added
- **Monorepo Migration**: Successfully transitioned to a unified monorepo structure, naming `packages/tempo` and `packages/library` as npm workspaces.
- **Publishing Optimizations**: Integrated `prepublishOnly` build hooks and `files` whitelisting in `package.json` for leaner and more reliable NPM distribution.
- **Enhanced Type Resolution**: Fixed `node` type definition errors in nested test environments by explicitly configuring `typeRoots`.

### Changed
- **Dependency Rationalization**: Consolidated `tslib` and `@js-temporal/polyfill` at the project root while preserving `tslib` as a runtime dependency for published packages.
- **Plugin Loading Refactor**: Refactored `static load` into a unified, single-pass dispatch logic for handling Plugins, TermPlugins, and Discovery configurations robustly.

## [1.1.0] - 2026-03-21

### Added
- **Plugin System (`Tempo.load`)**: Introduced a formal architecture for extending the `Tempo` class and prototype, allowing for modular feature injection (e.g., `TickerPlugin`).
- **Auto-Plugin Discovery**: Plugins can now be automatically loaded via the `plugins` configuration in `Tempo.init()` or through the Global Discovery manifest (`Symbol.for($Tempo)`).
- **Selective Immobility**: Enhanced the `@Immutable` decorator with a "Selective Immute" pattern. Core methods (including Symbols like `Symbol.dispose`) are now write-protected, while the class remains extensible for new plugins.
- **Reactive Clock (Modularized)**: The `Tempo.ticker` logic has been extracted into an optional plugin available at `@magmacomputing/tempo/plugins/ticker`. This reduces core bundle size while offering high-performance Async Generators and countdown support.
- **Symbol Protection**: Core identifiers are now safe from runtime hijacking, providing a robust security model for library consumers.

### Changed
- **Polyfill Decoupling**: Moved the `Temporal` API availability check to the core `Tempo` class, allowing standalone utilities to run in environments without `Temporal`.
- **Type-Strict Reflection**: Updated internal reflection tools to use `ownEntries()` for cleaner property descriptor management.
- **Documentation Overhaul**: Updated all technical guides to reflect the modular, plugin-based architecture.

## [1.0.8] - 2026-03-19

### Added
- **Numeric Pattern Inference**: Corrected `Formats` and `Format` types to ensure numeric patterns (like `yearMonthDay`) are correctly inferred as `number` while preserving enum-like functionality for the format registry.
- **Layout Patterns Guide**: Created a new technical guide `doc/tempo.layout.md` for describing Tempo services through custom layout/snippet building.
- **Enum Type Flexibility**: Loosened TypeScript constraints on `enumify` objects. The `count()` method now returns a standard `number`, and iteration callbacks (`forEach`, `filter`, `map`) now accept a generic `Enum.wrap<any>`, resolving assignability issues in complex configurations like `Tempo.Config`.
- **Custom Global Formats**: Introduced support for defining custom format layouts via Global Discovery (`Symbol.for($Tempo)`), making them available across all instances.
- **Type Safety Refinement**: Significantly enhanced the `Tempo` class by removing redundant `as any` casts, particularly in `#parse` and timezone handling, achieved through better destructuring and explicit string resolution.
- **Modern Syntax Adoption**: Updated the codebase to use `Object.getOwn()` instead of legacy `Object.prototype.hasOwnProperty.call()` for cleaner and more modern property checks.

### Changed
- **Core Simplification ($Base Removal)**: Removed the `$Base` symbol and its termination logic from `reflection.library.ts`. This simplifies prototype chain traversal across the library, as boundary protection is no longer required following the `config` getter refactor and existing enumerable property filtering for Enums.
- **Constant Modernization**: Renamed and deprecated `Tempo.TIME` and `Tempo.TIMES` in favor of more semantic `Tempo.DURATION` and `Tempo.DURATIONS`, improving readability and consistency with internal logic.
- **Enum Extension Optimization**: Refactored `Enum.extend` to support deep prototype chains (up to 50 levels) and fixed a critical boundary bug where root Enum data was being excluded from child extensions.
- **Proxy Trap Performance**: Optimized `toJSON` and `$Inspect` traps in `proxify` to prevent unnecessary prototype chain traversal. The traps now prioritize checking for own properties, significantly improving performance and preventing recursion during serialization.
- **Term Traversal Logic**: Unified prototype traversal by introducing a shared `$Base` symbol to terminate chain climbing, improving both performance and collision resistance.
- **Node.js Custom Inspection**: Standardized the Node.js custom inspection symbol as `$Inspect` in the reflection library and updated `Tempo` and `Enumify` for consistent console formatting.
- **Stealth Proxy for terms**: Implemented a "Stealth Proxy" for the `term` accessor to provide a flat, iterable object view of resolved terms across Node.js and Browser environments while preserving lazy resolution.
- **Term Getters Performance**: Refactored `#setTerm` logic to use prototype shadowing (`Object.create`), improving performance and reducing overhead.
- **Strict Global Discovery**: Standardized the global configuration mechanism by removing legacy `TempoOptions` support and strictly enforcing the `Tempo.Discovery` contract.
- **Enumify Extend**: Refactored the internal `extend` utility within `enumify` for improved maintainability.
- **Parsing Reorganization**: Adjusted the `#parse` method to resolve `tz` and `cal` identifiers *after* configuration updates, ensuring internal state always reflects the most current settings.

### Fixed
- **Decorator Compatibility**: Resolved nominal typing issues in `registerTerms` by loosening internal constraints, enabling seamless synchronization with projects using Stage 3 decorators (like `whiteLibrary`).
- **Enum Boundary Bug**: Corrected the logic in `ownEntries` to ensure that root Enum entries (marked with `$Base`) are correctly collected during full-chain resolution.
- **Getter Handling in Extensions**: Fixed a regression in `reflection.library.ts` where properties with getters were being incorrectly unwrapped; they are now accessed directly to ensure proper execution.
- **Timezone Round-trip Restoration**: Fully resolved critical serialization regressions by updating `#setConfig` to recursively handle the `config` property during revival.
- **Instance Timezone Integrity**: Restored the safe update to `#local.config.timeZone` in `#parseZone`, ensuring internal getters stay in sync with date-time strings without clobbering initial state.
- **String Handling Cleanup**: Removed redundant `String()` wraps in regex group parsing and mutation logic where types were already guaranteed.

## [1.0.7] - 2026-03-14

### Added
- **`toPlain...` Methods**: Added `toPlainDate()`, `toPlainTime()`, and `toPlainDateTime()` helper methods to the `Tempo` class for easier extraction of specific `Temporal` components.
- **Argument Flexibility**: Enhanced `.set()` and `.add()` to accept either a date-time payload or an options object as the first argument, improving developer ergonomics.
- **API Reference**: Created `doc/tempo.api.md`, a comprehensive technical guide covering all static and instance API entrypoints, signatures, and properties.
- **TypeScript Types**: Created `doc/tempo.types.md` as a detailed reference for all core namespace types.
- **Regression Tests**: Added `test/issue-fixes.test.ts` to permanently cover relative events, timezone brackets, and storage precedence.

### Changed
- **Performance Optimization**: Switched Vitest to `--pool=forks` and refactored internal iteration in `.set()` and `.add()` to resolve test runner hangs during complex parsing.
- **Relative Events**: Refactored `now`, `today`, `tomorrow`, and `yesterday` to be relative to the specific `Tempo` instance. Date-based events now use `toPlainDate()` for improved parsing robustness.
- **Config Precedence**: Established and documented a reliable precedence order: Metadata < Defaults < Storage < Discovery < Global Init < Instance.
- **Config Privacy**: Explicitly excluded the internal `anchor` property from public configuration to prevent developer confusion.
- **Cleanup**: Removed obsolete `rdt` (recent date) snippet logic as it is fully superseded by smart event aliases (functions).
- **Storage Logic**: Consolidated persistence merging into `#setConfig`, ensuring storage values correctly act as defaults.
- **`toInstant` / `toDateTime` Getters**: Enhanced getters to prioritize the instance's underlying value while providing robust fallbacks to system "now" (including safe handling of uninitialized timezones).

### Fixed
- **Timezone Round-trip**: Resolved a critical bug where timezone information was lost when reviving Tempo instances from JSON (serialization/deserialization).
- **Timezone Bracket Parsing**: Resolved an issue where bracketed timezones were ignored or incorrectly overridden by offsets.
- **Mutation Safety**: Fixed `TypeError: Cannot add property` in `#result` when performing operations on instances decorated with `@Immutable` by ensuring internal state is handled safely.
- **Relative Event Drifting**: Fixed a bug where events like 'yesterday' were incorrectly calculated based on the run-date instead of the `Tempo` instance state.
- **Storage Merge Bug**: Corrected an issue where explicit options were being clobbered by storage values.

## [1.0.6] - 2026-03-12

### Added
- **API Reference**: Created `doc/tempo.api.md`, a comprehensive technical guide covering all static and instance API entrypoints, signatures, and properties.
- **Node.js Support**: Added explicit server-side usage instructions and code examples to `README.md` and `doc/Tempo.md`.
- **`{wy}` Token & Getter**: Introduced the `{wy}` formatting token and a corresponding public `wy` getter for the 4-digit ISO week-numbering year.

### Changed
- **Config Documentation**: Refactored `doc/tempo.config.md` to follow technical precedence (Persistence > Discovery > Global > Instance).
- **Doc Cross-Linking**: Standardized documentation navigation by converting all textual cross-references into clickable markdown links.
- **Precision Glossaries**: Refined documentation in `vision.md` and `comparison.md` to specify "meteorological seasons" and "zodiac signs".
- **Token Renaming**: Renamed `{isoy}` to `{wy}` across the library, tests, and documentation for improved semantic clarity.

### Fixed
- **ISO Week Logic**: Refined `wy` and `yyww` formatting logic to correctly handle boundary cases between years.
- **Global Discovery Trace**: Improved trace logging visibility when `debug: true` is enabled.

## [1.0.5] - 2026-03-10

### Added
- **GitHub Sponsors**: Integrated `FUNDING.yml` and added sponsorship links to `README.md`.
- **Commercial Support**: Added `doc/commercial.md` outlining consulting and priority support options.
- **Term Registration**: Implemented a new functional registration system for `Tempo.terms` to resolve circular dependencies.

### Changed
- **Config Architecture**: Relocated `pivot` property from `Tempo.Config` to `Tempo.Parse` to better align with its parsing-specific purpose.
- **Type Accessibility**: Moved `TermPlugin` type definition to the public `Tempo` namespace for easier external plugin development.
- **Initialization Logic**: Updated `Tempo.init()` to handle term registration and pivot defaults internally.

### Fixed
- Resolved circular dependency between `tempo.class.ts` and `term.import.ts`.
- Standardized internal property access for `pivot` using the `this.#local.parse["pivot"]` syntax.

## [1.0.4] - 2026-03-09
- Initial public release refinements.
- Established documentation for vision and core features.
