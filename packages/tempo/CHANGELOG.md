# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Changed
- **Alias Precedence**: User-defined `event` and `period` aliases now take precedence over built-in aliases when both patterns match.

### Notes
- **Impact**: Parsing output may change for consumers who previously relied on built-in alias resolution winning in overlap cases.
- **Guidance**: If needed, rename custom aliases to avoid overlap or remove the conflicting custom alias.

## [2.3.0] - 2026-04-22

### Added
- **Standalone Parse Support**: Enhanced the `ParseModule` to support standalone parsing of textual dates (including names like "Jan") without requiring a bound host class instance.
- **Backtracking Security**: Implemented suspicious quantifier detection (`Match.backtrack`) in the snippet registry to prevent catastrophic backtracking and malicious regex patterns.
- **Automatic Sphere Sync**: The engine now automatically recalculates the `config.sphere` (hemisphere) state whenever the `timeZone` is updated in the configuration.

### Changed
- **Heading Hierarchy**: Restructured the documentation and README headers to use a sequential H2-based hierarchy for improved accessibility and document flow.

### Fixed
- **Infinite Loop Protection**: Added safety-valve logic to the term resolution engine to prevent infinite loops when traversing large date ranges.
- **Parse Error Resilience**: Hardened the resolution engine to explicitly detect and log `undefined` results from the parser, ensuring `isValid` correctly reflects the parse state and preventing silent UTC fallbacks.
- **Standalone Resilience**: Added optional chaining to all host class references in the term resolver to prevent `TypeError` in standalone contexts.
- **Type-Safe Configuration**: Updated the `Options` type to strictly isolate parse-time-only properties from runtime state.

## [2.2.6] - 2026-04-20

### Added
- **Isomorphic Export Support**: Enhanced the `dist/tempo.bundle.esm.js` to provide both a default export and a named `{ Tempo }` export, ensuring the exact same import syntax works seamlessly across Node.js and browser environments.

### Fixed
- **JSBI Resolution**: Explicitly added `jsbi` to all documentation import maps to resolve bare-specifier errors in `@js-temporal/polyfill` when running in strict browser environments.
- **Documentation Formatting**: Corrected orphaned script blocks and added missing headers to the `Tempo.md` guide for better readability.

## [2.2.5] - 2026-04-20

### Added
- **Cross-Bundle Singleton Stability**: Implemented a symbol-based brand check for `TempoRuntime` to ensure reliable singleton resolution even when multiple versions of the library are loaded.

### Changed
- **Consolidated Internal Storage**: Merged redundant internal term/plugin arrays into a unified, validated `pluginsDb` within `TempoRuntime`.
- **Refined Year Semantics**: Normalized the `year` component in term templates to intelligently distinguish between relative offsets and absolute historical years.

### Fixed
- **Term Resolution Accuracy**: Fixed a sorting bug in the yearly-cycle resolution engine.
- **Documentation Integrity**: Updated architecture and README guides with provided functional, complete importmap examples for browser environments.
- **HTML Standards Compliance**: Wrapped library demonstration and test pages in proper HTML5 skeletons.

## [2.2.4] - 2026-04-19


### Fixed
- **Ticker Redefinition**: Added safety guards to `TickerModule.install` to prevent `TypeError: Cannot redefine property: ticker` when extending an already-initialized or `@Immutable` class.
- **Granular ESM Resolution**: Bundled `tslib` into granular ESM distribution files to resolve browser-side "Failed to resolve module specifier" errors.
- **Documentation Build**: Resolved dead links in `Tempo.md` to ensure successful VitePress production builds.
- **Verification Dashboard**: Synchronized the browser verification dashboard with current build artifacts.

## [2.2.3] - 2026-04-19

