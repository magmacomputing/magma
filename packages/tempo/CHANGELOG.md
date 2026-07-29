
# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [3.10.3] - 2026-07-29

### Performance
- **Zero-Overhead Instantiation (~40–60% Speedup)**: Re-architected `Tempo` instance construction by introducing lazy evaluation for core private properties:
  - **Lazy Instant (`#now`)**: Deferred system clock acquisition (`Temporal.Instant.fromEpochNanoseconds`) so that `instant()` is only fetched when relative duration math or parsing fallbacks require it. Passing explicit date strings or objects skips system clock calls entirely.
  - **Lazy Delegators (`#fmt` & `#term`)**: Deferred creation of Proxy delegator objects until `.fmt` or `.term` properties are explicitly accessed.
  - **`Interval` Acceleration**: `Tempo.Interval` and boundary set operations (`overlaps`, `contains`, `intersection`, `union`) automatically benefit from the reduced instantiation overhead.

## [3.10.2] - 2026-07-25

### Added
- **Silent Config Flag**: Added `silent: false` to the default configuration and `CONFIG` enum. This allows upstream plugins (like `parseAI`) to attempt native parsing without triggering verbose console errors when a parse inevitably fails.

## [3.10.1] - 2026-07-20

### Changed
- **Internal Std Refactor**: Stabilized the `Tempo` core plugin architecture by migrating the built-in standard terms (`qtr`, `season`, `zodiac`, `timeline`) into a dedicated `.std` workspace. Modernized internal build pipelines and decoupled core library from plugin-specific source dependencies.

### Fixed
- **Library Array Grouping**: Expanded `byKey` and `byLkp` utility functions in the shared library to correctly support generic typings for required key arguments via new overload signatures.
- **Library String Padding**: Fixed a bug where `padString` inadvertently used a DEL character (`\u007F`) instead of the correct non-breaking space (`\u00A0`) for right-alignment.
- **Library JWT Security**: Hardened JSDoc warnings in `decodeJWT` to strictly advise developers that it performs unverified claims parsing and is unsuitable for authentication decisions.

## [3.10.0] - 2026-07-19

### Added
- **Format Token Modifiers**: Introduced new capabilities for chained formatting modifiers.
- **Custom Format Tokens**: Completed the Custom Format Tokens implementation, allowing developers to build custom zero-overhead logic evaluators (like native Intl bridges).

### Changed
- **Documentation Architecture**: Architectural deep-dives (Localized Parsing, Slick Mutations, Custom Tokens) have been extracted from the Cookbook into specialized Core Concepts guides (e.g. `tempo.parse.md`, `tempo.mutate.md`, `tempo.format.md`) to provide a punchier onboarding experience.
- **Documentation Alignment**: Cleaned up `tempo.config.md` to remove deprecated module references, perfectly aligning examples with the `tempo-workspace` ecosystem (`FinanceNamespace` and `AstroTerm`).
- **Getter Documentation**: Created `tempo.getters.md` as the definitive, educational conceptual guide for utilizing Tempo's zero-cost evaluation getters.

### Fixed
- **Format modifiers**: Implemented the `:space` modifier for the `{h12}` formatting token. This enables typographically correct spacing before automatically injected meridiems (e.g., `"10:30 a.m."`).

## [3.9.3] - 2026-07-18

### Added
- **Core Concepts Documentation**: Added a new `Mutation & Math` (`tempo.mutate.md`) guide to the Core Concepts section to explicitly document `.add()` and `.set()` immutability, chainability, and the design decision to omit a dedicated `.subtract()` method.

### Changed
- **Documentation Architecture**: Relocated `tempo.registry.md` and `tempo.layout.md` from Core Concepts to Extending Tempo to better reflect their advanced, extensibility-focused usage patterns.
- **README Updates**: Added `AstroPlugin` initialization examples, an "Ultra Lightweight" architecture bullet, and restructured the ecosystem markdown table for cleaner VitePress rendering.

### Fixed
- **Format Leading Zeros**: Fixed a data-corruption bug in `Tempo.format()` where numeric-looking tokens (e.g., `{dd}`, `{mm}`) were implicitly cast to numbers, stripping their leading zeros. The `.format()` method now strictly adheres to a string-only return contract, ensuring zero-padded tokens retain their exact formatting. Removed `NumericPattern` and `BigIntPattern` complexity and simplified internal casting logic.
- **VitePress UI**: Fixed a CSS variable reference in the `CatalogList.vue` component, mapping the install badge background to `--vp-c-danger-1` instead of `--vp-c-brand`.

## [3.9.1] - 2026-07-17

### Added
- **Format Type Validation**: Implemented compile-time IDE validation for Tempo's `.format()` string templates using a recursive template literal type validator (`ValidateFormat`). Augmented this with an extensible `TempoFormatTokens` interface, allowing plugins to register custom tokens (like `{term.quarter}`) without core modifications or type errors.

### Changed
- **Documentation Navigation**: Restructured the VitePress navigation sidebar to include a dedicated **License Key Guide** section, prominently surfacing the guide for premium plugins. 
- **Plugin Harvesting Pipeline**: Refactored the `harvest-plugins.mjs` build script to support modular multi-file plugin documentation. Implemented a robust `_` prefixing strategy (e.g., `.setup` -> `_setup`) and explicit directory collision detection to prevent silent overwrites in the flattened `9-plugins/` VitePress routing namespace.

### Fixed
- **CI Workspace Resolution**: Fixed a critical build failure in the GitHub Actions CI where isolated test runners (`plugins`, `functions`) failed with `Failed to resolve entry for package "@magmacomputing/tempo"`. The CI now explicitly builds the core packages (`npm run build:tempo`) prior to executing downstream workspace tests.
- **CI Security Hardening**: Upgraded `.github/workflows/ci.yml` by explicitly setting `persist-credentials: false` on all checkout steps and implementing strict top-level `permissions` blocks following the principle of least privilege.

## [3.9.0] - 2026-07-16

### Added
- **Era Parsing Engine**: Upgraded the `ParseModule` and Lexer to natively support parsing historical and future era dates with explicit markers (e.g. `200 BC`, `BC 200`, `2026 CE`). Supports both leading and trailing formats and flawlessly converts to the astronomical ISO 8601 year.
- **Era Formatting & Getters**: Added native support for the `{era}` and `{eraYear}` formatting tokens. Introduced `.era` and `.eraYear` getters on the core `Tempo` class for zero-cost access to historical date components.
- **Auto-Meridiem Spacing**: Implemented the `:space` modifier for the `{h12}` formatting token (e.g., `{h12:space:dots}`). This enables typographically correct spacing before automatically injected meridiems (e.g., `"10:30 a.m."`).

