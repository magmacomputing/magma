# Tempo Cookbook

A collection of recipes for solving common date and time challenges using Tempo.

## Table of Contents
1. [The Basics](#the-basics)
2. [Parsing Challenges](#parsing-challenges)
3. [Manipulation and Calculations](#manipulation-and-calculations)
4. [Timezones and Locales](#timezones-and-locales)
5. [Business Logic and Terms](#business-logic-and-terms)
6. [Interoperability](#interoperability)

---

## The Basics

### How do I get the current date and time?
By default, the constructor returns "now".
```typescript
const now = new Tempo();
console.log(now.toString());
```

### How do I format a date for my UI?
Use the placeholder syntax in the `.format()` method.
```typescript
const t = new Tempo('2024-12-25');
t.format('{dd} {mon} {yyyy}'); // "25 December 2024"
t.format('{h12}:{mi} {mer}');   // "12:00 am"
```

### How do I check if a date is valid?
```typescript
const t = new Tempo('invalid-date');
if (t.isValid) {
  // ...
}
```

### Global Configuration and Initialization
You can initialize global defaults that apply to all future `Tempo` instances.
```typescript
Tempo.init({
  timeZone: 'UTC',
  locale: 'en-GB',
  silent: true // Suppress console errors for expected parsing failures
});
```
Settings are inherited from library defaults, persistent storage, and your provided options.

---

## Parsing Challenges

### Parsing "Ambiguous" Digits (US vs UK)
Tempo uses your active timezone (or configured layout priorities) to resolve ambiguous dates like `04012026` (April 1st vs January 4th).

```typescript
// US Context (en-US)
const us = new Tempo('04012026', { timeZone: 'America/New_York' }); 
console.log(us.format('{mon} {dd}')); // "April 01"

// UK/Elsewhere Context (en-GB)
const uk = new Tempo('04012026', { timeZone: 'Europe/London' });
console.log(uk.format('{mon} {dd}')); // "January 04"
```

*For a detailed breakdown of how Tempo evaluates ambiguous inputs, handles 6-digit vs 8-digit compact strings, and how to explicitly override layout detection, read the [Ambiguity Resolution Guide](./tempo.month-day.md).*

### Handling Relative Strings
Tempo natively understands human-readable offsets.
```typescript
new Tempo('yesterday');
new Tempo('next Friday');
new Tempo('2 weeks ago');
new Tempo('tomorrow afternoon');
```

::: tip
**Looking for Internationalized Parsing?**  
Tempo can automatically translate months, weekdays, and relative terms (like 'yesterday', 'today', 'tomorrow') into foreign languages using your `locale` configuration. This is automatically enabled whenever you provide a non-English `locale` setting.

```typescript
const t = new Tempo('15 fevrier 2026', { locale: 'fr-FR' });
console.log(t.format('{mon}')); // "February"
```

*See the [Smart Parsing Guide](./tempo.parse.md#internationalized-parsing-locales) for full documentation and current capabilities.*
:::

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
```

### How do I jump to Term boundaries?
Use the `#` prefix with `start` or `end` to jump to semantic boundaries like Quarters or Seasons.
```typescript
const qtrStart = new Tempo().set({ start: '#quarter' });
const sznEnd = new Tempo().set({ end: '#season' });
```

### How long until a deadline?
```typescript
const t = new Tempo();
const daysLeft = t.until('2025-01-01', 'days');
console.log(`${daysLeft} days remaining`);
```

### Precision Manipulation (`end` vs `mid`)
When using `.set()` with a Term anchor (like `#qtr`), you can specify whether to land on the inclusive end or the exact center.
```typescript
// Lands on 30-Sep 23:59:59.999... (Inclusive End)
const qtrEnd = new Tempo().set({ end: '#qtr' });

// Lands on the arithmetic nanosecond midpoint of the period
const qtrMid = new Tempo().set({ mid: '#qtr' });
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

### Get "Now" in UTC
```typescript
const utcNow = new Tempo({ timeZone: 'UTC' });
```

### High-Performance Relative Time (`since`)
Tempo memoizes `Intl.RelativeTimeFormat` objects internally for efficiency.
```typescript
const t = new Tempo('yesterday');
console.log(t.since()); // "1d ago" (narrow style)

// For maximum performance in tight loops, pass a pre-allocated formatter
const rtf = new Intl.RelativeTimeFormat('fr', { style: 'long' });
for (const entry of logEntries) {
  // Use the new grouped API: pass the formatter's format function directly as an option
  console.log(new Tempo(entry.ts).since({ intl: { relativeTimeFormat: rtf.format.bind(rtf) } }));
}
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

### Unified Term Math
Tempo allows you to shift dates by semantic "steps" while preserving your relative position within the Term.
```typescript
const t1 = new Tempo('2024-05-15'); // Middle of Q2
const t2 = t1.add({ '#quarter': 1 }); // Middle of Q3: "2024-08-14" (approx)
```

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
t.format('{mon:locale:upper} {dd:ord}'); // "MAI 15e"
t.format('{#tod:lower}');       // "afternoon" (Modifies the native TitleCase Term plugin)
t.format('{mer:upper}');        // "PM" (Some users prefer uppercase meridiem)
```

::: tip
**Tired of typing `:locale`?**  
If you find yourself repeatedly writing `:locale` for the same date structure, save it to the global **FORMATS** registry! This creates a clean, reusable shortcut:
```typescript
Tempo.init({
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

#### Global LOCALE Registry
The easiest way to augment or override translations globally is via the `locales` configuration option. Translations added here will apply to *any* plugin that resolves the specified key:
```typescript
Tempo.init({
    locale: 'fr-FR',
    registry: {
        locales: {
            fr: {
                morning: 'Matinée',
                afternoon: 'Après-midi',
                // Supports functions for dynamic resolution!
                ordinal: (n) => n === 1 ? '1er' : `${n}e`
            }
        }
    }
});

const t = new Tempo('2024-05-15 10:30', { locale: 'fr-FR' });
console.log(t.format('{#tod:locale}')); // "Matinée"
```

#### Term Bundled Dictionary
Plugin authors can optionally bundle a `locale` dictionary directly into their custom Term definition:
```typescript
Tempo.extend({
    terms: [{
        key: 'shift',
        label: 'Shift',
        locale: {
            es: 'Turno',
            de: 'Schicht'
        },
        // ... logic
    }]
});
```
*Note: A user's Global `locales` config will always take precedence over a plugin's bundled dictionary.*

#### Complex Native Intl Formatting

While Tempo's template tokens (`{dd}`, `{mon}`, etc.) combined with the `:locale` modifier are incredibly powerful for structured formats, there are times when you want the full power of the native `Intl.DateTimeFormat` API for complete, culturally-specific sentence formatting (like Arabic numerals or full-length descriptive dates). 

Because Tempo's philosophy is to "humanize" the rigid `Temporal` API, you can pass an `Intl.DateTimeFormatOptions` object *directly* into the `.format()` method. Tempo will automatically align the internal timezone and calendar constraints for you, bypassing the strict `RangeError` and `TypeError` exceptions that the native spec normally throws.

**Tempo vs Temporal (Side-by-Side):**

```typescript
const arabicConfig = {
  locale: 'ar-EG',
  timeZone: 'Africa/Cairo',
  weekday: 'long',
  year: 'numeric',
  month: 'long',
  day: 'numeric',
  numberingSystem: 'arab'
}

// 🔴 Native Temporal (Strict & Verbose)
// 1. You must carefully parse the date using the correct Temporal factory.
// 2. You must manually shift the timezone before formatting, or it throws an exception!
const nativeStr = Temporal.PlainDateTime
  .from('2024-12-25T14:30:00')
  .toZonedDateTime('UTC')
  .withTimeZone('Africa/Cairo')
  .toLocaleString('ar-EG', arabicConfig);

// 🟢 Tempo (Humanized)
// Automatically handles the parsing, shifts constraints, and safely delegates to Intl!
const tempoStr = new Tempo('2024-12-25 14:30')
  .format(arabicConfig);

console.log(tempoStr); // "الأربعاء، ٢٥ ديسمبر ٢٠٢٤"
```

```typescript
// Example: Japanese Reiwa Era formatting
const t = new Tempo('2024-12-25 14:30');

const japaneseConfig = {
  locale: 'ja-JP-u-ca-japanese',
  timeZone: 'Asia/Tokyo',
  calendar: 'japanese',
  era: 'long',
  year: 'numeric',
  month: 'long',
  day: 'numeric'
}

console.log(t.format(japaneseConfig));
// Output: "令和6年12月25日"
```

---

::: info
The examples below use the `using` and `await using` syntax, which require **TypeScript 5.2+** and a runtime that supports **TC39 Explicit Resource Management**.
:::

### ⚠️ Ticker Plugin Initialization

The Ticker engine is a premium feature. Before using `Tempo.ticker()` in the examples below, you must import the plugin, initialize Tempo with your valid license, and extend it with the `TickerModule`.

<div style="display: flex; align-items: center; gap: 16px; margin: 16px 0;">
  <a href="https://registry.magmacomputing.com.au" target="_blank" rel="noopener noreferrer" style="display: flex; flex-shrink: 0;">
    <img src="https://registry.magmacomputing.com.au/registry-logo.svg" width="48" height="48" alt="Tempo License Registry" style="margin: 0;" />
  </a>
  <div>
    <strong><a href="https://registry.magmacomputing.com.au" target="_blank" rel="noopener noreferrer">👉 Go to the Tempo License Registry 👈</a></strong><br>
    Manage your subscriptions and retrieve your license key.
  </div>
</div>

```typescript
import { Tempo } from '@magmacomputing/tempo';
import { TickerModule } from '@magmacomputing/tempo-plugin-ticker';

// 1. Initialize with your JWT license
Tempo.init({ license: 'YOUR_JWT_LICENSE_HERE' });

// 2. Extend Tempo with the Ticker Module
Tempo.extend(TickerModule);
```

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

*The Ticker plugin supports many more patterns including manual sync, daily shift management, and explicit resource disposal. See the [Ticker Plugin Documentation](https://magmacomputing.github.io/tempo-plugin-docs/ticker/) for full capability details.*

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

### Registry and Formats Configurations
You can extend the built-in registries (e.g. `formats`, `locales`) and toggle formatting preferences using the nested `registry` and `format` properties.

```typescript
Tempo.init({
  locale: 'fr-FR',
  registry: {
    formats: {
      'customDate': '{dd} {mon:upper} {yyyy} - {h12}:{mi}'
    }
  },
  format: {
    localize: true // Automatically applies the :locale modifier to {mon}
  }
});

const t = new Tempo('2026-06-03 14:30');
console.log(t.format('customDate')); // "03 JUIN 2026 - 02:30pm"
```
