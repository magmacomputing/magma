# 🧲 Core Getters

The `Tempo` class provides an extensive array of zero-cost getters that allow you to seamlessly read properties from the underlying `Temporal` instance. 

> [!TIP]
> **Zero-Cost Lazy Evaluation**  
> Tempo uses a sophisticated proxy-based lazy-evaluation pattern. Accessing a getter (like `t.yy`) resolves the property on demand, and then overwrites the getter with a static literal. This means the first access is $O(1)$ and every subsequent access is raw property access ($O(0)$ cost).

## ⚡ Native Temporal Gateway (`.zdt`) {#native-temporal-gateway-zdt}

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
| **`.era`**<br>`zdt.era` | `string \| undefined` | Calendar era identifier | `'ce'`, `'bce'`, `'ad'`, `'bc'` |
| **`.eon`**<br>`zdt.eraYear` | `number \| undefined` | Positive integer year within current `.era` <sup>[[1]](#fn-eon)</sup> | `2026`, `4` |
| **`.jj`** | `number` | Integer Julian Day number for the local ISO date (ignoring time of day) <sup>[[2]](#fn-jj)</sup> | `2461331` |

<small>

1. <span id="fn-eon">**Era Year (`.eon`) vs. Calendar Year (`.yy`)**: While `.yy` returns the signed astronomical year (e.g. `2026` or `-3`), `.eon` returns the positive integer year within the active `.era` (e.g. `2026` in CE, `4` in 4 BCE, or `4` in Reiwa 4 when using the Japanese calendar).</span>
2. <span id="fn-jj">**Astronomical Julian Day (`.jj`) vs. Day of Year (`.doy`)**: `.jj` provides the integer Julian Day Number for the instance's local ISO date (an integer day count elapsed since noon UT on January 1, 4713 BC, in the proleptic Julian calendar, ignoring time of day, e.g. `2461331` for 2026-10-17). If you need the calendar day within the current year (`1`–`366`), use `.doy`.</span>

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

| Getter / Path | Type | Description | Example |
| :--- | :--- | :--- | :--- |
| **`.mon`**<br><small>`Tempo.MONTHS.keyOf(zdt.month)`</small> | `string` | Full English month name (Gregorian registry label) | `'October'` |
| **`.mmm`**<br><small>`Tempo.MONTH.keyOf(zdt.month)`</small> | `string` | Short English month name (Gregorian registry label) | `'Oct'` |
| **`.wkd`**<br><small>`Tempo.WEEKDAYS.keyOf(zdt.dayOfWeek)`</small> | `string` | Full English weekday name | `'Saturday'` |
| **`.www`**<br><small>`Tempo.WEEKDAY.keyOf(zdt.dayOfWeek)`</small> | `string` | Short English weekday name | `'Sat'` |

## 🌍 Regional, Timezone & System Properties

| Getter / Path | Type | Description | Example |
| :--- | :--- | :--- | :--- |
| **`.tz`**<br><small>`zdt.timeZoneId`</small> | `string` | IANA Time Zone ID | `'Australia/Sydney'` |
| **`.cal`**<br><small>`zdt.calendarId`</small> | `string` | Calendar identifier <sup>[[3]](#fn-cal)</sup> | `'iso8601'`, `'gregory'` |
| **`.locale`**<br><small>`intl.locale?.toString()`</small> | `string` | Resolved canonical BCP 47 language tag | `'en-AU'`, `'en-US'` |
| **`.sphere`**<br><small>`geo.sphere`</small> | `Tempo.COMPASS \|`<br>`undefined` | Resolved terrestrial hemisphere or compass orientation (`'north'`, `'south'`, `'equator'`, `'east'`, `'west'`) | `'south'` |
| **`.ts`**<br><small>`t.epoch[timeStamp ?? 'ms']`</small> | `number \| bigint` | Unix timestamp using configured epoch unit (defaults to `'ms'`; `number` for `ss`/`ms`/`us`, `bigint` for `ns`) <sup>[[4]](#fn-ts)</sup> | `1792843200000` |
| **`.iso`**<br><small>`zdt.toInstant()`<br>⤷ `.toString()`</small> | `string` | Standard ISO 8601 string (RFC 3339) in UTC | <small>`'2026-10-24T04:30:45`<br>`.123456789Z'`</small> |
| **`.isValid`** | `boolean` | `true` if the underlying date-time is valid | `true` |

<small>

3. <span id="fn-cal">**Active Calendar (`.cal`) vs. Locale Calendar Preference (`.intl.info.calendar`)**: `.cal` returns the instance's active calendar identifier (`zdt.calendarId`), which controls arithmetic and date representation. To inspect the cultural default calendar associated with the resolved locale (e.g. `'gregory'` for `en-US`, or `'buddhist'` for `th-TH`), use `t.intl.info.calendar`.</span>
4. <span id="fn-ts">**Configured Epoch Timestamp (`.ts`)**: `.ts` resolves its value using the configured `timeStamp` unit (defaults to `'ms'`). Only `'ms'` maps directly to native `zdt.epochMilliseconds`. When configured to `'ss'`, `'us'`, or `'ns'`, `.ts` maps to their respective epoch values (`'ss'` seconds, `'us'` microseconds, or `'ns'` `zdt.epochNanoseconds`). For an unconditional nanosecond timestamp regardless of instance configuration, use `t.epoch.ns`.</span>

</small>

---

## 🗂️ Structured Namespaces {#structured-namespaces}

In addition to scalar getters, `Tempo` provides structured sub-namespaces for domain-specific metadata, high-precision epoch units, internationalization, and geographic context.

| Namespace | Type | Sub-Properties | Example Usage |
| :--- | :--- | :--- | :--- |
| **`.epoch`** | `Readonly<object>` | High-precision Unix epoch counters:<br>• `.ss` (`number`) — seconds since epoch<br>• `.ms` (`number`) — milliseconds since epoch<br>• `.us` (`number`) — microseconds since epoch<br>• `.ns` (`bigint`) — nanoseconds since epoch | `t.epoch.ms` → `1792843200000`<br>`t.epoch.ns` → `1792843200000000000n` |
| **`.intl`** | `TempoIntlNamespace` | Internationalization metadata and locale engine:<br>• `.info` (`object`) — cultural metadata (`firstDay`, `weekend`, `calendar`, `minimalDays`)<br>• `.locale` (`Intl.Locale`) — native locale instance | `t.intl.info.firstDay` → `1`<br>`t.intl.locale.baseName` → `'en-US'` |
| **`.geo`** | `Readonly<GeoConfig>` | Geographic coordinates and location data:<br>• `.sphere` (`'north' \| 'south' \| 'equator'`; always resolved)<br>• `.latitude`, `.longitude` (`number \| undefined`)<br>• `.elevation` (`number \| undefined`) | `t.geo.sphere` → `'south'`<br>`t.geo.latitude` → `-33.87` |
| **`.term`** | `TempoTermRegistry` | Dynamic delegator accessing resolved terminology from loaded `TermPlugin` modules | `t.term.season` → `'summer'`<br>`t.term.quarter` → `'Q1'` |
| **`.fmt`** | `Record<string,`<br>`string \| undefined>` | Dynamic delegator evaluating and memoizing individual format token strings | `t.fmt.yyyy` → `'2026'`<br>`t.fmt.wkd` → `'Saturday'` |

---

## 🎛️ Metadata & State Inspection

Beyond date-time properties, `Tempo` instances expose read-only inspection getters for debugging, parser AST auditing, and plugin registration introspection:

| Getter | Type | Description | Example Usage |
| :--- | :--- | :--- | :--- |
| **`.config`** | `Readonly<Config>` | Active configuration proxy reflecting resolved global defaults and local instance overrides. | `t.config.timeZone` |
| **`.parse`** | `Internal.Parse` | Shadowed view of internal parse state, including active `mode`, `anchor`, and matched AST tokens (`.result`). | `t.parse.anchor`<br>`t.parse.result` |
| **`.terms`** | `Readonly<Record<...>>` | Dictionary of all registered `TermPlugin` scopes and their available range keys. | `t.terms.season` → `['summer', 'autumn', ...]` |
| **`.ranges`** | `Readonly<Record<...>>` | Dictionary mapping every registered term key to its *currently active* range value for this date. | `t.ranges` → `{ season: 'summer', quarter: 'Q1' }` |

---

## 🏛️ Design Philosophy: The 3-Tier Rubric

Tempo v5 intentionally avoids cluttering the top-level prototype with aliases or wrappers for every single Temporal property. Instead, properties are organized into three clear tiers to maximize Developer Experience (DX) while keeping IDE autocompletion fast and uncluttered:

1. **Tier 1: Core Daily Primitives (`t.*`)**  
   High-frequency getters used across the majority of date applications (`.yy`, `.mm`, `.dd`, `.hh`, `.mi`, `.ss`, `.dim`, `.doy`, `.dow`, `.iso`, `.mon`, etc.).
2. **Tier 2: Structured Namespaces (`t.<namespace>.*`)**  
   Domain-specific sub-properties grouped into clean namespaces ([`.epoch`](#structured-namespaces), [`.geo`](#structured-namespaces), [`.intl`](#structured-namespaces), [`.term`](#structured-namespaces)) to prevent flat autocomplete pollution.
3. **Tier 3: The Native Temporal Gateway (`t.zdt.*`)**  
   Standard TC39 Temporal properties (`.daysInYear`, `.inLeapYear`, `.offsetNanoseconds`, `.hoursInDay`, `.monthCode`) are accessed directly via [`.zdt`](#native-temporal-gateway-zdt) with zero performance overhead and full TypeScript type fidelity.

> [!NOTE]
> **Why isn't there a `t.diy` or `t.inLeapYear` on root?**  
> Rather than introducing dozens of cryptic 3-letter abbreviations or wrapping all native Temporal properties, Tempo leaves standardized properties in `t.zdt.*`. If your application or domain requires custom root getters, Tempo is built to be easily extended:

> [!TIP]
> **Extending Tempo with Custom Getters & Namespaces**  
> Developers are never limited to Tempo's built-in getters. The `Tempo` class is intentionally open for extension:
> - **Custom Instance Getters (`defineProperties` / `defineProperty`)**: Define custom instance getters and methods directly on `Tempo` or an isolated sandbox (`Tempo.create()`). Resolver functions are automatically treated as lazy, per-instance memoized getters:
>   ```typescript
>   import { defineProperties } from '@magmacomputing/tempo';
>
>   Tempo.use(defineProperties({
>     isWeekend: (t) => t.dow >= 6,
>     quarter: (t) => Math.ceil(t.mm / 3),
>   }, 'DateExtensions'));
>   ```
> - **Structured Sub-Namespaces**: Mount entire custom namespaces (e.g. `t.finance.*` or `t.astro.*`) with automatic proxy resolution and caching using [`defineNamespace`](../3-extending-tempo/tempo.plugin.md).
> - **Reusable Lifecycle Plugins**: Package complex behaviors, prototype methods, and static tools using [`definePlugin`](../3-extending-tempo/tempo.plugin.md).
>
> Learn more in the comprehensive **[Extending Tempo with Plugins Guide](../3-extending-tempo/tempo.plugin.md)**.

