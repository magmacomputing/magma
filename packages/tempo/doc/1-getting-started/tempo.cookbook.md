# Tempo Cookbook

A collection of recipes for solving common date and time challenges using Tempo.

## Table of Contents
1. [The Basics](#the-basics)
2. [Parsing Challenges](#parsing-challenges)
3. [Manipulation and Calculations](#manipulation-and-calculations)
4. [Timezones and Locales](#timezones-and-locales)
5. [Business Logic and Terms](#business-logic-and-terms)
6. [Formatting and Localization](#formatting-and-localization)
7. [Interoperability](#interoperability)

---

## The Basics

### How do I get the current date and time?
By default, the constructor returns "now".
```typescript
const now = new Tempo();
console.log(now.toString());
```

### Get "Now" in UTC
```typescript
const utcNow = new Tempo({ timeZone: 'UTC' });
```

### How do I format a date for my UI?
Use the placeholder syntax in the `.format()` method.
```typescript
const t = new Tempo('2024-12-25');
t.format('{dd} {mon} {yyyy}');  // "25 December 2024"
t.format('{h12}:{mi}');         // "12:00am"
```

### How do I check if a date is valid?
```typescript
const t = new Tempo('invalid-date');
if (t.isValid) {
  // ...
}
```

### Global Configuration
You can initialize global defaults that apply to all future `Tempo` instances.
```typescript
Tempo.init({
  timeZone: 'UTC',
  locale: 'en-GB',
  silent: true
});
```
👉 **Learn More:** [Configuration Guide](../2-core-concepts/tempo.config.md)

---

## Parsing Challenges

### Parsing "Ambiguous" Digits (US vs UK)
Tempo intelligently resolves ambiguous dates like `04012026` based on your timezone.
```typescript
const us = new Tempo('04012026', { timeZone: 'America/New_York' }); 
console.log(us.format('{mon} {dd}')); // "April 01"
```
👉 **Learn More:** [Ambiguity Resolution Guide](../2-core-concepts/tempo.parse.md)

### Handling Relative Strings
Tempo natively understands human-readable offsets.
```typescript
new Tempo('yesterday');
new Tempo('next Friday');
new Tempo('2 weeks ago');
new Tempo('tomorrow afternoon');
```

👉 **Learn More:** You can seamlessly localize relative phrases (e.g. `next` to `prochain`) by reading the [Internationalized Parsing Guide](../2-core-concepts/tempo.parse.md#internationalized-parsing-locales).

### Parsing Unix Timestamps
Tempo handles both milliseconds (Number) and nanoseconds (BigInt).
```typescript
new Tempo(1716163200000);         // Milliseconds
new Tempo(1716163200000000000n);  // Nanoseconds
```

---

## Manipulation and Calculations

### Add or Subtract Time
Tempo instances are immutable; `add()` returns a new instance.
```typescript
const deadline = new Tempo().add({ days: 7, hours: 2 });
const past = new Tempo().add({ months: -1 });

// You can also step by semantic Terms using the `#` prefix!
const t1 = new Tempo('2024-05-15'); // Middle of Q2
const t2 = t1.add({ '#quarter': 1 }); // Middle of Q3: "2024-08-14" (approx)
```

### Jumping to Boundaries (`start`, `mid`, `end`)
The `.set()` method allows you to jump to the boundaries of native units (like months or years) or semantic Terms (using the `#` prefix). You can specify whether to land on the inclusive start, inclusive end, or the exact center.
```typescript
// Native Units
const monthStart = new Tempo().set({ start: 'month' });

// Semantic Terms (Lands on 30-Sep 23:59:59.999... Inclusive End)
const qtrEnd = new Tempo().set({ end: '#quarter' });

// Lands on the arithmetic nanosecond midpoint of the period
const qtrMid = new Tempo().set({ mid: '#quarter' });
```

### Slick Object Mutations
You can navigate relative to your current date by using Slick Shorthand operators directly inside `.set()`. Use the snippet shorthand keys (`yy`, `mm`, `ww`, `dd`, `wkd`, etc.) and provide a string payload containing a directional modifier:

```typescript
const t = new Tempo('2024-05-20'); // Monday
t.set({ mm: '>2' });               // July 20th
t.set({ wkd: '>Fri' });            // May 24th
```

👉 **Learn More:** To read about advanced chaining, order-of-operations, and architectural limitations, see the [Slick Object Mutations Deep Dive](../2-core-concepts/tempo.mutate.md#slick-object-mutations).

### How long until a deadline? (`until`)
```typescript
const t = new Tempo();
const daysLeft = t.until('2025-01-01', 'days');
console.log(`${daysLeft} days remaining`);
```

### Relative Time (`since`)
Generate human-readable relative time strings instantly.
```typescript
const t = new Tempo('yesterday');
console.log(t.since()); // "1d ago"
```

---

## Timezones and Locales

### Convert Time to Another Zone
```typescript
const nyc = new Tempo('2024-05-20 10:00', { timeZone: 'America/New_York' });
const london = nyc.set({ timeZone: 'Europe/London' });

console.log(nyc.format('{hh}:{mi}'));    // "10:00"
console.log(london.format('{hh}:{mi}')); // "15:00"
```

---

## Business Logic and Terms

### Is it the weekend?
```typescript
const t = new Tempo();
const isWeekend = t.dow >= 6; // Saturday = 6, Sunday = 7
```

### What Fiscal Quarter are we in?
Using the `qtr` Term plugin (`term.qtr` is a convenient alias for the full `term.quarter` property).
```typescript
const t = new Tempo();
console.log(`Current Quarter: ${t.term.qtr}`); // "Q1", "Q2", etc.
```

### Hemispheric Seasons
Tempo Terms are hemisphere-aware.
```typescript
const sydney = new Tempo('2024-07-01', { sphere: 'south' });
console.log(sydney.term.szn); // "Winter"

const london = new Tempo('2024-07-01', { sphere: 'north' });
console.log(london.term.szn); // "Summer"

// or even via the timeZone setting
console.log(new Tempo({ timeZone: 'America/New_York' }).term.szn); // "Summer"
console.log(new Tempo({ timeZone: 'Australia/Sydney' }).term.szn); // "Winter"
```

---

## Formatting and Localization

### Semantic Formatting
Use specific Term tokens like `{#quarter}` or `{#season}` to automatically embed a Term's label (or key) into a format string.
```typescript
const t = new Tempo();
console.log(t.format('We are currently in the {#quarter}')); // "We are currently in the First Quarter"
```

### Format Modifiers & Localization
Format strings support chained colon-modifiers (e.g., `:upper`, `:locale`, `:ord`) to dynamically change the presentation casing or delegate to the native `Intl` API. You can stack them to get the exact presentation required!

```typescript
const t = new Tempo('2024-05-15 15:30', { locale: 'fr-FR' });

t.format('{mon:upper}');             // "MAY" (English Default -> UpperCase)
t.format('{mon:long}');              // "mai" (Native French Intl output via styling bridge)
t.format('{mon:long:upper} {dd}');   // "MAI 15" (Native French Intl output)
```

👉 **Learn More:** See the [Smart Formatting Guide](../2-core-concepts/tempo.format.md) for the complete list of available modifiers.

::: tip
**Tired of typing styling modifiers?**  
If you find yourself repeatedly writing `:long` or `:short` for the same localized date structure, save it to the global **FORMATS** registry! This creates a clean, reusable shortcut:
```typescript
Tempo.init({
    locale: 'fr-FR',
    registry: {
        formats: {
            'ui-date': '{wkd:long}, {dd:raw} {mon:long} {yyyy}'
        }
    }
});

t.format('ui-date'); // Resolved with all modifiers intact!
```

*Note: Format keys are resolved case-sensitively from the global `registry.formats` object. If the requested key is not found, Tempo will simply treat the provided string as a literal layout string rather than throwing an error.*
:::

👉 **Learn More:** To build custom zero-overhead logic evaluators (like Fiscal Years or native Intl bridges), read the [Custom Format Tokens Deep Dive](../2-core-concepts/tempo.format.md#custom-format-tokens).

👉 **Learn More:** 
- [Smart Formatting Guide](../2-core-concepts/tempo.format.md)
- [The Role of Locale](../4-advanced-reference/tempo.locale.md)
- [Smart Parsing Guide](../2-core-concepts/tempo.parse.md)

---

### Ticker Plugin
The Ticker engine is a premium plugin for precisely driving business logic (like recurring billing or reporting cycles) on specific date boundaries.

```typescript
// Drive internal reporting precisely when a new quarter begins
await using quarterly = Tempo.ticker({ '#quarter': 1 });

for await (const t of quarterly) {
  generateReport(t.term.qtr);
}
```

👉 **Learn More:** See the [Ticker Plugin Documentation](../../../plugins/ticker/doc/index.md) for detailed configuration, term-driven intervals, and `await using` syntax requirements.


---

## Interoperability

### Converting to / from Native `Date`
```typescript
const date = new Tempo().toDate();
const tempo = new Tempo(new Date());
```

### Converting to `Temporal` Objects
```typescript
const zdt = new Tempo().toDateTime();  // Temporal.ZonedDateTime
const instant = new Tempo().toInstant(); // Temporal.Instant
const pdt = new Tempo().toPlainDate(); // Temporal.PlainDate
```

### Sorting an array of Tempos
```typescript
const dates = [new Tempo('tomorrow'), new Tempo('yesterday'), new Tempo('today')];
dates.sort(Tempo.compare); // Sorts chronologically
```