### Changed
- **Documentation Alignment**: Cleaned up `tempo.config.md` to remove deprecated module references, perfectly aligning examples with the `tempo-workspace` ecosystem (`FinanceNamespace` and `AstroTerm`).
- **Getter Documentation**: Created `tempo.getters.md` as the definitive, educational conceptual guide for utilizing Tempo's zero-cost evaluation getters.

### Fixed
- **Core Typings**: Resolved `any` leakage in `Tempo` core methods by injecting strict overloads for `until()` and `since()` directly into `tempo.class.ts`, ensuring full IDE type-inference flows through to `.format()`.
- **Documentation Badges**: Standardized the Shields.io badge layout across the monorepo to use `<p>` tags with `inline-block` styling, fixing horizontal alignment issues caused by VitePress CSS overrides and eliminating malformed HTML `<table>` hydration errors.
- **Vue Compiler Hydration**: Fixed a rogue unclosed `</p>` tag in the Ticker plugin documentation that was silently causing downstream Vue SFC parsing errors during VitePress compilation.
- **CLI Pipeline**: Validated the `magma-cli` build pipeline to correctly propagate non-zero exit codes during workspace orchestration operations, preventing silent failures.

## [3.8.0] - 2026-07-11

### Fixed
- **Plugin Argument Parsing**: Hardened `Tempo.extend` parsing logic to ensure single-argument discovery objects are not falsely popped as `options`.
- **Registry Merge Contracts**: Corrected documentation in `tempo.registry.md` to accurately define `registryUpdate()` as additive-only, clarifying that `Tempo.extend()` only shadows explicitly wrapped proxy dictionaries (like `formats`).

### Added
- **Interval Primitive**: Introduced `Interval` as a core primitive in the `@magmacomputing/tempo` package, accessible statically via `Tempo.Interval` or as a decoupled named export. Provides robust `overlaps`, `abuts`, `contains`, `union`, and `intersection` capabilities for native Temporal and Tempo objects.
- **Namespace Architecture (`defineNamespace`)**: Officially launched the new Namespace Plugin architecture. This provides a clean mechanism to attach grouped API surfaces (like `t.finance.*`) onto the core Tempo instance without polluting the global scope or the natural-language parsing engine.
- **Strict Plugin Discrimination**: Core registration utilities (`definePlugin`, `defineTerm`, `defineModule`, `defineNamespace`) now strictly inject a discriminator `type` key (`'plugin' | 'term' | 'module' | 'namespace'`). This ensures internal registries and debugging tools can accurately categorize plugins without relying on loose structural sniffing.
- **Finance Sandbox (`@magmacomputing/tempo-plugin-finance`)**: Introduced the community `finance` package as the official reference implementation for Namespace plugins, complete with best-practice dual-build (ESM/DTS) architectures using `tsup`.

### Changed
- **Build Pipeline Optimization**: Completely removed `esbuild` from the core transpilation pipeline in favor of a pure `tsc` + `Rollup` + `terser` architecture. This eliminates double-transpilation penalties, resulting in a cleaner, more efficient `dist/` build.
- **ESBuild Decorator Mitigations**: Uncovered a significant bug in `esbuild`'s handling of TS 7.0's new, spec-compliant `__esDecorate` down-leveling where transpiled class expressions drop decorator replacements. Maintained the `Object.freeze` constructor workarounds across the ecosystem to ensure full immutability compliance while tracking upstream bundler patches.
- **Documentation Architecture**: Completely overhauled the documentation repository to utilize a strictly-numbered directory structure (`1-getting-started`, `2-core-concepts`, etc.) that mirrors the VitePress UI 1:1, drastically reducing maintenance overhead and eliminating orphaned files.

## [3.7.1] - 2026-07-08

### Fixed
- **License Admin Isolation**: Restructured the commercial licensing JWT payload to isolate administrative privileges (like `tempo-adm`) into a dedicated root-level `role` claim. This prevents internal admin flags from polluting the `scopes` dictionary and erroneously surfacing as "uninstalled premium plugins" in the `Tempo.terms` registry UI.

## [3.7.0] - 2026-07-08

### Added
- **Runtime Versioning Registry**: Introduced a secure, static `Tempo.versions` registry. This provides zero-burden runtime observability of all loaded core modules and community plugins.
- **Automated Plugin Versioning**: Community plugins now automatically inject their version via a custom ESBuild virtual module pipeline, eliminating the need for magic strings. Internal bundled terms (like `QuarterTerm`) seamlessly inherit the core `TEMPO_VERSION`.

### Changed
- **Internal Privacy Modernization**: Refactored internal runtime registries (including `_termMap` and other internal configuration variables) to utilize strict ECMAScript private fields (`#`), ensuring complete architectural security against prototype tampering.

## [3.6.1] - 2026-07-06

### Fixed
- **Constructor Shorthand Resolution**: Fixed a critical `TypeError: invalid duration-like` regression introduced in 3.6.0. The `Tempo` constructor now correctly maps shorthand duration objects (e.g., `{ mi: 5 }`) to their fully-qualified `Temporal` plural equivalents (`{ minutes: 5 }`) before evaluating them against the underlying engine.

## [3.6.0] - 2026-07-05

### Added
- **Shorthand Mutation Keys**: Added native support for Tempo's shorthand format tokens (e.g., `mi`, `ss`, `yy`, `ww`) across both `.add()` and `.set()` mutations, streamlining developer experience and aligning TypeScript definitions with the underlying runtime engine.
- **Shorthand Duration Keys**: Expanded shorthand token support directly into the `DurationModule`. You can now seamlessly use shorthand keys for duration instantiation (`Tempo.duration({ mi: 5 })`), comparisons (`t.until(other, 'mi')`), and strict balancing (`t.until(other).balance({ largestUnit: 'mi' })`), bringing total API consistency across the core library.

### Changed
- **Enum Performance Optimization**: Upgraded internal dictionary traversals across the parsing engine to utilize native, memoized `.keys()` methods provided by the `enumify` registry, eliminating the overhead of standard `Object.keys()` iterations.

### Fixed
- **Prototype Bleed Vulnerability**: Replaced `in` operator checks with secure `.has()` methods across the core engine and duration parser, ensuring strict enum member validation and completely eliminating the risk of arbitrary property or method-based prototype leakage.

## [3.5.3] - 2026-07-05

