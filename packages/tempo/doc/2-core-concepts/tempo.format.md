# Smart Formatting Guide

Tempo provides a powerful token-based formatting engine that goes beyond the standard ISO strings of native `Temporal`.

## 🚀 Standalone Formatting (Zero-Overhead)

If you have a native `Temporal.ZonedDateTime` and want to format it using Tempo's readable tokens, you can use the standalone `format` function. This allows you to use Tempo's formatting logic without importing the full `Tempo` class.

```typescript
import { format } from '@magmacomputing/tempo/format';

const zdt = Temporal.Now.zonedDateTimeISO();
const str = format(zdt, '{mon} {dd:ord}, {yyyy}'); 

console.log(str); // e.g., "October 24th, 2026"
```

::: warning
**Terms and Standalone Formatting**: When using `format()` with native `Temporal` objects, **Terms** (tokens starting with `#`) are not resolved. To use Terms resolution in your format strings, you must either pass a `Tempo` instance to the `format()` utility or use the class-based `.format()` method.
:::

### Supported Input Types
The engine can interpret:
*   **Temporal Objects**: `ZonedDateTime`, `Instant` (auto-projected to ZDT), `PlainDate`, `PlainDateTime`.
*   **Tempo Instances**: Any instance of the `Tempo` class.
*   **ISO Strings**: Valid Temporal ISO-8601 strings.
*   **Defaults**: If no object is provided, it defaults to **Now** in the configured timezone.

---

## 🏗️ Class-Based Formatting

When using the `Tempo` class, the `.format()` method is available on every instance.

```typescript
import { Tempo } from '@magmacomputing/tempo';

const t = new Tempo('2026-10-24T15:30:00');
console.log(t.format('display')); // Sat, 24 Oct 2026 (using a named format alias)
```

### Named Formats
Tempo comes with several pre-configured format aliases. You can also define your own globally during initialization.

```typescript
Tempo.init({
  registry: {
    formats: {
      'fancy': '{mon} the {dd:ord} day of {yyyy}'
    }
  }
});

const t = new Tempo('2026-10-24');
console.log(t.format('fancy')); // October the 24th day of 2026
```

---

## 🧩 Modularity: Core vs. Full

Like the parsing engine, the formatting engine is modular:

| Version | Formatting Status |
| :--- | :--- |
| **Tempo Full** | **Built-in**. Works out of the box. |
| **Tempo Core** | **Opt-in**. You must call `Tempo.use(FormatModule)` to enable `.format()`. |

### Enabling Formatting in Core
If you are using `@magmacomputing/tempo/core`, you must explicitly register the formatting engine:

```typescript
import { Tempo } from '@magmacomputing/tempo/core';
import { FormatModule } from '@magmacomputing/tempo/format';

Tempo.use(FormatModule);
```

---

## 🔠 Supported Tokens

> [!NOTE]
> **Tempo is heavily opinionated.** To provide maximum predictability and eliminate common timezone or regional bugs, Tempo strictly defaults to **ISO-8601 standards**. This means weeks always start on Monday (`1`), and mathematical bounds (like week-of-year and year-of-week calculations) adhere to the rigorous ISO specification.

> [!TIP]
> **Format Dialects & Migration**
> Tempo's formatting engine uses explicit curly braces and consistent lower-case tokens (`{yyyy}`, `{mm}`, `{dd}`) to prevent common cross-ecosystem pitfalls—such as token confusion between calendar year and ISO week-year (in Unicode LDML `yyyy` is calendar year while `YYYY` is ISO week-year, whereas in Moment and Day.js `YYYY` is calendar year while `GGGG` is ISO week-year).
>
> If you are migrating an existing codebase from Moment, Day.js, or Luxon, the [`@magmacomputing/tempo-plugin-dialects`](../../../plugins/dialects/doc/index.md) community plugin provides drop-in support for familiar external masks:
>
> ```typescript
> import { Tempo } from '@magmacomputing/tempo';
> import { DialectsPlugin } from '@magmacomputing/tempo-plugin-dialects';
>
> Tempo.use(DialectsPlugin);
> Tempo.init({ dialect: 'moment' });
>
> const t = new Tempo('2026-10-24');
> t.format('YYYY-MM-DD');        // "2026-10-24" (Moment mask)
> t.format('{yyyy}-{mm}-{dd}');  // "2026-10-24" (Native Tempo tokens always work)
> ```
>
> For Unicode LDML, POSIX `strftime`, and dual-mode configuration details, see the [Dialects Plugin Documentation](../../../plugins/dialects/doc/index.md).

