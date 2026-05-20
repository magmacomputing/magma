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

Tempo also provides a built-in **log-stamp** format for dropping a compact, sortable timestamp into a log entry:

```javascript
const t = new Tempo();
t.fmt.logStamp;  // → "20260520T135519.623319620"
//                      ^^^^^^^^ ^^^^^^ ^^^^^^^^^
//                      date     time   sub-seconds (nanosecond precision)
```

This format (`Tempo.FORMAT.logStamp`) is configurable via `Tempo.init`:
```javascript
Tempo.init({ formats: { logStamp: '{yyyy}-{mm}-{dd} {hh}:{mi}:{ss}' } });
new Tempo().fmt.logStamp;  // → "2026-05-20 13:55:19"
```

**Native Temporal 🐢**
```javascript
const now = Temporal.Now.plainDateTimeISO();
const target = Temporal.PlainDateTime.from('2026-12-25T00:00:00');
const duration = now.until(target); // Returns a complex Duration object
```

**Tempo 🚀**
Tempo understands natural language targets and can format the resulting difference flexibly. `t.until()` and `t.since()` have distinct return types:

```javascript
const t = new Tempo();

// t.until(target, unit) → number
t.until('afternoon', 'minutes'); // → 84.45  (fractional: 'afternoon' has a fixed time, e.g. 13:00)
t.until('xmas', 'days');         // → 219    (whole number — see note below)
t.until('xmas', 'weeks');        // → 31.28  (fractional — weeks don't divide evenly into days)

// t.until(target)       → Tempo.Duration object (with .iso, .years, .days, … fields)
t.until('xmas');         // → { iso: "P219DT0H0M0S", years: 0, months: 7, days: 4, ... }

// t.since(target, unit) → human-readable string via Intl.RelativeTimeFormat
t.since('yesterday', 'days');    // → "1d ago"

// t.since(target)       → ISO 8601 Duration string
t.since('yesterday afternoon');  // → "-P1DT9H32M19.402S"
```

> **💡 Date-only targets inherit the current time.**
> When a target resolves to a **date without a time component** (e.g. `'xmas'`, `'tomorrow'`, `'next friday'`),
> Tempo copies the current time-of-day from the anchor into the target. This means:
>
> - `t.until('xmas', 'days')` → a **whole number** — the time components cancel out exactly.
> - `t.until('xmas', 'hours')` → a **whole number** — same reason.
> - `t.until('xmas', 'weeks')` → **fractional** — 219 days does not divide evenly into weeks.
>
> This matches natural-language intuition: *"How many days until Christmas?"* expects `219`, not `219.43`.
> If you need the precise elapsed duration including sub-day components, omit the unit:
> ```javascript
> t.until('xmas'); // → { days: 219, hours: 0, minutes: 0, seconds: 0, ... }
> ```
>
> Targets with an **explicit time** (e.g. `'afternoon'`, `'9am'`, `'2026-12-25T08:00'`) always produce
> fractional values because the target time differs from the anchor's current time-of-day.