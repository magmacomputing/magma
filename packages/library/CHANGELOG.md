# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [4.3.0] - 2026-09-14


### Added
- **Compact Tagged-String Serialization (`serialize.library`)**:
  - Modernized `stringify()` to output compact tagged strings for primitive leaf types by default (`compact: true`), significantly reducing byte overhead for storage, caching, and IPC:
    - BigInt: `"~n" + val.toString()` (e.g. `"~n123"`), saving 8 bytes over legacy envelopes.
    - Date: `"~t" + val.getTime()` using millisecond epochs (e.g. `"~t1704067200000"`), saving 21 bytes (55%) over legacy envelopes and 11 bytes (40%) over ISO 8601 strings while eliminating timezone parsing ambiguity.
    - Undefined: `"~u"`, saving 15 bytes over legacy envelopes while cleanly retaining object property keys.
    - Symbol: `"~y@@(name)"` (global via `Symbol.for`) and `"~y@(name)"` (local via `Symbol()`), saving 10 bytes (40%) over single-key object wrappers.
    - Safe Escaping: Automatically escapes strings starting with `~` with a leading `~` (`"~hello"` -> `"~~hello"`), guaranteeing collision-free, lossless round-tripping.
  - Retained full backward compatibility: passing `{ compact: false }` outputs legacy single-key object envelopes (`{"$BigInt": 123}`, `{"$Date": "..."}`, `{"$Undefined": "void"}`, `{"$Symbol": "..."}`).
  - Updated `objectify()` to transparently deserialize both compact tagged strings and legacy single-key envelopes back into their native JavaScript instances.
  - Streamlined `stringize()` recursion by utilizing a module-scoped `activeCompact` state guarded by a synchronous `try...finally` stack frame, eliminating redundant parameter passing across recursive call sites.
- **Fast Synchronous Keyed Digest (`fastDigest`, `serialize.library`)**:
  - Introduced `fastDigest(str, secret?)` in `#library/serialize.library.js`, providing a high-performance synchronous 64-bit keyed hashing algorithm.
  - Defaults to an internal ephemeral runtime salt (deterministic within a single runtime process, differing across process restarts), producing a 16-character hex digest without asynchronous event-loop delays while preserving a strict unidirectional dependency graph.
- **Integrity Signed Serialization (`StringifyOptions.signed`, `serialize.library`)**:
  - Added `signed?: boolean` and `secret?: string` to `StringifyOptions`, wrapping output strings with an integrity signature prefix (`$sig:<digest>:<payload>`).
  - Added signature verification in `objectify()` with support for a strict `requireSigned?: boolean` policy, rejecting modified or unsigned payloads without deserializing them. Designed as a lightweight integrity check for trusted internal state rather than forgery-resistant protection; callers requiring authenticated or cryptographic payloads should use `signJWS()` and `verifyHmac()`.
- **Standardized Locale & Regional Context Resolver (`getLI`, `ResolvedLocaleInfo`, `LocaleWeekInfo`)**:
  - Introduced `getLI(localeTag?)` in `#library/common/runtime/international.library.js` providing an eager, memoized snapshot resolver for internationalization and regional formatting metadata (`weekInfo`, `firstDay`, `weekend`, `hourCycle`, `hourCycles`, `direction`, `numberingSystem`, `numberingSystems`, `timeZones`, and underlying `locale` instance).
  - Aligned with finalized TC39 Stage 4 `Intl.LocaleInfo` specification (`Intl.Locale.prototype.getWeekInfo()` and `getTimeZones()`), intentionally omitting deprecated `minimalDays`.
  - Implemented deterministic fallback cascades: defaults to `'en-US'` when locale is unspecified or invalid, and falls back to ISO 8601 mathematical calendar invariants (`firstDay: 1` [Monday], `weekend: [6, 7]` [Saturday/Sunday], `hourCycles: ['h23']`, `direction: 'ltr'`, `numberingSystems: ['latn']`, `timeZones: []`) when running in legacy runtimes or environments lacking `Intl.LocaleInfo`.