### Added
- **Flexible Epoch Getters**: Added a static `Tempo.epoch` getter that perfectly mirrors the instance `.epoch` property, enabling direct retrieval of current Unix timestamps (e.g. `Tempo.epoch.ss`).
- **Static Now Modifiers**: Extended the static `Tempo.now(unit)` method to accept optional string units (`'ns'`, `'us'`, `'ms'`, `'ss'`), defaulting to nanosecond precision for strict backwards compatibility.

### Changed
- **DRY Refactoring**: Centralized instance and static `epoch` property calculations to a single internal static helper, ensuring absolute uniformity of mathematical transformations across the core library.

## [3.5.2] - 2026-07-04

### Added
- **Minified Global Bundles**: The build pipeline now natively produces highly optimized, minified IIFE bundles (`*.min.js`) for both Tempo Core and all Community Plugins, significantly reducing payload size for developers using CDN `<script>` tags.
- **Unified Global Namespace**: Re-architected the browser-global export strategy. Both the core library and all `<script>` tag plugins now elegantly attach to a single, collision-free `window.Magma` namespace (e.g., `window.Magma.Tempo` and `window.Magma.plugins.astro`), dramatically improving developer experience and eliminating global variable pollution.
- **Timezone Formatting Modifiers**: The `{tz}` token now natively supports localized timezone name and offset formats via lowercase modifiers (e.g., `{tz:z}`, `{tz:zzzz}`). This allows developers to format timezones exactly as needed without relying on raw ID strings.

### Fixed
- **Module Augmentation Typings**: Hardened the "batteries-included" `tempo.index.ts` entry point by explicitly exporting core module types (e.g. `DurationModule`, `FormatModule`). This forces TypeScript to preserve their module augmentations in the compiled `.d.ts` bundle, guaranteeing that methods like `.until()` and `.since()` correctly appear in IDE autocomplete out-of-the-box.

## [3.5.1] - 2026-06-28

### Fixed
- **Term Registration Resilience**: Hardened `Tempo.extend` with structural deduplication to safely ignore redundant registrations of identical core terms. This prevents edge-case term collisions (e.g., `qtr`) in mixed module-loader environments like Vitest where Node ESM and Vite may evaluate plugins multiple times.

## [3.5.0] - 2026-06-28

### Added
- **Unified Plugin API Barrel**: Introduced `@magmacomputing/tempo/plugin-api` barrel export. This centralizes all plugin-authoring utilities (`defineModule`, `definePlugin`, `defineTerm`, etc.) and internal types into a single, highly discoverable endpoint. This architecture significantly cleans up application-level code and documentation by separating end-user imports from Plugin Developer imports.
- **Strict Peer Dependency Validation**: Tempo Plugins now enforce strict `peerDependencies` on the new `plugin-api` barrel export, ensuring robust resolution for complex environments (like Smart CDNs or Vite) while preventing duplicate instances of internal utility functions.

### Changed
- **Documentation Overhaul**: Updated the installation documentation and template sandboxes (`index.sample.html`) to natively utilize the new `plugin-api` barrel. Refined CDN strategies into two clear paths: "Smart CDNs" (for rapid prototyping) and "Static CDNs" (for production builds using manual import maps).
- **Temporal Native Support Roadmap**: Updated documentation to use evergreen wording for upcoming Node.js native unflagged `Temporal` support, removing explicit version claims (like Node.js 26) to future-proof the guides against shifting ECMAScript release timelines.

## [3.4.0] - 2026-06-26

### Added
- **Dynamic Format Tokens**: You can now define custom format evaluators in the global registry via `registry.tokens`. Custom tokens receive the native `Temporal.ZonedDateTime` instance and a `context` payload containing configuration and chained modifiers, allowing for completely custom parsing or seamless `Intl` delegation.
- **Compound Token Modifiers**: The compound date tokens (`{dmy}`, `{mdy}`, `{ymd}`) now support `:yy` modifiers (e.g., `{dmy:yy}`) to safely truncate their internal year components to 2 digits. 

### Deprecated
- **Legacy 6-Digit Tokens**: The `*6` compound date tokens (e.g. `{dmy6}`, `{mdy6}`) have been effectively superseded by the `:yy` modifier and removed from public documentation. They will remain in the engine indefinitely to guarantee strict backwards compatibility.

## [3.3.2] - 2026-06-22

### Fixed
- **NPM Readme Metadata**: Fixed an issue where the `README.md` was missing from the `files` array in `package.json`, causing the `npmjs.com` registry page to show a blank README tab.

## [3.3.1] - 2026-06-22

### Added
- **Slick Object Mutation API**: The `.set()` mutation engine now supports a "Slick-style" API for relative date/time navigation using object properties. You can now pass snippet-based keys with directional string payloads (e.g., `{ wkd: '>Fri' }` or `{ mm: '>-2' }`) directly to `Tempo.set()`.
- **`ww` Token**: Added native `ww` (weeks) snippet token for relative week-based mutation math (e.g. `{ ww: '>1' }`).
- **Extended Shorthand Modifiers**: Expanded the Slick Regex parser to natively support double-negation synonyms (`>-2` is correctly interpreted as backwards two steps), equality/anchor logic (`>=`, `<=`, `=`), and `+` and `-` as aliases for `>` and `<` within semantic loops (like `wkd`).

### Changed
- **Strict Key Validation**: Hardened the `conform()` layer to throw helpful console errors when users accidentally pass directional strings to standard keys (e.g. `t.set({ month: '>5' })`), politely redirecting them to the correct Slick property (`{ mm: '>5' }`).

## [3.3.0] - 2026-06-21

### Added
- **Localization Modifier Registry**: Modifiers (e.g., "next", "last", "this") can now be localized via the `registry.modifiers` configuration. This allows defining custom words for temporal shifts (e.g., `'>': ['prochain']`) which seamlessly integrate with standard parsing and `#` shorthand syntaxes.

### Changed
- **Unified Registry Architecture**: Moved the top-level `modifiers` configuration key under the `registry` namespace (`registry: { modifiers }`) to maintain architectural consistency with formats and locales. Deep-merging ensures English default keywords remain active alongside custom localized additions.
- **Lexer Token Cleanups**: Stripped hardcoded English keywords out of all internal Match regular expressions (`Match.modifier`, `Match.shorthand`, `Match.slick`), standardizing the engine on the symbolic modifiers (`>`, `<`, `=`, `+`, `-`).