| Token | Description | Example |
| :--- | :--- | :--- |
| `{yyyy}` | 4-digit Year | `2026` |
| `{yy}` | 2-digit Year | `26` |
| `{eon}` | Absolute Year within Era | `200` |
| `{era}` | Era Designator (e.g., AD/BC, CE/BCE) | `AD` |
| `{yow}` | ISO Year of Week | `2026` |
| `{woy}` | Zero-padded ISO Week of Year | `43` |
| `{mon}` | Full Month Name | `October` |
| `{mmm}` | Short Month Name | `Oct` |
| `{mm}` | Zero-padded Month | `10` |
| `{dd}` | Zero-padded Day | `24` |
| `{wkd}` | Full Weekday Name | `Saturday` |
| `{www}` | Short Weekday Name | `Sat` |
| `{dow}` | ISO Day of Week (1=Mon, 7=Sun) | `6` |
| `{doy}` | Day of Year (1-366) | `297` |
| `{intl.<prop>}` | Regional metadata via `Intl.LocaleInfo` (`{intl.region}`, `{intl.script}`, `{intl.firstDay}`, `{intl.direction}`, `{intl.hourCycle}`) | `US`, `Latn`, `7`, `ltr` |
| `{hh}` | Zero-padded Hour (24h) | `15` |
| `{h24}` | Zero-padded Hour synonym (24h) | `15` |
| `{h12}` | Zero-padded Hour (12h) plus meridiem | `03pm` |
| `{mer}` | am/pm meridiem marker | `pm` |
| `{mi}` | Zero-padded Minutes | `30` |
| `{ss}` | Zero-padded Seconds | `45` |
| `{ms}` | Zero-padded Milliseconds (3-digit) | `123` |
| `{us}` | Zero-padded Microseconds (3-digit) | `456` |
| `{ns}` | Zero-padded Nanoseconds (3-digit) | `789` |
| `{ff}` | Fractional Seconds (9-digit) | `123456789` |
| `{ts}` | Unix Timestamp | `1792843200000` |
| `{dmy}` | Compact Date (ddmmyyyy) | `24102026` |
| `{mdy}` | Compact Date (mmddyyyy) | `10242026` |
| `{ymd}` | Compact Date (yyyymmdd) | `20261024` |
| `{hms}` | Compact Time (24h) | `153045` |
| `{time}` | Time (24h, or localized format via `:locale`) | `15:30:45` |
| `{nano}` | Nanosecond Timestamp | `1792843200000000000` |
| `{dim}` | Total Days in Month (28-31) | `31` |
| `{cen}` | 2-digit Century (`{century}`) | `20` |
| `{jj}` | Astronomical Julian Day Number (`{julian}`) | `2461331` |
| `{wom}` | Week of Month (1-5, aliases `{ww:month}`, `{woy:month}`) | `4` |
| `{tz}` | Time Zone ID | `Australia/Sydney` |
| `{cal}` | Calendar System | `iso8601` |

### 🎛️ Token Modifiers
You can append modifiers to any token using a colon (`:`) to transform its output. Multiple modifiers can be chained together (e.g., `{mon:locale:title}`).