### Added
- **Dual-Bundle Strategy**: Modernized the Rollup configuration to produce both a "batteries-included" ESM bundle (`tempo.bundle.esm.js`) and a classic IIFE bundle (`tempo.bundle.js`).
- **Global Export Map**: Added `./bundle` (ESM) and `./global` (IIFE) export mappings to `package.json` for better consumer clarity.
- **Modular Parse Engine**: Successfully decoupled internal parsing logic into `ParseModule`, enabling standalone parsing support and reducing core class complexity.
- **Carousel Accessibility**: Added ARIA roles, labels, and keyboard controls (Arrow keys) to the documentation carousel to improve accessibility.

### Changed
- **Parsing Priority**: Reordered `ParseEngine.result` validation to ensure `isTempo` instances are converted to `Temporal.ZonedDateTime` before primitive-type validation occurs.
- **Registry Error Hints**: Improved module-resolution error messages to suggest cleaner import specifiers (e.g., `#tempo/parse` instead of `#tempo/parsemodule`).
- **HMR Resilience**: Hardened the development-mode registry workaround to prevent "read only property" errors during hot reloads.

### Fixed
- **Version Synchronization**: Unified versions across the monorepo root, `tempo`, and `library` packages.
- **Test Infrastructure**: Updated `vitest.workspace.ts` to use the renamed `temporal-polyfill.ts` setup file.
- **Resource Management**: Fixed interval leaks in the documentation clock during unmounting and visibility changes.
- **Initialization Stability**: Added a sentinel guard and optimized `initPromise` handling to prevent redundant error logging and failed awaits during page visibility transitions.
- **Mutation Engine Hardening**: Corrected preserves `state.options` and the `mutateDepth` recursion guard across all instance creation paths in `MutateModule`.
- **Fluent Chaining Fallbacks**: Hardened `until()` and `since()` calls with explicit host-instance fallbacks to preserve fluent chaining when modules are missing in "catch" mode.

## [2.2.2] - 2026-04-18

### Fixed
- **Plugin Infrastructure Preservation**: Refactored the Rollup configuration to treat all library files as public entry points. This prevents critical utilities (like `defineExtension`) from being tree-shaken during the build process, ensuring that modular plugins can register correctly.
- **API Surface Hardening**: Explicitly exported all registration and utility helpers (`defineModule`, `defineTerm`, etc.) from the main entry point to guarantee their availability for third-party extensions.
- **Documentation Build Stability**: Updated the documentation configuration to utilize pre-compiled `dist/` assets. This resolves runtime `SyntaxError` issues in the browser caused by the presence of modern TC39 decorators in the raw TypeScript source files.
- **Decorator Transpilation**: Refactored utility functions to ensure standard function declarations are used where appropriate, improving the reliability of the transpilation phase.

## [2.1.2] - 2026-04-14

### Added
- **Slick Shorthand Engine**: Finalized and stabilized the high-performance term-shorthand syntax (`#namespace.modifier`). Advanced temporal navigation (e.g. `#qtr.>2q1`) is now fully supported across `.set()`, `.add()`, `.until()`, and `.since()`.
- **Inclusive Range Shifters**: Introduced `>=` and `<=` modifiers to the "Slick" engine. These shifters are strictly inclusive, allowing the current term to be matched if it contains the cursor, providing a deterministic "current or next" resolution pattern.
- **Advanced Terminology Docs**: Published a comprehensive documentation suite (`doc/tempo.advanced_term.html`) detailing lexer constraints, modifier priority, and bifurcated resolution logic for high-performance term cycles.

### Changed
- **Boundary Performance**: Optimized the term resolution loop to utilize `BigInt` nanosecond comparisons for all shifter logic (`>`, `<`, `next`, `prev`), ensuring deterministic behavior across complex fiscal and calendar boundaries.
- **Fail-Fast Constructor**: Hardened the constructor guard to explicitly `throw` an `Error` when term-based mutation keys (`#`) are detected. This replaces the previous silent "invalid instance" return, ensuring developers catch improper syntax immediately.
- **Config Merge Priority**: Refactored `Tempo.#setConfig` to read from persistent storage *before* applying provided options, ensuring that stored values are not unintentionally overwritten by transient defaults.
- **Centralized Patterns**: Integrated the numeric string detection regex into the central `Match` registry in `tempo.default.ts`, removing hardcoded duplicates from the mutation module.