### Fixed
- **Pre-filter Guard Numeric Safety**: Refined the guard-bypass logic to trigger *only* when the input string actually contains a registered modifier keyword, restoring proper strictness and fixing numeric-safety validation gaps for nanosecond epoch inputs.
- **Lazy Evaluation Delegation**: Fixed a regression in format lazy-loading where built-in formats (like `{date}` or `{time}`) were temporarily eclipsed by empty registry instances.
- **Trailing Affix Collisions**: Added explicit safety checks and warnings when a date unit is passed both a leading modifier and a trailing affix (e.g., "next May ago").

## [3.2.3] - 2026-06-20
- **Centralized Configuration**: Introduced `tempo.config.ts` and `tempo.config.js` discovery.
- **Async Bootstrap**: Added `Tempo.bootstrap()` for safe, asynchronous ES Module configuration resolution without breaking the synchronous `Tempo.init()` API.
- **CLI Scaffolding**: Added an `npx @magmacomputing/tempo scaffold:all` CLI tool to easily bootstrap `tempo.config.ts` and HTML sandboxes into projects.

### Changed
- **Zero-Dependency Resolution**: Implemented custom filesystem traversal to ensure robust config discovery without adding external dependencies (e.g., `cosmiconfig`).

## [3.2.2] - 2026-06-18

### Added
- **New Format Tokens**: Added support for 6-digit compact date formatting tokens (`{dmy6}`, `{mdy6}`, `{ymd6}`) and short-year bounds (`{yywy}`, `{yyww}`).

### Changed
- **Intl Configuration**: Completely overhauled the `options.intl` resolution pipeline. Replaced brittle shallow-spread assignment with a robust, recursive `deepMerge` utility to prevent nested configuration clobbering (e.g. `dateTimeFormat` vs `relativeTimeFormat`).
- **ISO Week Renaming**: Renamed the `{ww}` token to `{wy}` to provide better semantic alignment with week-of-year calculations and resolve ambiguity with structural tokens.

### Fixed
- **Configuration Security**: Hardened recursive object manipulation utilities (`deepMerge` and `deepFreeze`) against Prototype Mutation and Prototype Freezing Denial of Service (DoS) vulnerabilities by strictly guarding against `__proto__`, `constructor`, and `prototype` keys during object traversals.

### Removed
- **Redundant Format Tokens**: Removed uppercase format tokens (`{MER}`, `{HH}`, `{DAY}`, `{WW}`, `{MM}`) from the engine to strictly enforce the token modifier pattern (e.g., `{mer:upper}`, `{h24}`, `{dd:ord}`). This eliminates ambiguity and ensures all output routes securely through the `Intl` localization engine.

## [3.2.1] - 2026-06-17

### Added
- **Ordinal Localization Fallback**: Implemented support for non-English `Intl.PluralRules` dictionaries. If an `ordinal` dictionary is provided in the global `locales` registry, Tempo natively evaluates the active plural category (e.g., `'one'`, `'other'`) and appends the correct localized suffix instead of defaulting to English.

### Changed
- **Documentation Restructuring**: Extensively reorganized the `tempo.cookbook.md` to group related functionality (e.g. merging `add()` math, grouping `.set()` boundaries, and isolating Timezones & Locales) for a more intuitive developer reading experience.
- **Clarified Configuration Topology**: Updated `tempo.config.md` to remove outdated top-level keys (`ignore`, `terms`) from the Discovery Contract and explicitly document the availability of the `intl.durationFormat` option.

### Fixed
- **REPL Idempotency Warnings**: Added explicit warnings in the cookbook regarding `Tempo.init()`'s strict idempotency. `Tempo.init()` is designed to abort silently on subsequent calls to protect global state; `Tempo.extend()` must be used to hot-load configuration in continuous REPL environments.
- **Sandbox Alias Collisions**: Hardened the `AliasEngine` collision detection to skip redundant alias registrations across the entire prototype chain, eliminating unnecessary console warnings during sandboxed `Tempo.init` invocations.

## [3.2.0] - 2026-06-16

### 🔒 Security & Licensing
- **Domain-Locked Licensing**: Stabilized the premium plugin licensing engine with a robust domain-locked validation mechanism in the `@core` validator.

### 📚 Documentation & Ecosystem
- **SSR Hydration Fixes**: Fixed `Temporal is not defined` crashes during VitePress SSR builds by enforcing global polyfill initialization in `.vitepress/config.ts`.
- **Navigation Enhancements**: Integrated the new Internationalization (`tempo.locale.md`) guides into the primary VitePress sidebar.
- **MathPlugin Removal**: Removed the heavy `math: true` Markdown plugin from the documentation pipeline and migrated all computational complexity notations (e.g., `O(1)`) to standard inline code to prevent Vue compiler crashes and reduce client bundle sizes.

### Added
- **Multi-lingual Parsing**: The `locale` configuration property now officially accepts an array of strings (`string | string[]`). This enables the `ParseModule` to intelligently extract terminology from multiple languages simultaneously, generating a single, high-performance, deduplicated RegExp engine capable of parsing dates from any of the specified locales interchangeably.
- **O(1) Locale Traceability**: Upgraded the internal dictionary architecture so that `monthMap` and `weekdayMap` store strict objects `{ value, locale }` instead of raw numeric indices. This allows the Normalizer to resolve the winning language of a matched token in pure `O(1)` time without any expensive Regex sub-capture scanning, automatically injecting the originating `locale` into the `t.Parse.result` debugging array!
- **Intl.DateTimeFormatOptions Passthrough**: The `.format()` method now officially supports passing a native `Intl.DateTimeFormatOptions` object. This provides a highly flexible, "humanized" wrapper around the rigid `Temporal` API for complex cultural formatting (e.g. Arabic, Japanese Reiwa).
- **Native Intl Delegation Support**: The formatting engine now explicitly attempts to use the high-performance, memoized `getDTF` instance to support V8's upcoming native `Temporal` support in `Intl.DateTimeFormat`.
- **BigInt Overload for Epoch Nanoseconds**: Implemented a `BigIntPattern` registry and resolution logic to guarantee that the `{nano}` token (epoch nanoseconds) correctly coerces to and returns a precision-preserving `BigInt` instead of a string, as it vastly exceeds `Number.MAX_SAFE_INTEGER`.

### Changed
- **Parser Map Safety**: To support multi-lingual lexing securely, the internal reverse-lookup `localeMap` has been architecturally split into distinct `monthMap` and `weekdayMap` dictionaries. This eliminates the risk of cross-locale abbreviation collisions (e.g., if "mai" is a month in one language but a weekday in another), guaranteeing completely safe parsing determinism.