| Modifier | Target | Description | Example |
| :--- | :--- | :--- | :--- |
| `:<number>` | Number | Positive integer zero-fill pads numeric tokens (e.g. `{ns:6}` → `000005`); negative integer tail-slices digits from the right (e.g. `{yyyy:-3}` → `026`, `{yow:-2}` → `26`); or slices fractional-second `{ff}` to precision length (e.g. `{ff:1}` → tenths, `{ff:2}` → hundredths) | `{doy:3}` → `045`, `{yyyy:-3}` → `026`, `{ff:1}` → `7` |
| `:raw` | Number | Unpadded number with no meridiem | `{h12:raw}` → `3` |
| `:ord` | Number | Unpadded number with ordinal suffix | `{dd:ord}` → `24th` |
| `:roman` | Number | Converts integer into Roman numeral representation (supports chaining with `:lower`) | `{yyyy:roman}` → `MMXXVI`, `{mm:roman:lower}` → `x` |
| `:upper` | String | Converts to uppercase | `{mer:upper}` → `PM` |
| `:lower` | String | Converts to lowercase | `{mon:lower}` → `october` |
| `:title` | String | Converts to titlecase | `{mon:locale:title}` → `Octobre` |
| `:dots` | String | Injects periods (useful for abbreviations) | `{mer:lower:dots}` → `a.m.` |
| `:space`| Universal | Injects leading space padding for numeric tokens (e.g. `{dd:space}` → ` 5`, `{doy:3:space}` → `  5`), or a leading space before string/meridiem elements | `{dd:space}` → ` 5`, `{h12}:{mi}{mer:space:dots}` → `03:30 a.m.` |
| `:locale` | Universal | Resolves localized term/month/weekday, adapts `{dow:locale}` to week start, adapts `{woy:locale}` / `{yow:locale}` to locale week rules, adapts `{hh:locale}` to `hourCycle`, or transliterates numeric tokens into locale `numberingSystem` | `{mon:locale}` → `octobre`, `{dow:locale}` → `1`, `{dow:locale:0}` → `0`, `{woy:locale}` → `01`, `{hh:locale}` → `03` (in `en-US`), `{yyyy:locale}` → `٢٠٢٦` (in `ar-EG`) |
| `:short` | Universal / String | Yields a short or abbreviated style (e.g. `{mon:short}` → `Oct`, `{yow:short}` → `26`, `{dmy:short}` → `241026`) | `{mon:short}` → `Oct`, `{yow:short}` → `26` |
| `:long` | String | Yields a full-length style | `{mon:long}` → `October` |
| `:compact` | String | Yields a delimiter-free, compact representation | `{tz:offset:compact}` → `+1000` |
| `:offset` | `{tz}` | Converts timezone identifier to numeric UTC offset. Supports granular sub-modifiers (`:hh`, `:mi`, `:ss`, `:z`) | `{tz:offset}` → `+10:00`, `{tz:offset:hh}` → `+10` |
| `:zero` / `:0` | Number | Shifts 1-based counters to zero-indexed (`{doy:zero}` → `000`–`365`, `{dow:zero}` → `0`–`6` Sunday=0, `{dow:locale:0}` → `0`–`6` locale week start=0, `{mm:zero}` → `00`–`11`, `{woy:zero}` → `00`–`52`, `{wom:zero}` → `0`–`4`) | `{dow:0}` → `6`, `{dow:locale:0}` → `0`, `{mm:raw:0}` → `9` |
| `:day` | Unit Scope | Expresses time units cumulatively over the day (`{ss:day}` → `0`–`86399`, `{mi:day}` → `0`–`1439`, `{ms:day}`, `{ns:day}`) | `{ss:day}` → `55845` |
| `:week` | Unit Scope | Expresses time units cumulatively over the week (`{hh:week}` → `0`–`167`, `{mi:week}`, `{ss:week}`) or day within the week (`{dd:week}` → `1`–`7`) | `{hh:week}` → `135`, `{dd:week}` → `6` |
| `:month` | Unit Scope | Scopes counters to the month (`{wom}` / `{woy:month}` → `1`–`5`, `{dd:month}` → `1`–`31`) | `{wom}` → `4` |
| `:year` | Unit Scope | Scopes counters to the year (`{dd:year}` → `001`–`366`, `{mm:year}` → `01`–`12`) | `{dd:year}` → `297` |

