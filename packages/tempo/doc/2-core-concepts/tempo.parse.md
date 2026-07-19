# Smart Parsing Guide

Tempo's strongest feature is its flexible, natural-language parsing engine. While native `Temporal` is strictly ISO-only, Tempo can interpret a vast range of human-friendly date and time expressions.

## 🚀 Standalone Parsing (Zero-Overhead)

If you only need Tempo's "Smart" parsing but want to keep your project lightweight, you can use the standalone `parse` function. This returns a native `Temporal.ZonedDateTime` without importing the full `Tempo` class.

```typescript
import { parse } from '@magmacomputing/tempo/parse';

// Returns a native Temporal.ZonedDateTime
const zdt = parse('May 20, 2026 at 3pm', { timeZone: 'Australia/Sydney' });

console.log(zdt.toString()); // 2026-05-20T15:00:00+10:00[Australia/Sydney]
```

### Why use Standalone Parse?
*   **Tree-Shaking**: Your bundler can skip the entire `Tempo` class and its associated methods, significantly reducing your bundle size.
*   **Temporal Native**: Perfect for projects that already use native `Temporal` objects but need a friendlier input layer for users.
*   **Strict by Default**: The standalone function defaults to `mode: 'strict'`, ensuring that it won't "guess" if the input is ambiguous.

::: warning
**Terms and Standalone Parsing**: Standalone `parse()` supports all standard natural language patterns but does not resolve **Global Terms** or aliases unless they are part of the core pattern registry. For full Term-dispatch and instance-aware resolution, use the `Tempo` class.
:::

### ⚠️ Standalone vs. Class-Based
It is important to understand the trade-offs when using the lightweight `parse()` function:

| Feature | Standalone `parse()` | `new Tempo()` Class |
| :--- | :--- | :--- |
| **Return Type** | Native `Temporal.ZonedDateTime` | `Tempo` Instance |
| **Fluent API** | ❌ Native Temporal methods only | ✅ `.add()`, `.set()`, `.format()`, etc. |
| **Validation** | ❌ No `.isValid` property | ✅ Track success via `.isValid` |
| **State** | ❌ One-off (Stateless) | ✅ Persistent instance configuration |
| **Plugins** | ❌ Bypasses class-level plugins | ✅ Full support for `.ticker()`, etc. |
| **Global Config** | ❌ Configuration per call only | ✅ Configure once via `Tempo.init()` |

::: tip
Use **Standalone Parse** for server-side processing or background tasks where bundle size is the priority. Use the **Tempo Class** for UI-heavy applications that need advanced formatting and mutation chains.
:::

---

## 🏗️ Class-Based Parsing

When using the `Tempo` class, parsing is handled automatically by the constructor.

```typescript
import { Tempo } from '@magmacomputing/tempo';

const t = new Tempo('May 20, 2026');
```

### Supported Formats
The engine can interpret:
*   **ISO Strings**: `2024-05-20T10:00:00Z`
*   **Short Dates**: `20-May`, `May 20` (locale-aware)
*   **Relative Strings**: `next Monday`, `last Friday`, `2 days ago`
*   **Numbers/BigInt**: Unix timestamps in milliseconds or nanoseconds.
*   **Temporal Objects**: `ZonedDateTime`, `PlainDate`, `PlainDateTime`.

### Historical Era Parsing
Tempo natively supports parsing historical and future dates with era designations such as `BC`, `BCE`, `AD`, and `CE`. 
It correctly resolves both trailing (`200 BC`) and leading (`BC 200`) formats.

> [!WARNING]
> **Era Parsing Assumptions**
> When parsing dates with eras, be aware of the following architectural rules:
> 1. **Implicit Defaults**: If no era is explicitly provided in the string, Tempo safely assumes `CE` (Common Era).
> 2. **Missing Months/Days**: If a historical era string like `"200 BC"` is parsed without a month or day, Tempo anchors the missing components to **January 1st** of that astronomical year (i.e., `-199-01-01`).
> 3. **Calendar Systems**: Era parsing and conversion to astronomical years is strictly restricted to the **ISO/Gregorian** calendar system. This mathematically means `1 BC` becomes astronomical year `0`, and `200 BC` becomes year `-199`.

---

## 🔢 Numeric & Epoch Parsing

Tempo provides robust support for parsing Unix timestamps (Epochs). Unlike standard `Date.parse`, Tempo can interpret epochs in multiple units and handles both `Number` and `BigInt` types.

### Unit Selection
By default, Tempo treats numbers as **milliseconds**. You can configure this via the `timeStamp` option:

```typescript
// Default (milliseconds)
new Tempo(1715900000000).format('{yyyy}-{mm}-{dd}'); // 2024-05-16

// Seconds
new Tempo(946684800, { timeStamp: 'ss' }).yy; // 2000

// Microseconds / Nanoseconds
new Tempo(1715900000000000n, { timeStamp: 'us' });
```

### Smart Epoch Detection
The parsing engine automatically detects shorter numeric strings (9-10 digits) as valid Epoch candidates when a non-default unit (like `'ss'`) is configured. This ensures that second-based timestamps like `946684800` are correctly interpreted as timestamps rather than being passed to the layout engine.

### Fractional Precision
Tempo supports fractional numeric inputs across all units with nanosecond precision.
*   `1.5` (seconds mode) resolves to `1.5` seconds (1500ms).
*   `100.25` (milliseconds mode) resolves to `100` milliseconds and `250` microseconds.

---

## 🧩 Modularity: Core vs. Full

The parsing engine is modular. Depending on which version of Tempo you are using, you may need to explicitly enable it:

| Version | Smart Parsing Status |
| :--- | :--- |
| **Tempo Full** | **Built-in**. Works out of the box. |
| **Tempo Core** | **Opt-in**. You must call `Tempo.extend(ParseModule)` to enable natural language support. |

### Enabling Smart Parsing in Core
If you are using `@magmacomputing/tempo/core`, the constructor only supports basic ISO strings by default. To enable "next Tuesday" style parsing, you must extend it:

```typescript
import { Tempo } from '@magmacomputing/tempo/core';
import { ParseModule } from '@magmacomputing/tempo/parse';

Tempo.extend(ParseModule);
```

---

## 🌍 Internationalization, TimeZone & Locale

Tempo uses your configuration to intelligently parse ambiguous dates and foreign languages.

### US-Style Dates (`MM/DD/YYYY`)
If you parse a numeric string like `04012026`, Tempo uses your `timeZone` to decide if it means **April 1st** (US) or **4th of January** (UK/AU).

Tempo achieves this by dynamically checking if your current `timeZone` is associated with a locale that prefers Month-Day ordering (like `en-US`). It uses the `Intl.Locale.prototype.getTimeZones()` API where available, and maintains a robust **hardcoded fallback list** for environments (like Node.js CI or non-ICU environments) where the full Intl API is not present.

```typescript
const us = new Tempo('04012026', { timeZone: 'America/New_York' }); // Apr 1
const au = new Tempo('04012026', { timeZone: 'Australia/Sydney' }); // Jan 4
```

#### Parsing "Ambiguous" Digits (6 vs 8)
When processing numeric-only strings, the length determines the ambiguity rules:
- A **6-digit string** is *always* validated as compact time first (`hhmiss`) regardless of `timeZone`. Only if time validation fails does Tempo try compact date layouts (`ddmmyy` or `mmddyy`).
- An **8-digit string** is checked as a compact date first, with month-day-year vs day-month-year decided by the active Region/`timeZone`.

To avoid ambiguity completely, prefer separators whenever you control the input format (e.g., `2026-04-01`, `04/01/2026`, or `01/04/2026`).

#### Manual Resolution Override
If you want to bypass the timezone detection, you can explicitly force the parser to use Month-Day logic:
```typescript
// Force MDY parsing
const t = new Tempo('04/01/2023', { monthDay: true }); 

// Force DMY parsing
const t3 = new Tempo('04/01/2023', { monthDay: { active: false } });
```

#### Customizing the `MONTH_DAY` Registry
The global `MONTH_DAY` registry defines the default rules for detection. You can augment this to support additional custom regions:
```typescript
Tempo.init({
  monthDay: {
    locales: ['en-CA'], // Add Canada to the MDY preference list
    timezones: {
      'en-CA': ['America/Toronto', 'America/Vancouver']
    }
  }
});
```

### Internationalized Parsing (Locales)
Tempo can be instructed to automatically generate language-specific parsing rules based on your `locale`. This enables parsing of translated months, weekdays, and relative events out-of-the-box!

You can provide either a single locale string or an **array of locales** to parse multiple languages simultaneously:

```typescript
Tempo.init({ locale: ['fr-FR', 'es-ES'] });

// Natively understand French, Spanish, AND English dates!
new Tempo('15 fevrier 2026');   // parses as "15 February 2026" (French)
new Tempo('15 febrero 2026');   // parses as "15 February 2026" (Spanish)
new Tempo('vendredi');          // parses as the closest "Friday"
```