### Fixed
- **Polyfill RangeError Bypassing**: Implemented a defensive stripping mechanism that intercepts and deletes `timeZone` and `calendar` constraints from the `options` object when falling back to the `ZonedDateTime.prototype.toLocaleString()` polyfill. Additionally, wrapped `withTimeZone` and `withCalendar` shifts in `try/catch` blocks to gracefully bypass invalid configurations and safely fall through to the native Intl fallback without crashing the formatter.
- **Strict Numeric Output Evaluation**: Fixed a bug where `{nano}` was bypassing the precision-preserving `ifNumeric` coercion due to an evaluation gap in the generic numeric-pattern detector.

## [3.1.1] - 2026-06-14

### Added
- **Tokens & Modifiers**: Added `{h12}` for 12-hour clock output with automatic meridiem injection, `{cal}` for calendar system resolution, and the `:raw` modifier for stripping leading zeros and suppressing auto-meridiem.
- **Dynamic Format Options**: The `.format()` method on `Tempo` instances now natively accepts an optional configuration object (e.g., `{ locale: 'fr-FR' }`) as its second argument, aligning its signature with native `Intl` overrides.

### Changed
- **Automatic Meridiem Injection**: Rewritten to derive modifiers directly from the matched `{h12}` or `{HH}` token, properly applying casing and placement.
- **Zero-Padded Documentation**: Refined format token documentation to explicitly refer to fixed-length representations as "Zero-padded" (e.g., "Zero-padded Month"), clarifying the exact behavior of the `:raw` modifier.
- **Strict ISO Vocabulary**: Updated documentation for `{dow}`, `{ww}`, and `{yw}` to explicitly designate them as ISO standards, removing ambiguity with native JavaScript `Date` offsets.

## [3.1.0] - 2026-06-13

### Added
- `registry: { formats, locales }` namespaces to `Tempo.init()` and `Tempo` instance configurations.
- `format: { localize }` namespace to options for toggling localizing formats.
- `Tempo.registry` static accessor for retrieving the active registry configurations.
- **Chained Formatting Modifiers**: Introduced a powerful format modifier engine (e.g. `{mon:locale:upper}`) allowing dynamic casing (`:upper`, `:lower`, `:title`), ordinal suffixes (`:ord`), and deep localization (`:locale`) directly within template strings.
- **Global LOCALE Registry**: Implemented a global `STATE.LOCALE` registry (`Tempo.init({ locale: 'fr-FR', registry: { locales: { ... } } })`) to provide centralized, context-aware translations.
- **Auto-Localization**: Added a `format: { localize: true }` global configuration flag that automatically applies the `:locale` modifier to all formatting tokens behind the scenes.
- **Internationalized Parsing**: Implemented robust localized parsing capabilities natively into Tempo. By opting in via `Tempo.init({ locale: 'fr-FR', parse: { localize: true } })`, Tempo automatically registers localized variants for months, weekdays, and relative terms (yesterday, today, tomorrow) based on your configured `locale`. This engine dynamically strips accents (so "février" and "fevrier" both match safely), ensuring resilient fuzzy-matching for user input out-of-the-box.

### Deprecated
- Top-level `formats` configuration key. Use `registry: { formats: ... }` instead.
- `Tempo.formats` static accessor. Use `Tempo.registry.formats` instead.

### Changed
- **Optimized Intl Instantiation**: Refactored `Intl.DateTimeFormat` and `Intl.RelativeTimeFormat` creation using memoized helpers (`getDTF`, `getRTF`) across the formatting engine, drastically reducing object instantiation overhead during rapid format evaluations.
- **Term Localization Precedence**: Upgraded the Term formatting resolution pipeline to support falling back across a strict precedence: Global Registry > Plugin Bundled Dictionary > term's existing label/value.
- **Plugin Localization Capabilities**: Refactored the `TimeOfDay` plugin (and underlying range resolution logic) to natively bundle and evaluate custom `locale` objects across languages without requiring external overrides in order to demonstrate the new `parse: { localize: true }` capability.

## [3.0.2] - 2026-06-12

### Security
- **Sandbox Isolation (Premium)**: Fixed a validation leakage where premium plugins inside Sandboxes (`Tempo.create()`) inadvertently validated against the global execution environment. Plugin wrappers now dynamically intercept their `this` context via the prototype chain to guarantee strict License Key isolation per Sandbox instance.
- **Per-Scope Expirations (Premium)**: Hardened the commercial validation engine to fully support "One Master Key" architectures. The engine now rapidly evaluates Unix `exp` boundaries at the individual scope level, supplementing the top-level JWT validation.

## [3.0.1] - 2026-06-11

### Changed
- **Node Engine Constraint**: Clarified the Node.js requirement in `package.json` to `>=20.0.0`. While Tempo supports native `Temporal` in Node 22+, due to known instabilities in Node 22.0.x native Temporal, using Node 20+ with a polyfill like `@js-temporal/polyfill` is highly recommended.
- **Browser Compatibility Checks**: Established a fully automated headless browser test suite (`@vitest/browser`) using WebdriverIO to guarantee that Granular ESM bundles resolve dynamically imported relative paths natively. Browser compatibility is now enforced as a `prepublishOnly` lifecycle gate.

### Fixed
- **Term Scope Isolation**: Fixed a bug where the `Tempo.terms` getter would inappropriately sweep all licensed scopes (including modules and extensions like `ticker`) into the Terms array. `Tempo.terms` now strictly returns only the registered, queryable Term plugins, while preserving raw scopes in `Tempo.license.scopes`.
- **Background Validation Leaks**: Resolved asynchronous test leakage in the licensing test suites by ensuring all background cryptographic verification pledges are explicitly awaited during test teardown.
- **TimelineTerm Naming Collision**: Renamed the `TimelineTerm` shorthand key (`per`) and scope (`period`) to `tod` and `timeOfDay` respectively to definitively resolve semantic collisions with the native layout Period alias engine (`{per}`).
- **Registry Type Completeness**: Added `start` and `end` boundary types (as `Tempo` instances) to the `TempoTermRegistry` augmentations for all core terms (`quarter`, `season`, `zodiac`, `timeOfDay`), correctly reflecting the dynamic boundaries injected by the resolver.
- **Zodiac Typings**: Tightened the `yinYang` property typing in the `ZodiacTerm` payload from `string` to a literal union `'Yin' | 'Yang'`.

### Security
- **Immutability Hardening**: Locked down Term plugin registration (`defineTerm`) using native `deepFreeze()` and Term boundary ranges (`defineRange`) using the `secure()` Proxy. This guarantees that internal boundaries and metadata cannot be inadvertently mutated by rogue extensions or user code.

