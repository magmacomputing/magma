# 🆚 Tempo vs. Native Temporal

While `Temporal` provides an excellent, mathematically sound foundation for dates in JavaScript, it is designed to be highly explicit and strict. **Tempo** acts as a developer-friendly wrapper that eliminates boilerplate and makes common tasks effortless, while still giving you the rock-solid reliability of Temporal under the hood.

To enhance (not replace) Temporal's strictness, Tempo adds:
* flexibility (through its parsing engine and output formatting),
* convenience (through its many getters and methods),
* configurability (through its dynamic aliases (events, periods)),
* business logic (through its lazy-loaded plugin system (Terms))

Here is a side-by-side comparison of how you achieve the same outcomes, as well as things Tempo can do that native Temporal cannot easily.

### 1. Parsing: Strict vs. Flexible

Temporal only accepts strict ISO 8601 strings. If you have user input, database dumps, or human-readable dates, you have to write your own parser first. Tempo handles it out-of-the-box.

**Native Temporal ❌**
```javascript

Temporal.PlainDate.from('2026/01/24');    // Throws RangeError: invalid ISO 8601 string
Temporal.PlainDate.from('next Friday');   // Throws RangeError
```

**Tempo ✅**
```javascript

new Tempo('2026/01/24');                  // Parses perfectly
new Tempo('next Friday');                 // Parses relative natural language perfectly
```

### 2. Formatting: Verbose vs. Simple Tokens

Temporal relies on the `Intl.DateTimeFormat` API for formatting. While powerful for localization, it is incredibly verbose for simple, specific string outputs.

**Native Temporal 🐢**
```javascript
const date = Temporal.Now.plainDateISO();
date.toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });  // Output: "24 Jan 2026"
```

**Tempo 🚀**
```javascript
const t = new Tempo();

// Use the format method to create custom formats, or use the pre-built getters (on the 'fmt' property)
t.format('{dd} {mmm} {yyyy}');            // Output: "24 Jan 2026"
t.fmt.date;                               // Output: "2026-01-24"
```

### 3. Business Logic & Complex Terms

Native Temporal deals strictly with standard calendar units (days, months, years). If you need to map a date to domain-specific business logic (like a fiscal quarter or a meteorological season), you have to write and maintain your own math utilities.

**Native Temporal 🐢**
```javascript
const date = Temporal.Now.plainDateISO();

// To find the fiscal/calendar quarter... 
const month = date.month;
const fiscalQuarter = `Q${Math.ceil(month / 3)}`; // Manual math

// What if your fiscal year starts in July? Or you need meteorological seasons?
// Write more complex utility functions and import them everywhere.
```

**Tempo 🚀**
Tempo solves this elegantly using the **Terms** plugin system. Terms are lazy-loaded plugins that evaluate the current date against semantic boundaries without adding memory bloat.

```javascript
const t = new Tempo();

// Built-in complex Terms via the standard plugin
t.term.qtr; // → 'Q1' (Calculates fiscal quarter)
t.term.szn; // → 'Summer' (Calculates meteorological season, respecting hemisphere)
```

For more information on adding your own business logic, see the [Terms Guide](tempo.term.md).

### 4. Relative Time & Duration Strings

Calculating the difference between two dates in native Temporal is mathematically sound, but it strictly returns a `Temporal.Duration` object. Tempo gives you the flexibility to return a `Duration` object, a precise floating-point number, or a human-readable string.

**Native Temporal 🐢**
```javascript
const now = Temporal.Now.plainDateTimeISO();
const target = Temporal.PlainDateTime.from('2026-12-25T00:00:00');
const duration = now.until(target); // Returns a complex Duration object
```

**Tempo 🚀**
Tempo understands natural language targets and can easily format the resulting difference to match your needs.

```javascript
const t = new Tempo();

// Return a precise floating-point number by specifying a unit
t.until('3pm', 'minutes');      // → 5.046264992345
t.until('xmas', 'days');        // → 289.58470466349036

// If no unit is provided, it returns a Duration object
t.until('xmas');                // → { years: 0, months: 9, days: 14, ... }

// Human-readable 'time ago' string formatting
t.since('yesterday', 'days');   // → "1d ago"
t.since('yesterday afternoon'); // → "-P1DT9H32M19.402S" (ISO string format)
```