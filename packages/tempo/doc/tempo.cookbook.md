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
👉 **Learn More:** [Configuration Guide](./tempo.config.md)

---

## Parsing Challenges

### Parsing "Ambiguous" Digits (US vs UK)
Tempo intelligently resolves ambiguous dates like `04012026` based on your timezone.
```typescript
const us = new Tempo('04012026', { timeZone: 'America/New_York' }); 
console.log(us.format('{mon} {dd}')); // "April 01"
```
👉 **Learn More:** [Ambiguity Resolution Guide](./tempo.parse.md)

### Handling Relative Strings
Tempo natively understands human-readable offsets.
```typescript
new Tempo('yesterday');
new Tempo('next Friday');
new Tempo('2 weeks ago');
new Tempo('tomorrow afternoon');
```

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
You can navigate relative to your current date by using Slick Shorthand operators inside `.set()`. Use the snippet shorthand keys (`yy`, `mm`, `ww`, `dd`, `wkd`, etc.) and provide a string payload containing a directional modifier:

```typescript
const t = new Tempo('2024-05-20'); // Monday

// Jump forward two months
t.set({ mm: '>2' }); // July 20th

// Jump to the next Friday
t.set({ wkd: '>Fri' }); // May 24th

// Jump to the previous Wednesday
t.set({ wkd: '<Wed' }); // May 15th
```

Because `.set()` processes keys in insertion order, you can now effortlessly combine **absolute assignments** and **Slick shifts** in a single pass to build complex boundaries:

```typescript
// Jump 2 months forward, find the next Friday, and set the time to 10:30 AM
const t2 = t.set({ 
  mm: '>2', 
  wkd: '>Fri', 
  hour: 10, 
  minute: 30 
});
```

::: warning ⚠️ ESLint `sort-keys` Warning
Because mixed object payloads execute strictly in the order they are defined, you must be careful if you use aggressive automated linters (like ESLint's `sort-keys` auto-fixer). If your linter alphabetically re-orders your properties, your math will execute in the wrong order! If your codebase forces alphabetical object keys, stick to chaining: `t.set({ mm: '>2' }).set({ wkd: '>Fri' })`.
:::

This syntax fully supports advanced shifting (e.g. `<=`, `>=`), double-negations (`>-2`), and localized modifier aliases, providing a clean programmatic interface for date construction.

::: info 💡 Why can't I use Slick modifiers on timezones (`tzd`)?
Changing a timezone (`tzd` or `timeZone`) does not traverse the timeline—it merely changes the local representation of the exact same absolute moment in time. Because no temporal displacement occurs, applying directional Slick modifiers (like `>`) to a timezone is logically invalid and unsupported.
:::

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
Format strings support chained colon-modifiers (`:modifier`) to dynamically change the presentation casing or delegate to the native `Intl` API!

*   `:lower` (Lowercase)
*   `:upper` (Uppercase)
*   `:title` (Titlecase)
*   `:ord` (Ordinal suffix, e.g. "th", "st", "nd")
*   `:locale` (Delegates deeply localized tokens like `{mon}` or `{wkd}` directly to `Intl.DateTimeFormat`)

Modifiers can be stacked endlessly to get the exact presentation required:
```typescript
const t = new Tempo('2024-05-15 15:30', { locale: 'fr-FR' });

t.format('{mon:upper}');        // "MAY" (Default English TitleCase -> UpperCase)
t.format('{mon:locale}');       // "mai" (Native French Intl output)
t.format('{mon:locale:upper} {dd}'); // "MAI 15" (Native French Intl output)
t.format('{#tod:lower}');       // "afternoon" (Modifies the native TitleCase Term plugin)
t.format('{mer:upper}');        // "PM" (Some users prefer uppercase meridiem)
```

::: tip
**Tired of typing `:locale`?**  
If you find yourself repeatedly writing `:locale` for the same date structure, save it to the global **FORMATS** registry! This creates a clean, reusable shortcut:
```typescript
Tempo.init({
    locale: 'fr-FR',
    registry: {
        formats: {
            'ui-date': '{wkd:locale}, {dd:raw} {mon:locale} {yyyy}'
        }
    }
});

t.format('ui-date'); // Resolved with all modifiers intact!
```

*Note: Format keys are resolved case-sensitively from the global `registry.formats` object. An error will be thrown if the requested key is not found in the registry.*
:::

### Custom Format Tokens
Need a completely custom format behavior? You can define dynamic token evaluators in the registry that receive the `zdt` (Temporal.ZonedDateTime) instance and a context object, giving you full native access to `Intl` formatting or custom logic.

```typescript
Tempo.init({
    locale: 'fr-FR',
    registry: {
        tokens: {
            // A simple math-based token
            'myDay': (zdt) => zdt.day - 1,
            
            // A deeply localized custom token using native Intl
            'wkd-fr': (zdt, { config }) => {
                const dtOptions = config?.intl?.dateTimeFormat ?? {};
                return zdt.toLocaleString(config?.locale ?? 'en', { ...dtOptions, weekday: 'long' });
            }
        }
    }
});

const t = new Tempo('2024-05-20');
t.format('{myDay}');  // "19"
t.format('{wkd-fr}'); // "lundi"
```

👉 **Learn More:** 
- [Smart Formatting Guide](./tempo.format.md)
- [The Role of Locale](./tempo.locale.md)
- [Smart Parsing Guide](./tempo.parse.md)

---

::: info
The examples below use the `using` and `await using` syntax, which require **TypeScript 5.2+** and a runtime that supports **TC39 Explicit Resource Management**.
:::

### Ticker Plugin
The Ticker engine is a premium feature. 
👉 **Learn More:** [Ticker Plugin Documentation](https://magmacomputing.github.io/tempo-plugin-docs/ticker/)


### Interval-Based Ticker (Recurring Billing)
Use a `seed` to anchor your ticker to a specific day, then use a month-based interval:

```typescript
await using billing = Tempo.ticker({ 
  months: 1, 
  seed: '2024-01-15' 
}, (t) => processPayment(t));
```

### Term-Driven Ticker (Fiscal Quarter Reporting)
Drive internal reporting cycles precisely when a new quarter begins:

```typescript
await using quarterly = Tempo.ticker({ '#quarter': 1 });

for await (const t of quarterly) {
  generateReport(t.term.qtr);
}
```


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