### Standardization
- **Semantic Casing Standardization**: Standardized Term ranges (e.g. `TimelineTerm`, `SeasonTerm`, `QuarterTerm`) to explicitly use CapInit (TitleCase) for their presentational `key` identifiers (e.g., `'Midnight'`, `'Morning'`) while explicitly retaining lowercase representations for internal `scope` and `group` variables.

## [3.0.0] - 2026-06-07

### Changed (Breaking)
- **Ticker Extraction**: The `TickerModule` has been extracted from the core Tempo library into a standalone, licensed premium plugin (`@magmacomputing/tempo-plugin-ticker`). It is no longer bundled with the open-source distribution. 
- **ISO Getter Precision**: The `.iso` property getter has been upgraded from native `Date.toISOString()` to Temporal's `Instant.toString()`. This provides full ISO 8601 nanosecond precision and omits fractional seconds when they evaluate to exactly zero. 
- **Deprecated Boolean Debug Flag**: The `debug` configuration property no longer accepts `boolean` values (`true`/`false`). It has been strictly typed to accept numeric verbosity levels (matching the `LOG` enum) or lowercase string labels (e.g., `'trace'`, `'info'`).
- **Internationalization Naming**: The legacy `intl.relativeTime` configuration object has been removed to align with ECMAScript standards. Please migrate to `intl.relativeTimeFormat`.
- **Legacy Discovery Keys**: Dropped support for the legacy `term` and `plugin` initialization options in favor of strict schema adherence (use `terms` and `plugins` instead for consistency).

### Changed (Architecture)
- **Configuration Parsing Unification**: Refactored the core configuration pipeline by routing `Tempo.init()`, `Tempo.extend()`, and `Tempo.create()` through a unified `[$setDiscovery]` parser. This removes 50 lines of duplicate parsing logic and significantly improves architectural consistency.
- **Feature-Complete Sandboxes**: Sandboxes instantiated via `Tempo.create()` now process their full `options.discovery` payload through the unified parser. This enables sandboxes to safely inherit and isolate localized plugins, custom formats, timeZones, and ignore rules, rather than just `monthDay` inheritance.

### Added
- **Developer Benchmarks**: Introduced the `BenchmarkModule`, a decoupled utility for stress-testing and benchmarking Tempo parsing speeds and memory overhead against custom production datasets in any environment (Node.js or Browser).
- **Compact Date Tokens**: Added `{dmy}`, `{mdy}`, and `{ymd}` to the `FormatModule` for generating 8-digit compact date strings (e.g. `24102026`).
- **Ordinal Format Tokens**: Added uppercase `{DAY}`, `{WW}`, and `{MM}` to the `FormatModule` which generate the ordinal string representation (e.g. `24th`, `1st`, `2nd`).
- **Compact Time Rename**: Renamed the `{hhmiss}` token to `{hms}` in the `FormatModule` for consistency with other token styles.
- **Native Cryptographic Primitives**: Added lightweight, tree-shakeable `cipher` and `webToken` modules to `@magmacomputing/tempo/library` to support native Web Crypto JWS validation across the ecosystem, enabling the removal of bulky third-party dependencies (like `jose`) in down-stream plugins.
### Migration
- If you used `Tempo.ticker()`, you must now install `@magmacomputing/tempo-plugin-ticker` and register it. A migration stub is currently left in place that will throw a runtime error with directions to the Tempo Registry to obtain your free license key.

## [2.11.2] - 2026-05-27

### Changed
- **Module Resolution Stability**: Removed `"development"` conditions from the `packages/tempo/package.json` `imports` map. This prevents downstream test runners (like Vitest) from attempting to resolve internal `#tempo` imports to `.ts` source files when importing the published NPM package, resolving `ERR_MODULE_NOT_FOUND` and `ERR_UNSUPPORTED_NODE_MODULES_TYPE_STRIPPING` errors. Consumers now gracefully fall back to compiled `.js` files in `dist/`.

## [2.11.1] - 2026-05-26

### Added
- **ISO 8601 Convenience Getter**: Added the `.iso` getter to `Tempo` instances to provide a fast, familiar, and UTC-safe mechanism for retrieving the standard ISO 8601 string representation (analogous to `Date.toISOString()`).
- **Type Utilities Export**: Exported `KeyOf`, `ValueOf`, `OwnOf`, and `EntryOf` type utilities in `library.index.ts` to provide cleaner TypeScript typing for downstream consumers utilizing `enumify`.

### Fixed
- **Build Pipeline Path Resolution**: Fixed a critical path-resolution bug in the `resolve-types.ts` script where `library.index.d.ts` was incorrectly identified as being inside the `lib/` directory. This ensures proper `.d.ts` generation and restores JSDoc/typings for downstream consumers.
- **Documentation Domains**: Updated all premium extension documentation (`tempo.license.md`) and internal plugins to use the centralized `registry.magmacomputing.com.au` domain for license verification and the UI portal.

## [2.11.0] - 2026-05-25

### Added
- **Duration Mathematics**: Introduced the `.balance()` method to `Tempo.Duration` objects to allow intelligent mathematical roll-up of duration units (e.g., converting 365 days into 1 year), with support for both strict calendar math and nominal overrides (`{ nominal: true }`).
- **Duration Formatting**: Introduced the `.format()` method to `Tempo.Duration` objects. This uses a shared, memoized `#library` implementation of `Intl.NumberFormat` to generate highly localized, plural-aware duration strings with excellent performance and robust cross-environment execution (no `navigator` dependencies).
- **Cascading Configuration**: Added `numberFormat` to the `IntlOptions` interface, allowing developers to set global formatting defaults (like `unitDisplay: 'short'`) via `Tempo.init()` that seamlessly cascade down to all `.format()` calls.

### Fixed
- **Parsing**: Resolved an engine edge-case where combining relative weekday modifiers with string-based period aliases (e.g., `<3 Wed afternoon`) would cause the parser to prematurely abort the relative offset, instead applying the period to the current system date.
  
## [2.10.1] - 2026-05-22

### Added
- **Build Pipeline Visuals**: Upgraded the `rollup.config.js` build output with high-visibility, color-coded ANSI banners to clearly distinguish between `PREMIUM` and `COMMUNITY` build targets.

### Changed
- **Discovery Architecture**: Deprecated and purged the legacy `__TEMPO_DISCOVERY__` global discovery approach in favor of a strict `TEMPO_LICENSE_KEY` and Symbol-based registry pipeline.
- **Security Hardening**: Redacted the raw JWT key from the public `Tempo.license` snapshot to prevent accidental exposure of credentials in debug logs.