> [!TIP]
> **Timezone Formatting & Extended Offset Variations**  
> `{tz}` defaults to the IANA timezone identifier (e.g. `Australia/Sydney`). Modifiers can be composed seamlessly:
> * **Named Styles**: `{tz:short}` → `AEST`, `{tz:long}` → `Australian Eastern Standard Time`.
> * **Chained Offsets**: `{tz:offset}` → `+10:00`, `{tz:offset:short}` → `+10`, `{tz:offset:compact}` → `+1000`.
> * **Granular Offset Components**:
>   * `{tz:offset:hh}` / `{tz:offset:hour}` → Hour with sign (e.g. `+10`, `-05`, `+00`).
>   * `{tz:offset:mi}` (and alias `:min`) → Minutes without sign (e.g. `00`, `30`).
>   * `{tz:offset:ss}` (and alias `:sec`) → Offset including seconds (e.g. `+10:00:00`, compact `{tz:offset:compact:ss}` → `+100000`).
>   * `{tz:offset:z}` / `{tz:offset:compact:z}` → UTC `Z` indicator: emits `Z` for UTC (`+00:00`), else ISO offset `+10:00` (or compact `+1000`).
> * **Canonical Naming**: Sub-modifiers `:hh`, `:mi`, and `:ss` match Tempo's core time tokens. Modifiers `:hour`, `:min`, and `:sec` are supported synonyms.
> * **Shorthands & Aliases**: LDML aliases (`{tz:z}`, `{tz:zz}`, `{tz:zzz}`) are supported as drop-in shorthands.

> [!TIP]
> **Numeric Zero-Fill Padding, Tail-Slicing & Fractional Precision**  
> You can pass any integer width directly as a modifier (e.g. `{doy:3}`, `{yyyy:-3}`, `{yow:-2}`, `{ns:6}`).
> * **Positive width (`+N`)**: Zero-pads integers to the specified width. Negative values maintain proper sign formatting (e.g. `-5` with `:3` yields `"-05"`).
> * **Negative width (`-N`)**: Slices the last $N$ characters from the right (`slice(-N)`). Ideal for year variations such as 3-digit year (`{yyyy:-3}` → `'026'`), 1-digit year (`{yyyy:-1}` → `'6'`), or 2-digit ISO week-year (`{yow:-2}` / `{yow:short}` → `'26'`).
> * **Fractional seconds (`{ff}`)**: Slices the 9-digit fractional second string to the specified precision length (e.g. `{ff:1}` for tenths, `{ff:2}` for hundredths, `{ff:3}` for milliseconds, `{ff:6}` for microseconds).