### Fixed
- **Infinite Loop Resolution**: Resolved a critical regression where shorthand modifiers were leaking into range-keys, triggering infinite recursion during term mutation.
- **Hemisphere Inference**: Fixed an initialization bug in `Tempo.init()` where the `sphere` configuration could be incorrectly overwritten or ignored during system-timezone evaluation.
- **Shorthand Lexer Safety**: Hardened the lexer to strictly enforce Range-Key constraints (no reserved characters or leading digits), eliminating collisions between direction modifiers and repeat counts.
- **Zone-Shift Visibility**: Fixed a bug in `.set()` where relative term resolution was ignoring `timeZone` or `calendar` overrides passed in the same mutation object. The engine now shifts context *before* resolving terms.
- **Numeric String Mutations**: Corrected a logic error that misidentified numeric-looking strings (e.g. `"2"`) as term keywords; these are now correctly handled as numeric offsets.
- **Documentation Integrity**: Consolidated fragmented shorthand guides, fixed conflicting CDN links in import-map examples, and corrected the description of `Tempo.init()` to accurately reflect prototype persistence.

## [2.1.1] - 2026-04-12

### Added
- **Constructor Protection**: Implemented a strict guard against passing term-based mutation objects (`#`) directly to the `Tempo` constructor. The engine now explicitly rejects these inputs and directs users to the appropriate `.set()` or `.add()` methods for instance transformation.
- **Unified Term Errors**: Centralized term-resolution error logic into a shared static helper, ensuring consistent "Helpful Hint" messaging for missing plugins across the constructor, mutation engine, and parser.

### Changed
- **Modular Hardening**: Hardened the core engine to strictly enforce `ZonedDateTime` types for all internal states. This prevents "Ghost Date" leaks and silent fallbacks to "Today" when input resolution fails in Core mode.
- **Singular Path Refactor**: Standardized all internal and external paths, directories, and documentation to use the singular `plugin` and `term` form (e.g., `#tempo/plugin`, `@magmacomputing/tempo/term`).
- **Auto-Lazy Precision**: Refined the "Zero-Cost" auto-lazy trigger to only fire for String inputs, ensuring that malformed Objects fail-fast during construction rather than deferring failures.
- **Bulk Extension DX**: Rebuilt `Tempo.extend()` with intelligent rest-parameter support and restored high-level type overloads for improved IDE autocompletion and type-safety.

### Fixed
- **Build Stability**: Resolved type errors in the test suite (specifically `tempo_guard.test.ts`) that were triggering failures during project-referenced builds (`tsc -b`).
- **Sync Normalization**: Fixed a regression where early-resolving inputs (like ISO strings) were bypassing final timezone and calendar normalization.

---

## [2.1.0] - 2026-04-11

### Added
- **TimeZone Offset Support**: Formally verified and documented support for `+HH:MM` and `-HH:MM` ISO-8601 fixed-offset strings in the `timeZone` configuration.
- **Browser Reference Map**: Included a comprehensive [importmap.json](./importmap.json) in the package root to provide a standard mapping for bare module specifiers in browser environments.

### Changed
- **Modular Import Refactor**: Cleaned up the public API by removing the required `plugin/` component from sub-path imports. Plugins are now accessible directly via `@magmacomputing/tempo/ticker`, `@magmacomputing/tempo/duration`, etc.
- **Configuration Mode**: Refactored the `lazy: boolean` option into a more semantic `mode: 'auto' | 'strict' | 'defer'` setting, offering better control over the Zero-Cost Constructor hydration strategy.
- **Export Alignment**: Synchronized `package.json` `exports` with the recommended import-map and documentation snippets to ensure 1:1 parity between Node.js and Browser environments.

### Fixed
- **Documentation Clarity**: Updated all markdown guides (Ticker, Terms, Layout, etc.) to use verified import patterns and corrected various outdated configuration references.

