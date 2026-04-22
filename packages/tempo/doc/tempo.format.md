# Smart Formatting Guide

Tempo provides a powerful token-based formatting engine that goes beyond the standard ISO strings of native `Temporal`.

## 🚀 Standalone Formatting (Zero-Overhead)

If you have a native `Temporal.ZonedDateTime` and want to format it using Tempo's readable tokens, you can use the standalone `format` function. This allows you to use Tempo's formatting logic without importing the full `Tempo` class.

```typescript
import { format } from '@magmacomputing/tempo/format';

const zdt = Temporal.Now.zonedDateTimeISO();
const str = format(zdt, '{mon} {day}, {yyyy}'); 

console.log(str); // e.g., "October 24, 2026"
```

> [!IMPORTANT]
> **Terms and Standalone Formatting**: When using `format()` with native `Temporal` objects, **Terms** (tokens starting with `#`) are not resolved. To use Terms resolution in your format strings, you must either pass a `Tempo` instance to the `format()` utility or use the class-based `.format()` method.

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
    'fancy': '{mon} the {dd}th day of {yyyy}'
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

| Token | Description | Example |
| :--- | :--- | :--- |
| `{yyyy}` | 4-digit Year | `2026` |
| `{yy}` | 2-digit Year | `26` |
| `{yw}` | Year of Week (ISO) | `2026` |
| `{yyww}` | Year & Week (ISO) | `202617` |
| `{mon}` | Full Month Name | `October` |
| `{mmm}` | Short Month Name | `Oct` |
| `{mm}` | 2-digit Month | `10` |
| `{dd}` | 2-digit Day | `24` |
| `{day}` | Unpadded Day | `24` (or `9`) |
| `{wkd}` | Full Weekday Name | `Saturday` |
| `{www}` | Short Weekday Name | `Sat` |
| `{dow}` | Day of Week (1-7) | `6` |
| `{hh}` | 2-digit Hour (24h) | `15` |
| `{HH}` | 12-hour clock | `3` |
| `{mer}` | am/pm marker | `pm` |
| `{MER}` | AM/PM marker | `PM` |
| `{mi}` | Minutes | `30` |
| `{ss}` | Seconds | `45` |
| `{hhmiss}` | Compact Time (24h) | `153045` |
| `{ms}` | 3-digit Milliseconds | `123` |
| `{us}` | 3-digit Microseconds | `456` |
| `{ns}` | 3-digit Nanoseconds | `789` |
| `{ff}` | Fractional Seconds | `123456789` |
| `{ts}` | Unix Timestamp | `1792843200000` |
| `{nano}` | Nanosecond Timestamp | `1792843200000000000` |
| `{tz}` | Time Zone ID | `Australia/Sydney` |

### 🔄 Automatic Meridiem
If your format string contains `{HH}` (12-hour clock) but lacks a `{mer}` or `{MER}` token, Tempo will automatically append `{mer}` to the end of the last time component to ensure the time remains unambiguous.

```typescript
t.format('{HH}:{mi}'); // "3:30pm" (auto-appended pm)
```

### 🔢 Numeric Resolution
If your format string consists *only* of numeric tokens (e.g., `{yyyy}{mm}{dd}`), the `format()` function will return a **Number** instead of a string. This is useful for generating sortable keys or IDs.

```typescript
const key = t.format('{yyyy}{mm}{dd}');
console.log(typeof key); // "number"
console.log(key);        // 20261024
```
