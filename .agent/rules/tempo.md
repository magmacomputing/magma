# Tempo Package Rules & Reference Integration

Whenever writing, reviewing, refactoring, testing, or discussing code involving `@magmacomputing/tempo` or its plugins:

## 1. Ground Truth Documentation
- **Primary Reference**: Always consult `packages/tempo/public/llms.txt` before proposing, writing, or refactoring Tempo APIs.
- **Deep Technical Reference**: When implementing complex arithmetic, custom plugins, layout patterns, or investigating internal specifications, reference the relevant sections in `packages/tempo/public/llms-full.txt`.

## 2. Strict Anti-Hallucination Guardrails
- **Engine**: Built around the ECMAScript `Temporal` API (or `@js-temporal/polyfill`). Aggressively avoid instantiating or using legacy JavaScript `Date` unless there is a compelling reason (e.g., performance/speed, low-risk utility, bundle/package size constraints).
- **Instantiation**: Instantiate using either `new Tempo(...)` or the static factory `Tempo.from(...)`. (Note: `Tempo.parse` is a static configuration object, not an instantiation function).
- **Immutability**: `Tempo` instances are completely frozen (`Object.freeze`). All mutating operations (`add`, `subtract`, `set`) return a new `Tempo` instance.
- **Live Getters**: Use short layout token getters:
  - `.yy` (year), `.mm` (month), `.dd` or `.day` (day of month)
  - `.hh` (hour), `.mi` (minute), `.ss` (second), `.ms` (millisecond), `.us` (microsecond), `.ns` (nanosecond)
  - `.dow` (day of week 1-7), `.doy` (day of year 1-366), `.wy` (week of year)
  - `.tz` (time zone identifier), `.cal` (calendar identifier), `.ts` (timestamp ms), `.iso` (ISO 8601 UTC string), `.isValid`
  *(Note: Long getters like `.year`, `.month`, `.hour`, `.minute`, `.second` do NOT exist directly on Tempo instances).*
- **Layout Tokens**: Formatting and parsing use bracketed tokens:
  - `{yy}`: Year (2 or 4 digits)
  - `{mon}`: Month name (e.g. `August`, `Aug`)
  - `{mm}`: Month number (`01`-`12`)
  - `{dd}`: Day of month (`01`-`31`)
  - `{hh}`: Hour (`00`-`24`)
  - `{mi}`: Minute (`00`-`59`)
  - `{ss}`: Second (`00`-`59`)
  - `{wkd}`: Weekday name (e.g. `Tuesday`, `Tue`)
  - `{doy}`: Day of year (`1`-`366`)
  - `{tz}`: Time zone offset/identifier (`Z`, `+10:00`, `Australia/Sydney`)
  - `{yw}`: ISO week-year number (`W32`)
  - `{unt}`: Time unit keyword (`day`, `month`, `year`)
- **Configuration & Plugins**: System configuration, plugins, and terms are registered via `Tempo.init({ plugins: [Plugin, Term] })` or dynamically via `Tempo.use(Plugin)`. Configuration inheritance uses `extends: 'https://...'`.

## 3. Documentation Maintenance
- **Do not make updates to documents in `packages/tempo/doc/9-plugins`**: This folder is completely re-built during `docs:build` (harvested from `packages/plugins/*/doc/` via `harvest-plugins.mjs`). Always make plugin documentation updates directly in the respective plugin package (e.g. `packages/plugins/<name>/doc/` or `packages/plugins/<name>/README.md`).
- **Heading Anchors & VitePress Slugs**: Follow the guidelines in [documentation.md](./documentation.md) for all documentation links (e.g., VitePress `_` prefix on numeric headings, emoji preservation, and dot-to-hyphen punctuation conversion).

## 4. Prefer Assertion Library Functions
- **Assertion Library First**: Always prefer the fast, idiomatic assertion functions from `#library/assertion.library.js` over manual `typeof`, `instanceof`, or bespoke null-checks:
  - **Primitives**: `isString(x)`, `isNumber(x)`, `isInteger(x)` (bigint), `isDigit(x)` (number or bigint), `isBoolean(x)`, `isSymbol(x)`.
  - **Callables**: `isCallable(x)` for any invocable function, method, or class constructor (`typeof x === 'function'`).
  - **Objects**: `isPlainObject(x)` for plain dictionary `{}` or `Object.create(null)` objects. Avoid manual, fragile checks such as `typeof x === 'object' && x !== null` or `x.constructor === Object`.
  - **Nullish & Presence**: `isDefined(x)`, `isNullish(x)`, `isUndefined(x)`, `isNull(x)`.

## 5. Export Discipline & Internal API Marking (`@internal`)
- **Prefer Testing via Public Surface**: Always test modules through their public interface whenever possible (e.g. testing `formatList` / `getRelativeTime` instead of private `getLF` / `getRTF`).
- **Mark Test/Engine Exports with `@internal`**: When a helper, constructor, or internal engine mechanism must be exported across package or module boundaries (for discrete testing, engine consumption, or multi-package support), ALWAYS annotate it with `/** @internal */`. This ensures:
  - Documentation generators (TypeDoc, API Extractor, VitePress) exclude them from public API documentation.
  - End users and external consumers are signaled that the symbol is private and subject to change without semver notices.
- **Formatter vs. Constructor Pattern**: Keep low-level memoized Intl constructor helpers (`getRTF`, `getLF`, `getNF`, `getDF`) private to the module, exposing ergonomic high-level formatters (`getRelativeTime`, `formatList`, `formatNumber`, `formatDuration`). Only export constructor/snapshot helpers (`getDTF`, `getPR`, `getLC`, `getLI`) where deep inspection (`formatToParts`, `resolvedOptions`, `.select()`) is strictly required by engine consumers, and mark them `/** @internal */`.