- **Memoized Locale Constructor & Tag Cleansing (`getLC`, `cleanLocaleTag`, `canonicalLocale`)**:
  - Added `getLC(localeTag?)` and `cleanLocaleTag(tag?)` in `#library/common/runtime/international.library.js` to memoize `new Intl.Locale(...)` instances across the monorepo.
  - Automatically cleanses raw locale strings by trimming whitespace, converting POSIX underscores (`en_US`) to BCP 47 hyphens (`en-US`), stripping POSIX encoding and modifier suffixes (`.UTF-8`, `@euro`), and delegating case canonicalization to `Intl.Locale`.
  - Safely catches syntax errors (e.g. malformed BCP 47 language tags) and returns `undefined` rather than throwing uncaught `RangeError` exceptions.
  - Re-implemented `canonicalLocale(locale)` to delegate to `getLC(locale)?.baseName`, delivering O(1) memoization and seamless POSIX cleansing while returning `undefined` for malformed locale tags instead of throwing `RangeError`.
- **Sub-Nanosecond Primitive Fast-Paths & Type Guards (`assertion.library`)**:
  - Added `isCallable(obj)` in `#library/common/primitives/assertion.library.js` providing a sub-nanosecond function type assertion (`typeof obj === 'function'`) that returns `true` for standard functions, arrow functions, async/generator functions, and constructors matching `typeof "function"`, avoiding slower prototype traversal.
  - Added `isLocale(obj): obj is Intl.Locale` type guard in `assertion.library.js` to safely verify and narrow `Intl.Locale` instances at compile time, eliminating loss of typing and dangerous `(Intl as any).Locale` casts across the codebase.
  - Overhauled core primitive type guards (`isString`, `isBoolean`, `isSymbol`, `isInteger`, `isArray`, `isNull`, `isUndefined`, `isPrimitive`, `isPropertyKey`) with direct sub-nanosecond engine primitives (`typeof`, `Array.isArray`, strict identity `===`), bypassing object-boxing and registry table traversal on hot paths (~10-50x speedup).
- **Type-Safe Capability Probing & Lazy Regional Fallbacks (`hasIntl`, `international.library`)**:
  - Typed `hasIntl(feature?: LooseUnion<keyof typeof Intl>)` to provide full IDE autocompletion for standard `Intl` static members while preserving the ability to probe arbitrary/emerging features without TypeScript compiler errors.
  - Eliminated eager fallback evaluation in `getLI`: regional fallbacks for `firstDay`, `weekend`, and `direction` are evaluated strictly on demand, ensuring zero overhead in modern environments with native `Intl.LocaleInfo` support.
- **Locale Cleansing Across Intl Formatters (`getDTF`, `getRTF`, `getLF`, `getPR`, `getNF`, `getDF`)**:
  - Integrated `cleanLocaleTag` directly into all internal memoized Intl formatter helpers in `#library/common/runtime/international.library.js`.
  - Automatically cleanses raw POSIX locale tags (e.g. `'en_US.UTF-8'` -> `'en-US'`) before instantiation, maximizing cache hit rates and preventing runtime `RangeError` exceptions.
  - Added `language?: string` to `ResolvedLocaleInfo` and `getLI` for comprehensive regional metadata symmetry with `baseName`.
- **Polymorphic LocaleInput & Unified `getXX` Options Signatures (`international.library`)**:
  - Exported `LocaleInput = string | Intl.Locale | undefined`, standardizing parameter acceptance across all international getters (`getLC`, `getLI`, `getDTF`, `getRTF`, `getLF`, `getPR`, `getNF`, `getDF`) and formatters (`canonicalLocale`, `formatNumber`, `formatCurrency`, `formatList`, `getRelativeTime`, `formatDuration`, `formatDayPeriod`, `formatUnit`, `probeMDY`).
  - Standardized `getRTF` and `getLF` to take native options objects (`options?: Intl.RelativeTimeFormatOptions`, `options?: Intl.ListFormatOptions`), establishing 100% signature symmetry across all memoized `get<Constructor>` helpers.
  - Enhanced `serialize()` in `function.library.ts` to serialize `Intl.Locale` via `toString()`, allowing callers to pass strings or `Intl.Locale` instances interchangeably while preserving Unicode extensions and sharing the exact same memoized cache entries.
  - Implemented CLDR 48 regional week fallbacks and runtime `Intl.DateTimeFormat` / `Intl.NumberFormat` metadata resolution when `Intl.LocaleInfo` proposal methods are absent in older execution environments.

