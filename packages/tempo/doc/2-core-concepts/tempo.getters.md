# 🧲 Core Getters

The `Tempo` class provides an extensive array of zero-cost getters that allow you to seamlessly read properties from the underlying `Temporal` instance. 

> [!TIP]
> **Zero-Cost Lazy Evaluation**  
> Tempo uses a sophisticated proxy-based lazy-evaluation pattern. Accessing a getter (like `t.yy`) resolves the property on demand, and then overwrites the getter with a static literal. This means the first access is `O(1)` and every subsequent access is raw property access (`O(0)` cost).

## 📅 Date Properties

| Getter | Type | Description | Example |
| :--- | :--- | :--- | :--- |
| `.yy` | `number` | 4-digit Year | `2026` |
| `.mm` | `number` | Month number (1 = Jan, 12 = Dec) | `10` |
| `.dd` | `number` | Day of the month (1-31) | `24` |
| `.day` | `number` | Alias for `.dd` | `24` |
| `.era` | `string` | Localized era string | `'ce'`, `'bce'`, `'ad'`, `'bc'` |
| `.eraYear` | `number` | Positive integer year within the current `.era` | `2026`, `4` |

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
| `.yw` | `number` | 4-digit ISO week-numbering year | `2026` |
| `.wy` | `number` | ISO week number of the year (1-53) | `43` |
| `.dow` | `number` | ISO weekday number (1 = Mon, 7 = Sun) | `6` |

## 🔤 Named String Representations

| Getter | Type | Description | Example |
| :--- | :--- | :--- | :--- |
| `.mon` | `string` | Full English month name | `'October'` |
| `.mmm` | `string` | Short English month name | `'Oct'` |
| `.wkd` | `string` | Full English weekday name | `'Saturday'` |
| `.www` | `string` | Short English weekday name | `'Sat'` |

## 🌍 Timezone & System Properties

| Getter | Type | Description | Example |
| :--- | :--- | :--- | :--- |
| `.tz` | `string` | IANA Time Zone ID | `'Australia/Sydney'` |
| `.cal` | `string` | Temporal Calendar ID | `'iso8601'` |
| `.ts` | `number` | Unix timestamp (precision based on config) | `1792843200000` |
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
