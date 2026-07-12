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
| **Tempo Core** | **Opt-in**. You must call `Tempo.extend(FormatModule)` to enable `.format()`. |

### Enabling Formatting in Core
If you are using `@magmacomputing/tempo/core`, you must explicitly register the formatting engine:

```typescript
import { Tempo } from '@magmacomputing/tempo/core';
import { FormatModule } from '@magmacomputing/tempo/format';

Tempo.extend(FormatModule);
```

---

## 🔠 Supported Tokens

> [!NOTE]
> **Tempo is heavily opinionated.** To provide maximum predictability and eliminate common timezone or regional bugs, Tempo strictly defaults to **ISO-8601 standards**. This means weeks always start on Monday (`1`), and mathematical bounds (like week-of-year and year-of-week calculations) adhere to the rigorous ISO specification.

| Token | Description | Example |
| :--- | :--- | :--- |
| `{yyyy}` | 4-digit Year | `2026` |
| `{yy}` | 2-digit Year | `26` |
| `{yywy}` | ISO Year & Week | `202617` |
| `{yw}` | ISO Year of Week | `2026` |
| `{wy}` | Zero-padded ISO Week of Year | `43` |
| `{mon}` | Full Month Name | `October` |
| `{mmm}` | Short Month Name | `Oct` |
| `{mm}` | Zero-padded Month | `10` |
| `{dd}` | Zero-padded Day | `24` |
| `{wkd}` | Full Weekday Name | `Saturday` |
| `{www}` | Short Weekday Name | `Sat` |
| `{dow}` | ISO Day of Week (1=Mon, 7=Sun) | `6` |
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
| `{nano}` | Nanosecond Timestamp | `1792843200000000000` |
| `{tz}` | Time Zone ID | `Australia/Sydney` |
| `{cal}` | Calendar System | `iso8601` |

### 🎛️ Token Modifiers
You can append modifiers to any token using a colon (`:`) to transform its output. Multiple modifiers can be chained together (e.g., `{mon:locale:title}`).

| Modifier | Target | Description | Example |
| :--- | :--- | :--- | :--- |
| `:raw` | Number | Unpadded number with no meridiem | `{h12:raw}` → `3` |
| `:ord` | Number | Unpadded number with ordinal suffix | `{dd:ord}` → `24th` |
| `:upper` | String | Converts to uppercase | `{mer:upper}` → `PM` |
| `:lower` | String | Converts to lowercase | `{mon:lower}` → `october` |
| `:title` | String | Converts to titlecase | `{mon:locale:title}` → `Octobre` |
| `:locale` | String | Resolves term via localization dictionary | `{mon:locale}` → `octobre` |
| `:yy` | Compound Date | Truncates the internal year component to 2 digits | `{dmy:yy}` → `241026` |
| `:z` | `{tz}` | Narrow timezone offset | `{tz:z}` → `+10` |
| `:zz` | `{tz}` | Short timezone offset | `{tz:zz}` → `+10:00` |
| `:zzz` | `{tz}` | Techie timezone offset | `{tz:zzz}` → `+1000` |
| `:zzzz` | `{tz}` | Short localized timezone name (fallback: ID) | `{tz:zzzz}` → `AEST` |
| `:zzzzz` | `{tz}` | Long localized timezone name (fallback: ID) | `{tz:zzzzz}` → `Australian Eastern Standard Time` |

### 🔄 Automatic Meridiem
If your format string contains `{h12}` (12-hour clock) but lacks a `{mer}` token, Tempo will automatically append a `{mer}` token with the same modifiers as the `{h12}` token after the last time component to ensure the time remains unambiguous.

*(If you explicitly want a 12-hour digit without an auto-appended meridiem, use the `:raw` modifier: `{h12:raw}`)*

> [!NOTE]
> **Why `{h12}` and `{h24}`?** In other date libraries, `{hh}` could mean 12-hour and `{HH}` could mean 24-hour time. This is confusing and error-prone. Tempo standardizes `{hh}` on the default 24-hour expectation, but provides explicit `{h12}` and `{h24}` tokens to completely eliminate ambiguity. This keeps all token definitions fully lowercase and semantic, without relying on uppercase variations like `{HH}`. 

```typescript
t.format('{h12}:{mi}');           // "03:30pm" (auto-append standard meridiem)
t.format('{h12:upper}:{mi}');     // "03:30PM" (auto-append modified meridiem)
t.format('{h12:raw}:{mi}');       // "3:30"    (no meridiem added)
t.format('{h12:raw}:{mi} {mer}'); // "3:30 am" (space + meridiem added manually)
```

### 🔢 Numeric Resolution
If your format string consists *only* of numeric tokens (e.g., `{yyyy}{mm}{dd}`), the `format()` function will automatically coerce the output to a numeric primitive instead of a string. This is useful for generating sortable keys or IDs. 

For standard lengths, it returns a **Number**. However, if the resulting value exceeds JavaScript's `Number.MAX_SAFE_INTEGER` (such as the `{nano}` token), Tempo safely upgrades the return type to a **BigInt** to prevent precision loss.

```typescript
// Standard Numeric Format -> Number
const key = t.format('{yyyy}{mm}{dd}');
console.log(typeof key); // "number"
console.log(key);        // 20261024

// Large Numeric Format -> BigInt
const epoch = t.format('{nano}');
console.log(typeof epoch); // "bigint"
console.log(epoch);        // 1792843200000000000n
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