### Security
- **Active Deserialization Guardrails & Trust Boundary Hardening (`serialize.library`)**:
  - Added comprehensive `@security` trust-boundary JSDoc warnings across `Registry`, `stringify()`, and `objectify()`, documenting Insecure Deserialization (CWE-502), prototype pollution, and type confusion risks for untrusted external inputs.
  - Hardened `traverse()` with `isSafeKey` property filtering, strictly blocking prototype pollution vectors (`__proto__`, `constructor`, `prototype`).
  - Added `maxDepth` nesting limit (default: 64) in `ObjectifyOptions` to protect against call-stack exhaustion crashes from maliciously nested structures.
  - Introduced `allowClasses?: boolean` (default: true) and `allowedClasses?: string[] | Set<string>` options to restrict or disable dynamic constructor execution via `Reflect.construct`.
  - Added `allowRegExp?: boolean` and `MAX_REGEXP_SOURCE_LENGTH` (512 chars) pattern threshold to mitigate ReDoS payloads.
- **Strict JWS Payload Type Validation (`signJWS`, `webtoken.library`)**:
  - Hardened `signJWS()` to enforce that inputs are non-primitive objects via `isPrimitive` assertion guard.
  - Validates that serialized payloads deserialize to a plain object via `isPlainObject(JSON.parse(serializedPayload))` prior to signing, preventing malformed JWS payloads (e.g. standalone Date objects, primitives, or raw arrays) while preserving support for custom class instances with valid `toJSON()` methods.

### Changed
- **Codebase-Wide Idiomatic Assertion Adoption**:
  - Refactored manual `typeof` and fragile object/array/null checks across `serialize.library`, `webtoken.library`, `cache.class`, `array.library`, `string.library`, `mapper.library`, and `storage.library` to use idiomatic `assertion.library` functions (`isPlainObject`, `isCallable`, `isString`, `isNumber`, `isPrimitive`, `isFunction`, `isSafeKey`, `isInteger`, `isNumeric`).

## [4.2.0] - 2026-09-09

### Added
- **Generic Bounded LRU & TTL Cache Engine (`BoundedCache`)**:
  - Implemented high-performance `BoundedCache<K, V>` in `#library/cache.class.js` supporting configurable capacity constraints (`maxSize`, default 1000) and time-to-live expiration (`ttl`, default 24 hours / `86,400,000 ms`).
  - Added per-entry TTL override support in `set(key, val, ttl?)` with precomputed absolute expiration deadlines (`expiresAt = Date.now() + ttl`).
  - Implemented `O(1)` fast-path expiration checks: eliminates clock reads (`Date.now()`) when keys have no entry-level expiration deadline recorded in `#expires`.
  - Added bulk clear (`clear()`), lazy eviction (`evictExpired()`), iteration (`keys()`, `values()`, `entries()`, `forEach()`, `[Symbol.iterator]()`), and size inspection (`size`).
- **Bounded In-Memory Server Storage (`storage.library`)**:
  - Replaced unbounded `Map` backing `nodeStorage` with `BoundedCache<string, string | undefined>(1000, Infinity)` via `#library/cache.class.js`.
  - Added `ServerStorageOptions` interface and updated `setStorage(key, value, options?)` overload to support optional custom `ttl`.
  - Added `clearStorage()` utility to purge in-memory storage entries across test environments and lifecycle boundaries while preserving tombstone deletion semantics (`undefined` value).
- **Geolocation Caching & Multi-Tenant Partitioning (`mapper.library`)**:
  - Wired `geoLookup()` to automatically cache resolved geographic coordinates in ambient storage with a 24-hour TTL (`86,400,000 ms`).
  - Added `{ refresh: true }` option to `geoLookup()` to bypass cached results and force fresh network resolution.
  - Added `stashGeo(coords, ttl?, keyOrOpts?)`, `clearStashedGeo(keyOrOpts?)`, and `getStashedGeo(keyOrOpts?)` helpers.
  - Implemented multi-tenant and IP cache key partitioning (`resolveCacheKey` scoping to `_magma_geo_:<key>` or `_magma_geo_:<ip>`), preventing tenants from trampling shared geolocation coordinates.

## [4.1.0] - 2026-09-06

### Added
- **Revocable & Ephemeral Proxy Engine (`proxy.library`)**:
  - **Native Revocation Engine**: Upgraded `factory` to support native `Proxy.revocable()` while preserving unwrapping (`sym.$Target`), method binding, and immutability invariants.
  - **`revocable(target, options?)`**: Exported utility returning `{ proxy, revoke }` for on-demand permanent handle deactivation (`TypeError` on post-revocation access).
  - **`ephemeral(target, fn, options?)`**: Scoped execution wrapper that passes a revocable proxy to synchronous or asynchronous callbacks and automatically revokes the proxy in `try...finally`, ensuring scoped proxy-handle revocation and preventing post-execution access through the revoked proxy handle.
