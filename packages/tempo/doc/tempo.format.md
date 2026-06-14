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
  formats: {
    'fancy': '{mon} the {dd:ord} day of {yyyy}'
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
| `{yw}` | ISO Year of Week | `2026` |
| `{yyww}` | ISO Year & Week | `202617` |
| `{mon}` | Full Month Name | `October` |
| `{mmm}` | Short Month Name | `Oct` |
| `{mm}` | Zero-padded Month | `10` |
| `{dd}` | Zero-padded Day | `24` |
| `{wkd}` | Full Weekday Name | `Saturday` |
| `{www}` | Short Weekday Name | `Sat` |
| `{dow}` | ISO Day of Week (1=Mon, 7=Sun) | `6` |
| `{ww}` | Zero-padded ISO Week of Year | `43` |
| `{hh}` | Zero-padded Hour (24h) | `15` |
| `{h12}` | Zero-padded Hour (12h) plus meridiem | `03pm` |
| `{mer}` | am/pm marker | `pm` |
| `{mi}` | Zero-padded Minutes | `30` |
| `{ss}` | Zero-padded Seconds | `45` |
| `{dmy}` | Compact Date (ddmmyyyy) | `24102026` |
| `{mdy}` | Compact Date (mmddyyyy) | `10242026` |
| `{ymd}` | Compact Date (yyyymmdd) | `20261024` |
| `{hms}` | Compact Time (24h) | `153045` |
| `{ms}` | Zero-padded Milliseconds (3-digit) | `123` |
| `{us}` | Zero-padded Microseconds (3-digit) | `456` |
| `{ns}` | Zero-padded Nanoseconds (3-digit) | `789` |
| `{ff}` | Fractional Seconds | `123456789` |
| `{ts}` | Unix Timestamp | `1792843200000` |
| `{nano}` | Nanosecond Timestamp | `1792843200000000000n` |
| `{tz}` | Time Zone ID | `Australia/Sydney` |
| `{cal}` | Calendar System | `iso8601` |

### 🎛️ Token Modifiers
You can append modifiers to any token using a colon (`:`) to transform its output. Multiple modifiers can be chained together (e.g., `{mon:locale:title}`).

| Modifier | Target | Description | Example |
| :--- | :--- | :--- | :--- |
| `:raw` | Number | Unpadded number, no meridiem | `{hh:raw}` → `3` |
| `:ord` | Number | Appends an ordinal suffix (unpadded) | `{dd:ord}` → `24th` |
| `:upper` | String | Converts to uppercase | `{mer:upper}` → `PM` |
| `:lower` | String | Converts to lowercase | `{mon:lower}` → `october` |
| `:title` | String | Converts to titlecase | `{mon:locale:title}` → `Octobre` |
| `:locale` | String | Resolves term via localization dictionary | `{mon:locale}` → `octobre` |

### 🔄 Automatic Meridiem
If your format string contains `{h12}` (12-hour clock) but lacks a `{mer}` or `{mer:upper}` token, Tempo will automatically append a `{mer}` token with the same modifiers as the `{h12}` token after the last time component to ensure the time remains unambiguous.

*(If you explicitly want a 12-hour digit without an auto-appended meridiem, use the `:raw` modifier: `{h12:raw}`)*

> [!NOTE]
> **Why `{h12}`?** In most date libraries, `{hh}` means 12-hour and `{HH}` means 24-hour time. However, Tempo standardizes `{hh}` on the default 24-hour expectation (with `{h12}` serving as the specific 12-hour override). This keeps all token definitions, and their corresponding time getters, fully lowercase and semantic. 

```typescript
t.format('{h12}:{mi}');       // "03:30pm" (auto-appended pm)
t.format('{h12:upper}:{mi}'); // "03:30PM" (auto-appended PM)
```

### 🔢 Numeric Resolution
If your format string consists *only* of numeric tokens (e.g., `{yyyy}{mm}{dd}`), the `format()` function will return a **Number** instead of a string. This is useful for generating sortable keys or IDs.

```typescript
const key = t.format('{yyyy}{mm}{dd}');
console.log(typeof key); // "number"
console.log(key);        // 20261024
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