---

## [2.0.1] - 2026-04-03

### Added
- **Ticker Stability Guard**: Implemented a 10,000-iteration safety break in `resolveTermShift` to prevent infinite loops when resolving malformed or non-advancing custom terms.
- **Unified Diagnostics (`Logify`)**: Integrated the `Logify` utility into core internal classes for standardized `debug`, `catch`, and `silent` mode support.

### Changed
- **High-Precision Ticker**: Migrated `TickerPlugin` from `Date.now()` to `instant().epochMilliseconds`, ensuring consistent use of high-precision timing without legacy `Date` object dependencies.
- **Test Performance**: Standardized the test suite on `vitest --pool=forks` to ensure deterministic execution of asynchronous ticker and generator tests.

### Fixed
- **Ticker Async Stability**: Resolved hangs in async generators (`for await...of`) by implementing a `Pledge`-based waiter resolution mechanism that guarantees immediate termination upon `stop()`, `return()`, or `throw()`.
- **Ticker Pulse Synchronization**: Corrected pulse counts for both listeners and generators ($N$ pulses for `limit: N`); ensured `limit: 0` is strictly honored as zero pulses.
- **Ticker Cold-Start**: Fixed an issue where tickers created without an initial callback would remain idle even after listeners were attached; extracted `#bootstrap()` to ensure the scheduler starts correctly on the first listener registration.
- **Parsing Engine Optimization**: Refactored `Tempo.#setPatterns` to optimize pattern generation and avoid redundant global guard rebuilds, significantly improving performance for local/one-off parser instances.
- **Local Layout Stability**: Fixed a bug where custom layout literals in local instances were being destroyed during state synchronization.
- **Registry Protection**: Hardened `registryUpdate` to safely handle non-proxied or missing targets, preventing potential crashes during late-import plugin registration.
- **Term Plugin Resolution**: Corrected package export mappings for term-based plugins in `package.json`, resolving module resolution errors in development and test environments.
- **Numeric Word Parsing**: Fixed regressions in numeric word resolution (e.g., "eleven days hence") by ensuring registry synchronization during late-import scenarios.

---

## [2.0.0] - 2026-03-30

### Added
- **Zero-Cost Constructor**: Optimized the instantiation path to $O(1)$ by deferring all parsing and property registration until the first property access.
- **Generic Lazy Delegator**: Introduced `getLazyDelegator` in `proxy.library.ts` to standardize on-demand property discovery for `fmt` and `term` objects.
- **Improved Immutability**: Enhanced `@Immutable` and `secure()` protections that safely handle lazy evaluation on frozen instances via a defensive prototype-shadowing fallback.
- **Registry Security**: Refactored global registries (FORMAT, NUMBER, TIMEZONE) to use `registryUpdate` with core protection, preventing accidental overrides of built-in tokens.
- **Anchor-Aware Parsing**: Added native support for anchoring relative date strings (e.g., "next Friday") to a specific reference date via the `anchor` option.
- **Timezone Safety**: Implemented graceful fallback to `UTC` (with a warning) for invalid IANA TimeZone IDs when `catch: true` is enabled.

### Changed
- **Internal State Management**: Migrated from a static `#pending` accumulator to an instance-local `#matches` buffer, guaranteeing thread-safety for concurrent `Tempo` instances.
- **Temporal Integration**: Unified the `Temporal` polyfill location to `#library/temporal.polyfill.js`.
- **Typing Refactor**: Relocated `Internal` and `Tempo` namespaces to the top of `tempo.class.ts` for improved IDE type visibility and lint performance.

### Fixed
- Resolved 299/299 regressions in the core and plugin test suites.
- Fixed `TypeError: [object Object] is not extensible` during lazy discovery on secured instances.
- Fixed relative calculation drift where "one Wednesday ago" used the system clock instead of the provided anchor.
- Fixed a race condition in `TickerPlugin` that caused double-clicks on initialization.
