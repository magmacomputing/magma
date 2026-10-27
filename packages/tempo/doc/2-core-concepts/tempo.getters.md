# 🧲 Core Getters

The `Tempo` class provides an extensive array of zero-cost getters that allow you to seamlessly read properties from the underlying `Temporal` instance. 

> [!TIP]
> **Zero-Cost Lazy Evaluation**  
> Tempo uses a sophisticated proxy-based lazy-evaluation pattern. Accessing a getter (like `t.yy`) resolves the property on demand, and then overwrites the getter with a static literal. This means the first access is $O(1)$ and every subsequent access is raw property access ($O(0)$ cost).

## ⚡ Native Temporal Gateway (`.zdt`)

The **`.zdt`** getter provides direct, zero-overhead access to the underlying native `Temporal.ZonedDateTime` instance. All tables below cross-reference Tempo's ergonomic shorthand getters with their underlying native `zdt.*` properties or namespace sources:

| Getter | Type | Description | Example |
| :--- | :--- | :--- | :--- |
| **`.zdt`** | `Temporal.ZonedDateTime` | Direct zero-overhead access to the underlying native Temporal instance | `t.zdt.inLeapYear` |

## 📅 Date Properties

| Getter / Temporal | Type | Description | Example |
| :--- | :--- | :--- | :--- |
| **`.yy`**<br>`zdt.year` | `number` | 4-digit Year | `2026` |
| **`.mm`**<br>`zdt.month` | `number` | Month number (1 = Jan, 12 = Dec) | `10` |
| **`.dd`**<br>`zdt.day` | `number` | Day of the month (1–31) | `24` |
| **`.dim`**<br>`zdt.daysInMonth` | `number` | Total days in the month (28–31) | `31` |
| **`.era`**<br>`zdt.era` | `string` | Localized era string | `'ce'`, `'bce'`, `'ad'`, `'bc'` |
| **`.eon`**<br>`zdt.eraYear` | `number` | Positive integer year within the current `.era` <sup>[[1]](#fn-eon)</sup> | `2026`, `4` |
| **`.jj`** | `number` | Astronomical Julian Day number since 4713 BC <sup>[[2]](#fn-jj)</sup> | `2461331` |

<small>

1. <span id="fn-eon">**Era Year (`.eon`) vs. Calendar Year (`.yy`)**: While `.yy` returns the signed astronomical year (e.g. `2026` or `-3`), `.eon` returns the positive integer year within the active `.era` (e.g. `2026` in CE, `4` in 4 BCE, or `4` in Reiwa 4 when using the Japanese calendar).</span>
2. <span id="fn-jj">**Astronomical Julian Day (`.jj`) vs. Day of Year (`.doy`)**: `.jj` provides the true astronomical Julian Day Number (an integer day count elapsed since noon UT on January 1, 4713 BC in the proleptic Julian calendar, e.g. `2461331` for 2026-10-17). If you need the calendar day within the current year (`1`–`366`), use `.doy`.</span>

</small>

## ⏱️ Time Properties

| Getter / Temporal | Type | Description | Example |
| :--- | :--- | :--- | :--- |
| **`.hh`**<br>`zdt.hour` | `number` | Hour of the day (0–23) | `15` |
| **`.mi`**<br>`zdt.minute` | `number` | Minutes of the hour (0–59) | `30` |
| **`.ss`**<br>`zdt.second` | `number` | Seconds of the minute (0–59) | `45` |
| **`.ms`**<br>`zdt.millisecond` | `number` | Milliseconds of the second (0–999) | `123` |
| **`.us`**<br>`zdt.microsecond` | `number` | Microseconds of the millisecond (0–999) | `456` |
| **`.ns`**<br>`zdt.nanosecond` | `number` | Nanoseconds of the microsecond (0–999) | `789` |
| **`.ff`** | `number` | Fractional seconds representation | `0.123456789` |

## 🗓️ ISO Week & Day Alignments

| Getter / Temporal | Type | Description | Example |
| :--- | :--- | :--- | :--- |
| **`.yow`**<br>`zdt.yearOfWeek` | `number` | 4-digit ISO week-numbering year | `2026` |
| **`.woy`**<br>`zdt.weekOfYear` | `number` | ISO week number of the year (1–53; canonical, supersedes legacy `.ww`) | `43` |
| **`.dow`**<br>`zdt.dayOfWeek` | `number` | ISO weekday number (1 = Mon, 7 = Sun) | `6` |
| **`.doy`**<br>`zdt.dayOfYear` | `number` | Day of the year (1–366) | `297` |

## 🔤 Named String Representations

| Getter / Temporal | Type | Description | Example |
| :--- | :--- | :--- | :--- |
| **`.mon`**<br>`zdt.toLocaleString('en', { month: 'long' })` | `string` | Full English month name | `'October'` |
| **`.mmm`**<br>`zdt.toLocaleString('en', { month: 'short' })` | `string` | Short English month name | `'Oct'` |
| **`.wkd`**<br>`zdt.toLocaleString('en', { weekday: 'long' })` | `string` | Full English weekday name | `'Saturday'` |
| **`.www`**<br>`zdt.toLocaleString('en', { weekday: 'short' })` | `string` | Short English weekday name | `'Sat'` |

## 🌍 Regional, Timezone & System Properties

| Getter / Path | Type | Description | Example |
| :--- | :--- | :--- | :--- |
| **`.tz`**<br><small>`zdt.timeZoneId`</small> | `string` | IANA Time Zone ID | `'Australia/Sydney'` |
| **`.cal`**<br><small>`zdt.calendarId`<br>`intl.info.calendar`</small> | `string` | Calendar identifier | `'iso8601'`, `'gregory'` |
| **`.locale`**<br><small>`intl.info.baseName`</small> | `string` | Resolved canonical BCP 47 language tag | `'en-AU'`, `'en-US'` |
| **`.intl`** | `TempoIntlNamespace` | Structured internationalization namespace (`.info` for cultural metadata, `.locale` for native `Intl.Locale`) | `t.intl.info.firstDay`<br>`t.intl.locale` |
| **`.geo`** | `object \| undefined` | Resolved geographic coordinates (`latitude`, `longitude`, `elevation`, `sphere`) | `{ latitude: -33.87,`<br>`longitude: 151.21 }` |
| **`.sphere`**<br><small>`geo?.sphere`</small> | `'north' \| 'south' \|`<br>`undefined` | Resolved terrestrial hemisphere (geographic or timezone-inferred) | `'south'` |
| **`.ts`**<br><small>`zdt.epochMilliseconds`</small> | `number \| bigint` | Unix timestamp (`number` for `ss`/`ms`/`us`, `bigint` for `ns`) | `1792843200000` |
| **`.nano`**<br><small>`zdt.epochNanoseconds`</small> | `bigint` | Nanoseconds since Unix epoch | `1792843200000000000n` |
| **`.iso`**<br><small>`zdt.toInstant()`<br>⤷ `.toString()`</small> | `string` | Standard ISO 8601 string (RFC 3339) in UTC | <small>`'2026-10-24T04:30:45`<br>`.123456789Z'`</small> |
| **`.isValid`** | `boolean` | `true` if the underlying date-time is valid | `true` |

---

## 🎛️ Metadata Properties

Beyond date-time properties, the `Tempo` class also provides read-only getters into its active state and configuration.

| Getter | Type | Description |
| :--- | :--- | :--- |
| **`.config`** | `object` | Returns a proxy to the active configuration, including all resolved inheritance and local overrides. |
| **`.terms`** | `object` | Returns a dictionary of all registered `TermPlugins` and their available `ranges`. |
| **`.ranges`** | `object` | Returns a dictionary of the *currently active* range key for every registered term (e.g., `{ 'season': 'summer' }`). |
| **`.parse`** | `object` | Returns a shadowed view of the internal parsing state (including `anchor`, `mode`, and the AST-like `match` output). |