> [!TIP]
> **Specialized Tokens, Calendrical Counters & Designed Composability**  
> Rather than proliferating one-off tokens for every niche format requirement, Tempo promotes an orthogonal matrix of composable unit scopes (`:day`, `:week`, `:month`, `:year`) alongside specialized tokens:
> * **Astronomical Julian Day (`{jj}`, `{julian}`)**: Emits continuous 7-digit day count since 4713 BC (`2461331` for 2026-10-17, matching Oracle `J`).
> * **Julian Day vs. Day of Year**: `{jj}` is the astronomical Julian Day number, whereas `{dd:year}` (or `{doy}`) is the day of the year (`1`–`366`, matching mainframe "Julian dates" like `YYYYDDD`).
> * **Days in Month (`{dim}`)**: Total count of days in the current month (`28`–`31`, matching PHP `t`). (Convenience alias for `.zdt.daysInMonth`).
> * **Century (`{cen}`, `{century}`)**: 2-digit century number (`20` for `2026`, matching POSIX `%C`).
> * **Week of Month (`{wom}`)**: 1-based week counter within the month (`1`–`5`, matching Oracle `W` and Unicode LDML `W`). Semantic aliases: `{ww:month}`, `{woy:month}`.
> * **Calendar Week (`{woy:cal}`) & v5 Roadmap**: Week of year starting on January 1st (`01`–`53`, matching Oracle `WW`). Marked `@deprecated Will be superseded by {ww} in v5.0.0`.
> * **Dimensional Time-Scope Modifiers**: Compose time units over a specified duration scope:
>   * `{ss:day}`: Seconds past midnight (`0`–`86399`, matching Oracle `SSSSS`).
>   * `{mi:day}`: Minute of the day (`0`–`1439`).
>   * `{ms:day}`, `{ns:day}`: Milliseconds and nanoseconds of the day.
>   * `{dd:week}`: Day of week (`1`–`7`, or `0`–`6` with `:zero`).
>   * `{hh:week}`: Hour of the week (`0`–`167`).
>   * `{mi:week}`, `{ss:week}`: Minute and second of the week.
> * **Generalized Zero-Indexing (`:zero` / `:0`)**: Shifts any 1-based numeric counter to 0-based without width collisions:
>   * `:zero` is the canonical semantic modifier; `:0` is its compact shorthand.
>   * `{doy:zero}` / `{doy:0}`: `000`–`365` (or `{doy:raw:0}` → `0`–`365`, matching PHP `z`).
>   * `{dow:zero}` / `{dow:0}`: `0`–`6` with Sunday = 0 (matching POSIX `%w`, JavaScript `Date.prototype.getDay()` parity).
>   * `{mm:zero}` / `{mm:0}`: `00`–`11` (or `{mm:raw:0}` → `0`–`11`, matching JavaScript `Date.prototype.getMonth()` parity).
>   * `{woy:zero}` / `{woy:0}`: `00`–`52`.
>   * `{wom:zero}` / `{wom:0}`: `0`–`4`.

<!-- markdownlint-disable-next-line MD028 -->
> [!TIP]
> **Implicit Localization Bridge**
> The `:short` and `:long` styling modifiers act as an automatic bridge to the browser's native `Intl` API! 
> By default, core tokens like `{mon}` or `{wkd}` run at zero-cost using Tempo's lightning-fast internal enums (yielding English results). If you want a localized string, you don't need to explicitly chain the `:locale` modifier. Simply using a styling modifier like `{mon:long}` will automatically translate the string using the instance's configured locale!

### 🔄 Automatic Meridiem
If your format string contains `{h12}` (12-hour clock) but lacks a `{mer}` token, Tempo will automatically append a `{mer}` token with the same modifiers as the `{h12}` token after the last time component to ensure the time remains unambiguous.

*(If you explicitly want a 12-hour digit without an auto-appended meridiem, use the `:raw` modifier: `{h12:raw}`)*

> [!NOTE]
> **Why `{h12}` and `{h24}`?** In other date libraries, `{hh}` could mean 12-hour and `{HH}` could mean 24-hour time. This is confusing and error-prone. Tempo standardizes `{hh}` on the default 24-hour expectation, but provides explicit `{h12}` and `{h24}` tokens to completely eliminate ambiguity. This keeps all token definitions fully lowercase and semantic, without relying on uppercase variations like `{HH}`. 

```typescript
t.format('{h12}:{mi}');           // "03:30pm" (auto-append standard meridiem)
t.format('{h12:upper}:{mi}');     // "03:30PM" (auto-append modified meridiem)
t.format('{h12:dots}:{mi}');      // "03:30a.m." (auto-append meridiem with dots)
t.format('{h12:space:dots}:{mi}');// "03:30 a.m." (auto-append meridiem with leading space)
t.format('{h12:raw}:{mi}');       // "3:30"    (no meridiem added)
t.format('{h12:raw}:{mi} {mer}'); // "3:30 am" (manual space + meridiem)
```

### 📝 Common Formatting Examples
Here are a few real-world examples demonstrating how tokens and modifiers can be composed together to build readable sentences and structured strings.

```typescript
const t = new Tempo('2026-10-05T15:30:00');

// Injecting tokens directly into sentences
t.format('Today is the {dd:ord} of {mon:title}'); 
// "Today is the 5th of October"

// Building standard UI formats
t.format('{wkd}, {mmm} {dd:raw}, {yyyy} @ {h12}:{mi}'); 
// "Monday, Oct 5, 2026 @ 03:30pm"

// Forcing fully lowercase strings
t.format('{wkd:lower} afternoon'); 
// "monday afternoon"
```