> [!WARNING]
> **Cross-Locale Collisions**: In a multi-lingual lexer, if two languages share the exact same abbreviation/word for *different* dates (e.g. if "mai" meant May in French but March in another language), the parser will resolve a collision using **"Last-One-Wins"** logic based on your array order. The language that appears *last* in the `locale` array takes priority. Be deliberate in your array ordering to safely prioritize your primary language fallback!

#### How it Works & Accent Normalization
When non-English locales are provided, Tempo automatically uses the native `Intl` API to pre-generate lists of Months, Weekdays, and Relative terms ("yesterday", "today", "tomorrow").

It also automatically **normalizes and strips accents** from these generated rules. This means that if a user types `fevrier` (without the accent), it will still successfully fuzzy-match against the strictly translated `février`.

#### ⚠️ Current Limitations (What is NOT Available)
While `Intl` provides a robust foundation for month and weekday translations, there are limits to auto-localization:
*   **Duration Units**: Words representing duration units ("days", "weeks", "months", "hours") inside natural language strings are currently English-only.
*   **Grammar Structure**: The parser expects sequences matching standard English formats (e.g., `[value] [unit] [affix]`). Highly inflected languages or completely different phrase structures might fail to parse.

To bridge these gaps, you can register **Custom Aliases** (see below) or define custom localized keywords in `registry.modifiers`.

### Localized Parsing Modifiers
Tempo allows you to localize term modifiers (like `next`, `last`, `this`) by defining them in the `registry.modifiers` configuration. This lets you seamlessly mix localized terms into your relative string parsing and even use them in the `#` shorthand navigation engine!

```typescript
Tempo.init({
  locale: 'fr-FR',                // Natively translates months & weekdays
  registry: {
    modifiers: {
      '>': ['prochain', 'suivant'],
      '<': ['dernier', 'passé'],
      '=': ['ce', 'cette']
    }
  }
});

new Tempo('next Friday');         // English always works natively
new Tempo('vendredi prochain');   // Pure French localized string!
new Tempo('#qtr.dernier');        // Localized shorthand navigation
```

### Custom Aliases (Events & Periods)
You can teach the parser new words or entire foreign phrases to bridge translation gaps:

```typescript
Tempo.init({
  locale: 'fr-FR',
  registry: {
    events: {
      // Map a full foreign phrase directly to an English-equivalent relative string
      'le lendemain': 'tomorrow',
      // Or standard static events
      'launch': '2026-12-01',
      'party': () => 'next Friday 8pm'
    }
  }
});

const t1 = new Tempo('le lendemain'); // Parses accurately to tomorrow
const t2 = new Tempo('party');
```

### 🧠 Functional Alias Context
Functional Alias Context is a powerful API for creating dynamic, self-referential date definitions. Within an alias function, `this` provides access to the `AliasContext` instance:

- `this.set(input)`: Reset the context to a specific date/time.
- `this.add(duration)`: Add a Temporal-style duration (e.g. 'P1D').
- `this.toNow()`: Align context with current system time.
- `this.toDateTime()`: Resolve the context to a `Temporal.ZonedDateTime`.
- `this.yy` / `this.mm` / `this.dd`: Access current date components.
- `this.hh` / `this.mi` / `this.ss`: Access current time components.
- `this.tz` / `this.cal` / `this.config`: Access instance metadata.

```javascript
// Example: Dynamic 'meeting' alias
'meeting': function() {
    return this.set('2026-05-20').add('PT1H'); // Resolves to 2026-05-20T01:00:00
},
'bedtime': function() {
    return this.set('22:00').toDateTime();
}
```

#### Example: Complex Functional Alias
```typescript
Tempo.init({
  registry: {
    events: {
      // Resolve "bedtime" to 10pm on the same day
      'bedtime': function() {
        return this.set({ hour: 22, minute: 0, second: 0 });
      },
      // Resolve "meeting" to 2 hours after whatever was just parsed
      'meeting': function() {
        return this.add({ hours: 2 });
      }
    }
  }
});
```

---

## 🛡️ Performance: The Master Guard
Tempo uses a "Scan-and-Consume" engine called the **Master Guard**. This allows it to check your input string against dozens of patterns (weekdays, months, custom events) in a single pass.

In version **2.9.0**, the Master Guard has been optimized with a **Versioned Registry**. The engine now tracks a `#version` counter on the alias registry, ensuring that the guard's pattern list is only rebuilt when a mutation actually occurs. This provides near-instant validation for high-volume parsing tasks.