### Fixed
- **License Snapshot Resilience**: Implemented a safety guard in `Tempo.license` to normalize `raw.scopes` before iteration, eliminating potential runtime exceptions when scopes are absent.
- **Cross-Platform Build Stability**: Updated the `resolve-types.ts` build script to utilize Node's native `fileURLToPath` for deterministic `__dirname` resolution across all operating systems.
- **Local Dev Extensibility**: Allowed `LIC_SRC_DIR` to be overridden via environment variables in the type resolution script, supporting customized development workflows while maintaining strict production fallbacks.
  
## [2.10.0] - 2026-05-11

### Added
- **Licensing Architecture**: Implemented a standalone "No-Op" licensing engine (`support.license.ts`) in the public core. This ensures the repository is 100% buildable and testable by the community without private dependencies.
- **Automatic Premium Injection**: Optimized the build pipeline (Rollup/Vitest) to automatically detect and inject the proprietary licensing engine from a side-by-side repository during official builds.
- **Portable Encoding**: Migrated `base64Encode` to the shared library for universal, environment-agnostic token handling.

### Changed
- **Hardened Licensing Resolution**: Updated the term resolution pipeline with a dual-identity race-condition guard (JTI + Key) and a late-binding resolution guard to securely handle `Pending` to `Revoked` state transitions.
- **Decoupled CI Resolution**: Eliminated the need for private registries or stubs in GitHub Actions by utilizing the internal No-Op engine for standard test runs.
- **Term Collision Enforcement**: Term plugin registration now throws a fatal error on naming collisions (key/scope) to prevent silent configuration failures.

## [2.9.3] - 2026-05-11

### Added
- **Generalized Fractional Resolution**: Numeric inputs (`Number`, `BigInt`) now support fractional components across all units (`ss`, `ms`, `us`, `ns`) with nanosecond precision. The resolution engine now utilizes absolute BigInt math to ensure deterministic results regardless of sign.
- **Hardened AliasContext Interface**: Introduced a strongly-typed, chainable context (`this`) for functional aliases, providing API parity with the `Tempo` class. This includes full support for `yy`, `mm`, `dd`, `hh`, `mi`, `ss`, `tz`, `cal`, and `config` properties.
- **ISOString Branded Type**: Added a branded `ISOString` type for clearer representation of `ZonedDateTime` ISO-8601 strings, improving type safety across the library's internal and public APIs.
- **Shorter Epoch Support**: Numeric strings with 9-10 digits are now correctly classified as Epoch timestamps when a non-default unit (e.g., `'ss'`) is configured. This enables parsing of second-based timestamps like `946684800` without requiring manual padding.

### Changed
- **Dependency Refresh**: Updated Temporal Polyfill to 0.2.1, ensuring a more stable and secure development environment.
- **Unit Preference Enforcement**: Consolidated numeric resolution logic in `engine.composer.ts` to strictly enforce configured `unit` preferences ('ss', 'ms', 'us', 'ns') for both `Number` and `BigInt` types.
- **Lexer Prefix Reliability**: Optimized and hardened the `prefix()` helper in `engine.lexer.ts` to provide faster, type-safe string transformations for weekday and month formatting.

### Fixed
- **State Mutation Safety**: Refactored the internal parsing engine to eliminate side-effect mutations on the global configuration state during resolution. This ensures that `parse()` results are deterministic and do not leak transient metadata into subsequent calls.
- **Priority-Based Configuration**: Hardened the configuration resolution in `engine.composer.ts` to strictly prioritize explicit caller overrides (e.g., `timeZone`, `calendar`) over metadata derived from input objects, ensuring that methods like `.toDateTime(zdt, { timeZone: 'UTC' })` always honor the provided override.
- **Registry Initialization Resilience**: Updated the `onRegistryReset` hook in `tempo.class.ts` to automatically re-hydrate computed snippets (e.g., `tomorrow`, `noon`) after a registry reset. This resolves matching failures in testing environments where registries are cleared between runs.
- **withState Wrapper Hardening**: Fixed an unwrapping bug in the `withState` utility that caused standalone `parse()` calls to return internal `TypeValue` wrappers instead of raw `ZonedDateTime` results when passed an explicit state object.
- **Numeric Validation Ordering**: Reordered the resolution logic in `engine.composer.ts` to ensure `NaN` and non-finite numbers are caught before type conversion, preventing native `RangeError` crashes.
- **Parser Epoch Short-circuit**: Refined the epoch detection in `module.parse.ts` to correctly identify all fractional numbers as timestamps, bypassing the layout engine and preventing "Unknown Term" resolution errors.
- **Functional Alias Property Parity**: Added missing `year`, `month`, and `day` aliases to the `AliasContext` (mapped to `yy`, `mm`, `dd`) to ensure compatibility with standard `Tempo` getters.
- **Timestamp Configuration Persistence**: Fixed configuration propagation by ensuring `timeStamp` is explicitly handled within `extendState` in `support.init.ts` for consistent state persistence across Tempo instances.
- **Epoch Parsing Precedence**: Implemented a short-circuit in `parseLayout` to prioritize epoch interpretation for large numeric inputs, preventing their misidentification as layout patterns.
- **Normalizer Memory Management**: Resolved state leakage in `engine.normalizer.ts` by ensuring alias keys are correctly cleaned up in the `resolvingKeys` set via `try/finally` blocks.
- **ZonedDateTime Mutation Order**: Fixed `ZonedDateTime` mutation ordering in `module.parse.ts` to ensure time zone and calendar application precedes wall-clock property updates, preventing incorrect wall-clock values during zone shifts.
- **Type Safety Hardening**: Eliminated DOM interface collisions in `tempo.type.ts` by correcting `PluginContainer` inheritance, improving type safety and preventing namespace pollution.
- **Documentation Build Stability**: Stabilized the documentation build environment by resolving peer dependency resolution errors between VitePress and `markdown-it-mathjax3`.

## [2.9.2] - 2026-05-08

### Added
- **Resilient ID Extraction**: Unified `timeZoneId` and `calendarId` extraction into a single spec-resilient helper `getTemporalIds`. This ensures 100% compatibility across both spec-final and Node.js V8 harmony environments by resolving nested property drift (`timeZone.id` vs `timeZoneId`).
- **Identity-Based Layout Resolution**: Hardened `resolveLayoutClassificationOrder` to support identity-based symbol lookups. This ensures that tokens without descriptions or aliases (such as raw symbols) can be correctly prioritized in preferred layout ordering.
- **Named Capture for Separators**: Updated the default `{sep}` snippet to use a named capture group `(?<sep>...)`, improving the inspectability of generated regex patterns.