---

## 📍 Dynamic Namespace & Spatial Tokens (`{namespace.key}`)

Tempo's format engine dynamically resolves bracketed dot-notated tokens (`{namespace.key}`) against any active plugin namespace or property container on the `Tempo` instance (such as `t.geo`, `t.finance`, `t.astro`, `t.term`, or custom attached metadata).

### Geographic Tokens (`{geo.*}`)
When geographic coordinates or metadata are attached to a Tempo instance (via `options.geo`, `new Tempo('...', { geo: { city: 'Sydney', country: 'AU', lat: -33.8688, lng: 151.2093 } })`, or resolved via `t.geoLocate()`), you can format location fields directly using `{geo.<property>}` tokens:

| Token | Description | Example |
| :--- | :--- | :--- |
| `{geo.city}` | Locality or City name | `Sydney` |
| `{geo.country}` | ISO Country code or Country name | `AU` / `Australia` |
| `{geo.sphere}` | Hemisphere (`north`, `south`, or `equator`) | `south` |
| `{geo.elevation}`| Altitude / Elevation in meters above sea level | `42` |
| `{geo.timezone}` | IANA Timezone resolved from coordinates | `Australia/Sydney` |
| `{geo.<custom>}` | Any custom metadata key attached to `t.geo` | `Opera House` |

### Custom & Plugin Namespace Tokens
Any namespace plugin mounted via `defineNamespace` or property object on the instance can be formatted directly:

```typescript
// Plugin namespace (e.g. tempo-plugin-finance):
t.format('Fiscal Quarter: Q{finance.fiscalQuarter} ({finance.taxYear})');

// Term plugin (e.g. season or solar terms):
t.format('Current Season: {term.season} · {geo.city:title}');
```

### Modifiers & Graceful Fallback
All standard formatting modifiers apply seamlessly:
* `{geo.country:upper}` → `AU`
* `{geo.city:title}` → `Sydney`
* `{geo.sphere:upper}` → `SOUTH`

For known property namespaces (like `geo`), if the context is unpopulated or the requested property is missing, the token cleanly resolves to an empty string (`''`) rather than throwing an exception or printing `undefined`:

```typescript
const t = new Tempo('2026-10-24T15:30:00', {
  geo: { city: 'Sydney', country: 'AU', lat: -33.869, lng: 151.209 }
});

t.format('{geo.city}, {geo.country} · {h12}:{mi} {mer}');
// "Sydney, AU · 03:30 pm"

// Graceful fallback for instances without geo:
const tNoGeo = new Tempo('2026-10-24T15:30:00');
tNoGeo.format('Time: {hh}:{mi} [{geo.city}]');
// "Time: 15:30 []"
```

### 🌐 Hierarchical Localization (`{namespace.key:locale}`)
When using `:locale` on namespace tokens (e.g. `{geo.sphere:locale}` or `{custom.tag:locale}`), Tempo resolves translations from the global `registry.locales` dictionary using an intuitive, cascading fallback:

1. **Deep Hierarchical Path**: `locales[lang]?.geo?.sphere?.['south']` → `"sud"`
2. **Leaf Property Scoped**: `locales[lang]?.sphere?.['south']` → `"sud"`
3. **Flat Word Match**: `locales[lang]?.['south']` → `"sud"`
4. **Canonical Fallback**: If no dictionary match exists, gracefully returns the raw canonical value (`"south"`).

```typescript
Tempo.init({
  locale: 'fr-FR',
  registry: {
    locales: {
      fr: {
        geo: {
          sphere: {
            north: 'nord',
            south: 'sud',
            equator: 'équateur',
          },
          city: {
            sydney: 'Sydney (Australie)',
          },
        },
      },
    },
  },
});

const t = new Tempo('2026-10-24', { geo: { city: 'sydney', sphere: 'south' } });

t.format('{geo.sphere:locale}');        // "sud"
t.format('{geo.sphere:locale:title}');  // "Sud" (modifiers chain seamlessly)
t.format('{geo.sphere:locale:upper}');  // "SUD"
t.format('{geo.city:locale}');          // "Sydney (Australie)"
```

