# Smart Parsing Guide

Tempo's strongest feature is its flexible, natural-language parsing engine. While native `Temporal` is strictly ISO-only, Tempo can interpret a vast range of human-friendly date and time expressions.

## 🚀 Standalone Parsing (Zero-Overhead)

If you only need Tempo's "Smart" parsing but want to keep your project lightweight, you can use the standalone `parse` function. This returns a native `Temporal.ZonedDateTime` without importing the full `Tempo` class.

```typescript
import { parse } from '@magmacomputing/tempo/parse';

// Returns a native Temporal.ZonedDateTime
const zdt = parse('next Tuesday at 3pm', { timeZone: 'Australia/Sydney' });

console.log(zdt.toString()); // 2026-04-28T15:00:00+10:00[Australia/Sydney]
```

### Why use Standalone Parse?
*   **Tree-Shaking**: Your bundler can skip the entire `Tempo` class and its associated methods, significantly reducing your bundle size.
*   **Temporal Native**: Perfect for projects that already use native `Temporal` objects but need a friendlier input layer for users.
*   **Strict by Default**: The standalone function defaults to `mode: 'strict'`, ensuring that it won't "guess" if the input is ambiguous.

---

## 🏗️ Class-Based Parsing

When using the `Tempo` class, parsing is handled automatically by the constructor.

```typescript
import { Tempo } from '@magmacomputing/tempo';

const t = new Tempo('2 days ago');
```

### Supported Formats
The engine can interpret:
*   **ISO Strings**: `2024-05-20T10:00:00Z`
*   **Short Dates**: `20-May`, `May 20` (locale-aware)
*   **Relative Strings**: `next Monday`, `last Friday`, `2 days ago`
*   **Numbers/BigInt**: Unix timestamps in milliseconds or nanoseconds.
*   **Temporal Objects**: `ZonedDateTime`, `PlainDate`, `PlainDateTime`.

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

## 🌍 TimeZone & Locale Awareness

Tempo uses your configuration to resolve ambiguous dates.

### US-Style Dates (`MM/DD/YYYY`)
If you parse a numeric string like `04012026`, Tempo uses your `timeZone` to decide if it means **April 1st** (US) or **4th of January** (UK/AU).

```typescript
const us = new Tempo('04012026', { timeZone: 'America/New_York' }); // Apr 1
const au = new Tempo('04012026', { timeZone: 'Australia/Sydney' });  // Jan 4
```

### Custom Aliases (Events & Periods)
You can teach the parser new words:

```typescript
Tempo.init({
  event: {
    'launch': '2026-12-01',
    'party': () => 'next Friday 8pm'
  }
});

const t = new Tempo('party');
```

---

## 🛡️ Performance: The Master Guard
Tempo uses a "Scan-and-Consume" engine called the **Master Guard**. This allows it to check your input string against dozens of patterns (weekdays, months, custom events) in a single pass, ensuring that parsing remains $O(1)$ relative to the number of plugins you have active.
