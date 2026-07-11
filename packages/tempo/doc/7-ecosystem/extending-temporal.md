# 🤝 Extending Native Temporal

> [!IMPORTANT]
> **Tempo is NOT a replacement for Native Temporal.** 
> Temporal provides an excellent, mathematically sound foundation for dates in JavaScript, and Tempo is built directly on top of it. Tempo acts as a developer-friendly wrapper that eliminates boilerplate and makes common tasks effortless, while retaining the rock-solid reliability of Temporal under the hood.

To complement Temporal's explicit strictness, Tempo adds:
* **Flexibility**: Out-of-the-box natural language parsing and intelligent formatting.
* **Convenience**: Extensive getters, method chaining, and zero-configuration defaults.
* **Configurability**: Dynamic semantic aliases for resolving events and periods.
* **Extensibility**: A lazy-loaded plugin architecture for domain-specific calculations.

Here is a side-by-side comparison demonstrating how Tempo drastically reduces boilerplate for standard operations, while unlocking capabilities that are difficult to achieve with native Temporal alone.

## 1. Parsing: Strict vs. Intelligent

Temporal only accepts strict ISO 8601 strings. If you have user input, database dumps, or human-readable dates, you have to write your own parser first. Tempo handles it out-of-the-box.

**Native Temporal ❌**
```javascript

Temporal.PlainDate.from('2026/01/24');    // Throws RangeError: invalid ISO 8601 string
Temporal.PlainDate.from('next Friday');   // Throws RangeError: invalid ISO 8601 string
```

**Tempo ✅**
```javascript

new Tempo('2026/01/24');                  // Parses perfectly
new Tempo('next Friday');                 // Parses relative natural language perfectly
```

For more information on handling natural language and complex strings, read the dedicated **[Parsing Guide](../2-core-concepts/tempo.parse.md)**.

## 2. Formatting: Verbose vs. Expressive Tokens

Temporal relies on the `Intl.DateTimeFormat` API for formatting. While powerful for localization, it is incredibly verbose for simple, specific string outputs.

**Native Temporal 🐢**
```javascript
const date = Temporal.Now.plainDateISO();
date.toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });  // Output: "24 Jan 2026"
```

**Tempo 🚀**
```javascript
const t = new Tempo('2026-01-24T12:00:00');

// Use the format method to create custom formats, or use the pre-built getters (on the 'fmt' property)
t.format('{dd} {mmm} {yyyy}');            // Output: "24 Jan 2026"
t.fmt.date;                               // Output: "2026-01-24"
```

For comprehensive examples of localized output and custom layouts, read the dedicated **[Formatting Guide](../2-core-concepts/tempo.format.md)**.

## 3. Extensibility: Domain-Specific Logic

Native Temporal deals strictly with standard calendar units (days, months, years). If you need to map a date to domain-specific logic (like a fiscal quarter or a meteorological season), you have to write and maintain your own math utilities.

**Native Temporal 🐢**
```javascript
const date = Temporal.Now.plainDateISO();

// 1. Calculate the fiscal quarter
const month = date.month;
const fiscalQuarter = `Q${Math.ceil(month / 3)}`; // Manual math

// 2. Calculate the meteorological season (Northern Hemisphere)
let season;
if (month === 12 || month <= 2) season = 'Winter';
else if (month >= 3 && month <= 5) season = 'Spring';
else if (month >= 6 && month <= 8) season = 'Summer';
else season = 'Autumn';

// And what if you need to support the Southern Hemisphere? 
// You have to write and maintain even more utility functions.
```

**Tempo 🚀**
Tempo solves this elegantly using the **Terms** plugin system. Terms are lazy-loaded plugins that evaluate the current date against semantic boundaries without adding memory bloat.

```javascript
const t = new Tempo('2026-01-24T12:00:00', { sphere: 'north' });

// Built-in complex Terms via the standard plugin
t.term.qtr; // → 'Q1' (Calculates fiscal quarter)
t.term.szn; // → 'Winter' (Calculates meteorological season, respecting hemisphere)
```

For more information on adding your own domain-specific logic, read the dedicated **[Terms Guide](../3-extending-tempo/tempo.term.md)**.

## 4. Duration Logic: Strict Math vs. Human Readable

Calculating the difference between two dates in native Temporal is mathematically sound, but it strictly returns a `Temporal.Duration` object. Tempo gives you the flexibility to return a `Duration` object, a precise floating-point number, or a human-readable string.



**Native Temporal 🐢**
```javascript
// 1. Calculate the raw duration
const now = Temporal.Now.plainDateISO();
const target = Temporal.PlainDate.from('2026-12-25');
now.until(target); // → Returns a complex Duration object

// 2. Format a past date into a human-readable string (relative to a fixed point)
const refDate = Temporal.PlainDate.from('2026-07-09');
const pastDate = Temporal.PlainDate.from('2026-07-06');
const diff = pastDate.until(refDate, { largestUnit: 'days' });
const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
rtf.format(-Math.abs(diff.days), 'day'); // → "3 days ago"
```

**Tempo 🚀**
Tempo understands natural language targets and provides multiple ways to measure and format the resulting elapsed time. 

```javascript
const t = new Tempo();

// 1. .until() returns an EDO or a precise number
t.until('2026-12-25').duration; // → The underlying Temporal.Duration object
t.until('2026-12-25', 'days');  // → 219

// 2. .since() instantly returns human-readable relative strings
const t2 = new Tempo('2026-07-09');
t2.since('2026-07-06', 'days'); // → "3 days ago"
```

- `t.until()` returns a highly functional Extended Data Object (EDO) or a precise decimal number depending on your arguments.
- `t.since()` leverages `Intl.RelativeTimeFormat` to instantly return human-readable relative strings (like "3 days ago").

For comprehensive examples of duration mathematics, intelligent balancing, and localization formatting, read the dedicated **[Duration Logic Guide](../2-core-concepts/tempo.duration.md)**.