---

## 🌍 Complex Native Intl Formatting

While Tempo's template tokens (`{dd}`, `{mon}`, etc.) combined with the `:locale` modifier are incredibly powerful for structured formats, there are times when you want the full power of the native `Intl.DateTimeFormat` API for complete, culturally-specific sentence formatting (like Arabic numerals or full-length descriptive dates). 

Because Tempo's philosophy is to "humanize" the rigid `Temporal` API, you can pass an `Intl.DateTimeFormatOptions` object *directly* into the `.format()` method. While `Intl.DateTimeFormat` still strictly validates your locales and option values, Tempo catches Temporal mismatch failures for you. It automatically retries formatting using `zdt.epochMilliseconds` for Temporal/Intl mismatch cases, safely injects the necessary `timeZone` and `calendar` metadata, but will explicitly rethrow any `withTimeZone` or `withCalendar` failures (e.g. from invalid timezones).

**Tempo vs Temporal (Side-by-Side):**

```typescript
const arabicConfig = {
  locale: 'ar-EG',
  timeZone: 'Africa/Cairo',
  weekday: 'long',
  year: 'numeric',
  month: 'long',
  day: 'numeric',
  numberingSystem: 'arab'
}

// 🔴 Native Temporal (Strict & Verbose)
// 1. You must carefully parse the date using the correct Temporal factory.
// 2. You must manually shift the timezone before formatting, or it throws an exception!
const nativeStr = Temporal.PlainDateTime
  .from('2024-12-25T14:30:00')
  .toZonedDateTime('UTC')
  .withTimeZone('Africa/Cairo')
  .toLocaleString('ar-EG', arabicConfig);

// 🟢 Tempo (Humanized)
// Automatically handles the parsing, shifts constraints, and safely delegates to Intl!
const tempoStr = new Tempo('2024-12-25 14:30')
  .format(arabicConfig);

console.log(tempoStr); // "الأربعاء، ٢٥ ديسمبر ٢٠٢٤"
```

```typescript
// Example: Japanese Reiwa Era formatting
const t = new Tempo('2024-12-25 14:30');

const japaneseConfig = {
  locale: 'ja-JP-u-ca-japanese',
  timeZone: 'Asia/Tokyo',
  calendar: 'japanese',
  era: 'long',
  year: 'numeric',
  month: 'long',
  day: 'numeric'
}

console.log(t.format(japaneseConfig));
// Output: "令和6年12月25日"
```

---

## 🛠️ Custom Format Tokens
Need a completely custom format behavior? You can define dynamic token evaluators in the global registry that receive the `zdt` (`Temporal.ZonedDateTime`) instance and a context object, giving you full native access to `Intl` formatting or custom logic.

> [!NOTE]
> **Why native `ZonedDateTime` instead of a `Tempo` instance?**
> The formatting engine is highly modular and designed to be tree-shakable via the standalone `format()` utility. By injecting native Temporal objects, custom tokens remain extremely fast, portable, and zero-overhead. If you absolutely need access to Tempo's syntactic sugar inside your token evaluator, you can simply re-wrap the object on the fly: `const t = new Tempo(zdt);`

```typescript
Tempo.init({
    locale: 'fr-FR',
    registry: {
        tokens: {
            // A simple math-based token
            'myDay': (zdt) => String(zdt.day - 1),
            
            // A deeply localized custom token using native Intl
            'wkd-fr': (zdt, { config }) => {
                const dtOptions = config?.intl?.dateTimeFormat ?? {};
                return zdt.toLocaleString(config?.locale ?? 'en', { ...dtOptions, weekday: 'long' });
            }
        }
    }
});

const t = new Tempo('2024-05-20');
t.format('{myDay}');  // "19"
t.format('{wkd-fr}'); // "lundi"
```
