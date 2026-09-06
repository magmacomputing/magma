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
  - `{tzd}`: Time zone offset/identifier (`Z`, `+10:00`, `Australia/Sydney`)
  - `{yw}`: ISO week-year number (`W32`)
  - `{unt}`: Time unit keyword (`day`, `month`, `year`)
- **Configuration & Plugins**: System configuration, plugins, and terms are registered via `Tempo.init({ plugins: [Plugin, Term] })` or dynamically via `Tempo.use(Plugin)`. Configuration inheritance uses `extends: 'https://...'`.