- **High-Performance Primitive Fast-Path (`type.library`)**:
  - Added sub-nanosecond `typeof` fast-path for all 7 primitives (`null`, `undefined`, `string`, `number`, `boolean`, `bigint`, `symbol`) in `protoType()`, achieving ~100x speedup by bypassing object boxing and call-frame overhead.
  - Replaced non-idiomatic `switch (true)` with a jump-table `switch (type)` in `getType()` and removed redundant type branches.
  - Documented try-catch safety rationale guarding against throwing dynamic getters, revoked proxies, and cross-realm security errors.

## [4.0.3] - 2026-09-02

### Added & Security
- **Declarative Mutability (`@Mutable`) & Environment Detection (`isTestEnvironment`)**: Added `@Mutable(condition?)` member decorator in `#library/decorator.library.js` to support declarative method/property mutation exemptions on `@Immutable` / `@Securable` classes, alongside an AST-safe `isTestEnvironment()` detection helper in `#library/storage.library.js`.
- **Universal & Server Geolocation Mapping**: Introduced environment-agnostic `geoLookup()` and `resolveGeoCoordinates()` in `#library/common/runtime/mapper.library.js` and server-side `serverGeoLocation()` in `#library/server/mapper.library.js` for resolving browser hardware and IP-based geographic coordinates.

## [4.0.0] - 2026-08-27

### Changed & Fixed
- **Domain-Grouped Module Architecture (`src/common/*`)**: Re-organized internal modules into domain subdirectories (`primitives/`, `runtime/`, `scheduling/`, `temporal/`) for cleaner maintainability, predictable subpath imports (`#library/common/...`), and improved tree-shaking granularity.
- **Clean Compilation & Build Scripts**: Updated package build scripts to enforce `npm run clean && tsc -b`, ensuring `dist` artifacts and declaration files (`.d.ts`) are purged before re-compiling to prevent stale artifact accumulation.

## [3.11.1] - 2026-08-06

### Added
- **Coercion & Conditional Guards (`assertion.library`, `coercion.library`)**: Added `isText` guard for non-empty string checks, `when(val, guard, fallback?)` predicate-based conditional coalescer, and overloaded `asText(val, fallback?, deepClean?)` / `asNumber(val, fallback?)` coercers returning typed values or fallbacks.
- **JSON Utilities (`json.library`)**: Added standalone, zero-dependency `#library/json.library.js` module hosting `parseJSONC`, `stripJSONC`, `cleanify`, `isJSON`, `rawJSON`, and `isRawJSON`. Supports single/multi-line comments, trailing commas, revivers, and options objects (`{ reviver, fallback, safe }`).
- **ECMAScript 2024 `rawJSON` Support (`json.library`)**: Added `rawJSON` and `isRawJSON` helpers to create unquoted verbatim JSON structures with fallback for environments lacking native `JSON.rawJSON`.
- **Assertion Type Guards (`assertion.library`)**: Re-exported `isJSON` and `isRawJSON` for uniform type assertion symmetry.
- **Calendar & Time Math (`calendar.library`)**: Added standalone date/calendar constants and helpers (`ISO_WEEKDAY_NAMES`, `DAY_MAP`, `MONTH_MAP`, `getDaysInMonth`, `getUtcParts`, `DayKey`, `MonthKey`, `IsoWeekdayNames`) in `#library/calendar.library.js`.
- **Recurrence Engine (`recurrence.library`)**: Added standalone zero-dependency RFC 5545 recurrence rule utilities (`isRRuleString`, `isFiniteRRule`, `parseRRule`, `getNextRRuleEpoch`, `expandRRuleEpochs`, `ParsedRRule`) to `#library/recurrence.library.js`.
- **Bounded Request Streaming (`request.library`)**: Added `maxBytes` limit option to `fetchRequest` to protect against memory-exhaustion and unbounded payload DoS by validating `Content-Length` and stream-reading chunks up to the threshold, raising `HttpError(413)` on overflow.

### Changed
- **Hardened `isNumber` Assertion (`assertion.library`)**: Redefined `isNumber(obj)` to `Number.isFinite(obj)`, strictly rejecting `NaN`, `Infinity`, and `-Infinity`.
- **Extended `isEmpty` Verification (`assertion.library`)**: Enhanced `isEmpty` to inspect typed arrays / buffers (`ArrayBuffer.isView`) and invalid `Date` objects, while removing unsafe type casts.

### Removed
- **`isFiniteNumber` (`assertion.library`)**: Removed redundant export in favor of the hardened `isNumber`.

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
