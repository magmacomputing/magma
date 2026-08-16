# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [3.11.1] - 2026-08-06

### Added
- **JSONC Support (`serialize.library`)**: Added standalone, zero-dependency `parseJSONC` and `stripJSONC` utilities to `#library/serialize.library.js` for parsing JSON configuration and manifest files containing single-line (`//`) and multi-line (`/* ... */`) comments and trailing commas.
- **Calendar & Time Math (`calendar.library`)**: Added standalone date/calendar constants and helpers (`ISO_WEEKDAY_NAMES`, `DAY_MAP`, `MONTH_MAP`, `getDaysInMonth`, `getUtcParts`, `DayKey`, `MonthKey`, `IsoWeekdayNames`) in `#library/calendar.library.js`.
- **Recurrence Engine (`recurrence.library`)**: Added standalone zero-dependency RFC 5545 recurrence rule utilities (`isRRuleString`, `isFiniteRRule`, `parseRRule`, `getNextRRuleEpoch`, `expandRRuleEpochs`, `ParsedRRule`) to `#library/recurrence.library.js`.

## [3.10.2] - 2026-07-25

### Fixed
- **Enumify Prototype Integrity**: Hardened the calling context check in the `enumify` constructor to explicitly verify `isFunction(this?.has)`, preventing invalid `Module` objects from corrupting the prototype chain during extension.

## [3.0.0] - 2026-06-07

### Added
- **Native Cryptography & Buffers (`cipher`, `webtoken`, `buffer`)**: Completely overhauled and consolidated the cryptographic primitives and buffer management into tree-shakeable functions (`cipher.library.js`, `webtoken.library.js`, and `buffer.library.js`). Replaced legacy bit-shifting polyfills with blazingly fast native implementations (`TextEncoder`, `TextDecoder`, and native Base64 runtime bindings). Established a strict unidirectional dependency graph (`serialize` ➡️ `buffer` ➡️ `cipher`) and removed redundant exports, providing a highly optimized, zero-dependency native JWS/JWT validation suite across the ecosystem.

## [2.11.0] - 2026-05-25

### Added
- **Intl Utilities**: Added `getNF` (`Intl.NumberFormat`) memoization, along with `formatNumber` and `formatUnit` helper methods to `#library/international.library.js` to natively support plural-aware duration string generation.

## [2.8.0] - 2026-04-30

### Changed
- **Release D: Immutability System Refined**: Continued improvements to the immutability system. The project evaluated mutation-throwing Proxies for all immutable objects, but reverted to using `Object.freeze` for stability and compatibility. See plan for architectural details.

### Migration
- All objects remain frozen with `Object.freeze`. No mutation-throwing Proxies are used for core objects. Identity checks (`===`) behave as before.

---

## [2.0.1] - 2026-04-03

### Changed
- **Memory-Efficient Logging (Pledge)**: Refactored the `Pledge` class to use a single `static #dbg` instance of `Logify`. This significantly reduces object creation overhead while maintaining per-instance configuration isolation via status-based overrides.
- **Consistent Diagnostics**: Standardized `Pledge.reject()` to route through the unified diagnostic system at the `debug` level, ensuring better visibility during development without polluting production logs.
- **Core Utility Renaming**: Renamed the `getProxy` utility to the more semantic `proxify` to better reflect its role in the soft-freeze and lazy-discovery patterns.

---

## [2.0.0] - 2026-03-30

### Added
- Initial monorepo-based release under the `@magmacomputing/library` scope.
- Migration of core utilities (Logify, Pledge, Coercion, etc.) into the shared workspace.