### Changed
- **Non-Recursive Bootstrap**: Hardened the `toNow()` lifecycle and `today` alias to safely access local configuration without triggering circular parsing dependencies.
- **Modular Decompression**: Removed the redundant `parse.layout.ts` re-export module and consolidated all layout resolution logic into `engine.layout.ts`. Updated internal Specifiers and test-aliases to point to the new canonical home.
- **Node.js Harmony Support**: Updated documentation to highlight native `Temporal` support in Node.js 20+ via the `--harmony-temporal` flag, reducing the need for external polyfills in modern server-side environments.

### Fixed
- **MasterGuard Validation**: Improved the `MasterGuard` scanner to correctly identify and reject whitespace-only strings by implementing explicit match tracking.
- **Symbol Mapping Safety**: Fixed a potential `TypeError` in `AliasEngine` when mapping Symbols without descriptions by hardening the `wordsList` creation logic.
- **Utility Security Hardening**: Refactored the `create<T>` and `setPatterns` utilities with robust prototype-shadowing guards. These improvements prevent `TypeError` crashes when interacting with null-prototype objects and guarantee `PatternCompiler` state isolation across concurrent Tempo instances.
- **PatternCompiler Isolation**: Refactored `Tempo.regexp()` to guarantee `PatternCompiler` isolation per-state, preventing unintended cache leakage across inherited registries.
- **UI Accessibility**: Updated documentation button styles to use theme variables, ensuring WCAG 2.1 contrast compliance (4.5:1) for all brand elements.
- **RegExp Preview Accuracy**: Corrected the documentation example for `Tempo.regexp()` to accurately reflect the anchored outer capture group and unique named snippet expansions (`sep`, `sep_1`) produced by the engine.

## [2.9.1] - 2026-05-07

### Fixed
- **Support Utility Consolidation**: Completed the rename and migration of internal support utilities to the `@packages/tempo/src/support/` directory.
- **Pattern Compiler isolated test state**: Fixed state-leakage in `pattern_compiler_optimization.test.ts` by implementing `TempoRuntime.createScoped()` and `init({}, false)` within `beforeEach` hooks.

## [2.9.0] - 2026-05-06
  
### Added
- **Centralized Alias Architecture**: Finalized the migration to a unified `AliasEngine`. All event and period aliases are now managed through a centralized registry, providing a single source of truth across global and local contexts.
- **Rich Alias Results**: Alias resolution now returns a structured `AliasResult` object containing exhaustive metadata, including the source (global/local), type (Event/Period), and specific resolution flags.
- **Hardened Clock Snapping**: Standardized the resolution path for clock-like aliases (e.g. `8:00`). The engine now ensures absolute sub-second precision clearing (milliseconds, microseconds, and nanoseconds) when snapping to a time-string alias.
- **Optimized Lifecycle Monitoring**: Implemented a version counter in the `AliasEngine`. Mutation operations now trigger a version increment, allowing `Tempo` instances to efficiently detect registry changes and rebuild internal regex patterns without expensive deep-cloning.
  
### Changed
- **Parser Context Consolidation**: Extracted the "host" facade construction from the main parsing loop into a dedicated `getResolutionContext` helper, improving maintainability and reducing Parser complexity.
- **Decoupled Term Registration**: Refactored `Tempo.extend` and term-based alias registration to bypass legacy raw registries, while maintaining backward compatibility via a mirrored metadata view.
  
### Fixed
- **Documentation Server Stability**: Resolved VitePress 404 errors by correcting the `srcDir` configuration and implemented `srcExclude` to prevent build failures from dead links in non-documentation folders.
  

## [2.8.0] - 2026-04-30

### Changed
- **Release D: Immutability System Refined**: Continued improvements to the immutability system. The project evaluated mutation-throwing Proxies for all immutable objects, but reverted to using `Object.freeze` for stability and compatibility. See plan for architectural details.

### Migration
- All objects remain frozen with `Object.freeze`. No mutation-throwing Proxies are used for core objects. Identity checks (`===`) behave as before.

### Added
- **Parse Planner Configuration**: Introduced `planner.layoutOrder` for parsing precedence and `planner.preFilter` as a replacement for the legacy `parsePrefilter` option.

### Fixed
- **MonthDay Auto-Detection**: Boolean shortcuts and manual overrides for the `monthDay` option are properly tracked and respected over heuristics.
- **Sandbox Factory Stability**: Resolved an issue where sandbox-specific period alias collisions were ignored. Added collision warnings.
- **Symbol Discovery Isolation**: Fixed the options resolution flow so global custom formats from discovery symbols merge correctly without getting wiped.

---

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
- **Layout Order Resolver Module**: Extracted layout-ordering decision logic from the Tempo class into a dedicated `engine.layout` module (`src/engine/engine.layout.ts`). This module provides deterministic functions for resolving parse layout order based on locale preference and maintains existing pair-swap semantics.
- **Layout Controller Framework**: Implemented a minimal controller-map infrastructure (`LayoutController` type, `createLayoutController`, `resolveLayoutClassificationOrder`) to enable future input-class pre-filtering and custom layout ordering without structural refactors. The framework currently has a single default classification that mirrors existing behavior.
- **Debug Layout Order Visibility**: Added optional debug output in `Tempo.#swapLayout` to emit the resolved layout order for diagnostics (when `debug: 5`).

### Changed
- **Internal Layout Resolution**: Refactored `Tempo.#swapLayout` to delegate ordering to the external resolver, improving separation of concerns and testability.
- **Alias Precedence**: User-defined `event` and `period` aliases now take precedence over built-in aliases when both patterns match.

### Notes
- **API Impact**: No public API changes; layout-ordering behavior is byte-for-byte equivalent to prior releases.
- **Performance**: Layout resolution is still $O(n)$ where $n$ is the number of layout entries; controller infrastructure is optimized for future per-input classification without per-call overhead.
- **Guidance**: If needed, rename custom aliases to avoid overlap or remove the conflicting custom alias.

## [2.4.0] - (Skipped)

_Version 2.4.0 was not released; the project merged new functionality from 2.4.0 into 2.5.0._

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
- **Plugin Infrastructure Preservation**: Refactored the Rollup configuration to treat all library files as public entry points. This prevents critical utilities (like `definePlugin`) from being tree-shaken during the build process, ensuring that modular plugins can register correctly.
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
