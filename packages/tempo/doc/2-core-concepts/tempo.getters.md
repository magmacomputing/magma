# 🧲 Core Getters

The `Tempo` class provides an extensive array of zero-cost getters that allow you to seamlessly read properties from the underlying `Temporal` instance. 

> [!TIP]
> **Zero-Cost Lazy Evaluation**  
> Tempo uses a sophisticated proxy-based lazy-evaluation pattern. Accessing a getter (like `t.yy`) resolves the property on demand, and then overwrites the getter with a static literal. This means the first access is $O(1)$ and every subsequent access is raw property access ($O(0)$ cost).

## ⚡ Native Temporal Gateway

| Getter | Type | Description | Example |
| :--- | :--- | :--- | :--- |
| `.zdt` | `Temporal.ZonedDateTime` | Direct zero-overhead access to the underlying native Temporal instance | `t.zdt.daysInMonth` |

The `.zdt` getter provides direct, zero-overhead access to the underlying `Temporal.ZonedDateTime` instance, enabling native Temporal inspections and properties without method call ceremony:

```typescript
const t = new Tempo('2026-10-24T15:30:00[Australia/Sydney]');

console.log(t.zdt.daysInMonth);  // 31
console.log(t.zdt.inLeapYear);   // false
console.log(t.zdt.offset);       // '+11:00'
console.log(t.zdt.hoursInDay);   // 24
console.log(t.zdt.monthCode);    // 'M10'
```

## 📅 Date Properties

| Getter | Type | Description | Example |
| :--- | :--- | :--- | :--- |
| `.yy` | `number` | 4-digit Year | `2026` |
| `.mm` | `number` | Month number (1 = Jan, 12 = Dec) | `10` |
| `.dd` | `number` | Day of the month (1-31) | `24` |
| `.dim` | `number` | Total days in the month (28-31; convenience alias for `.zdt.daysInMonth`) | `31` |
| `.jj` | `number` | Astronomical Julian Day number since 4713 BC | `2461331` |
| `.era` | `string` | Localized era string | `'ce'`, `'bce'`, `'ad'`, `'bc'` |
| `.eon` | `number` | Positive integer year within the current `.era` | `2026`, `4` |

> [!NOTE]
> **Days in Month (`.dim`) vs. Native `.zdt.daysInMonth`**  
> While `.dim` is provided as a zero-cost convenience property returning the number of days in the current month (`28`–`31`, matching format token `{dim}` and PHP `t`), `t.zdt.daysInMonth` is the native standard property directly available on the underlying `Temporal.ZonedDateTime` instance.

> [!NOTE]
> **Astronomical Julian Day (`.jj`) vs. Day of Year (`.doy`)**  
> `.jj` provides the true astronomical Julian Day Number (a continuous 7-digit count of days elapsed since January 1, 4713 BC, e.g. `2461331` for 2026-10-17), matching Oracle `J` and token `{jj}`. If you need the calendar day within the current year (`1`–`366`), use `.doy` (or format token `{doy}` / `{dd:year}`).

## ⏱️ Time Properties

| Getter | Type | Description | Example |
| :--- | :--- | :--- | :--- |
| `.hh` | `number` | Hour of the day (0-23) | `15` |
| `.mi` | `number` | Minutes of the hour (0-59) | `30` |
| `.ss` | `number` | Seconds of the minute (0-59) | `45` |
| `.ms` | `number` | Milliseconds of the second (0-999) | `123` |
| `.us` | `number` | Microseconds of the millisecond (0-999) | `456` |
| `.ns` | `number` | Nanoseconds of the microsecond (0-999) | `789` |
| `.ff` | `number` | Fractional seconds representation | `0.123456789` |

## 🗓️ ISO Week & Day Alignments

| Getter | Type | Description | Example |
| :--- | :--- | :--- | :--- |
| `.yow` | `number` | 4-digit ISO week-numbering year | `2026` |
| `.woy` | `number` | ISO week number of the year (1-53; canonical, supersedes legacy `.ww`) | `43` |
| `.dow` | `number` | ISO weekday number (1 = Mon, 7 = Sun) | `6` |
| `.doy` | `number` | Day of the year (1-366) | `297` |

> [!NOTE]
> **Canonical Getters & v5 Deprecation Path**  
> To establish a clean, predictable, and collision-free API surface across getters and format tokens:
> * **`.woy`** is canonical for ISO week of the year. The legacy `.ww` getter is marked `@deprecated` and will transition in v5.0.0 to calendar week count (weeks starting Jan 1st).
> * **`.eon`** is canonical for the positive integer year within the era (supersedes `@deprecated` `.eraYear`).
> * **`.dd`** is canonical for the day of the month (supersedes `@deprecated` `.day`).

## 🔤 Named String Representations

| Getter | Type | Description | Example |
| :--- | :--- | :--- | :--- |
| `.mon` | `string` | Full English month name | `'October'` |
| `.mmm` | `string` | Short English month name | `'Oct'` |
| `.wkd` | `string` | Full English weekday name | `'Saturday'` |
| `.www` | `string` | Short English weekday name | `'Sat'` |

## 🌍 Regional, Timezone & System Properties

| Getter | Type | Description | Example |
| :--- | :--- | :--- | :--- |
| `.tz` | `string` | IANA Time Zone ID | `'Australia/Sydney'` |
| `.cal` | `string` | Temporal Calendar ID | `'iso8601'` |
| `.locale` | `string \| string[]` | Resolved BCP 47 locale | `'en-AU'`, `['en-US', 'fr-FR']` |
| `.intl` | `TempoIntlNamespace` | Structured internationalization namespace (`.info` for cultural metadata, `.locale` for native `Intl.Locale`) | `t.intl.info.firstDay`, `t.intl.locale` |
| `.geo` | `object \| undefined` | Resolved geographic coordinates (`latitude`, `longitude`, `elevation`, `sphere`) | `{ latitude: -33.8688, longitude: 151.2093 }` |
| `.sphere` | `'north' \| 'south' \| undefined` | Resolved hemisphere configuration | `'south'` |
| `.ts` | `number \| bigint` | Unix timestamp (`number` for `ss`/`ms`/`us`, `bigint` for `ns`) | `1792843200000` |
| `.nano` | `bigint` | Nanoseconds since Unix epoch | `1792843200000000000n` |
| `.iso` | `string` | Standard ISO 8601 string (RFC 3339) in UTC | `'2026-10-24T04:30:00Z'` |
| `.isValid`| `boolean`| `true` if the underlying date-time is valid | `true` |

---

## 🎛️ Metadata Properties

Beyond date-time properties, the `Tempo` class also provides read-only getters into its active state and configuration.

| Getter | Type | Description |
| :--- | :--- | :--- |
| `.config` | `object` | Returns a proxy to the active configuration, including all resolved inheritance and local overrides. |
| `.terms` | `object` | Returns a dictionary of all registered `TermPlugins` and their available `ranges`. |
| `.ranges` | `object` | Returns a dictionary of the *currently active* range key for every registered term (e.g., `{ 'season': 'summer' }`). |
| `.parse` | `object` | Returns a shadowed view of the internal parsing state (including `anchor`, `mode`, and the AST-like `match` output). |
