---
outline: deep
---

# Duration Logic

Tempo provides a powerful `DurationModule` for calculating, balancing, and formatting the elapsed time between two dates.

Because Tempo wraps the modern `Temporal` API, durations are highly accurate, seamlessly handling leap years, daylight saving time boundaries, and variable month lengths.

## Calculating Durations

Tempo offers two primary methods for calculating the difference between dates: `.until()` and `.since()`.

### `.until()`
Calculates the time remaining from the Tempo instance *until* a future date.

```javascript
import { Tempo } from '@magmacomputing/tempo';

const now = new Tempo();
const xmas = new Tempo('2026-12-25');

// 1. Return an Extended Data Object (EDO)
const duration = now.until(xmas);

// 2. Or, calculate relative to a specific unit (returns a primitive Number)
now.until('afternoon', 'minutes'); // → 84.45  (fractional: 'afternoon' has a fixed time)
now.until('xmas', 'days');         // → 219    (whole number — see note below)
now.until('xmas', 'weeks');        // → 31.28  (fractional — weeks don't divide evenly into days)
now.until(Tempo.now(), 'hours');   // → 48     (targets can also be Temporal/Tempo instances)
```

::: tip Date-only targets inherit the current time
When a target resolves to a **date without a time component** (e.g. `'xmas'`, `'tomorrow'`, `'next friday'`), Tempo copies the current time-of-day from the anchor into the target. This means:

- `t.until('xmas', 'days')` → a **whole number** — the time components cancel out exactly.
- `t.until('xmas', 'hours')` → a **whole number** — same reason.
- `t.until('xmas', 'weeks')` → **fractional** — 219 days does not divide evenly into weeks.

This matches natural-language intuition: *"How many days until Christmas?"* expects `219`, not `219.43`. Targets with an **explicit time** (e.g. `'afternoon'`, `'9am'`) always produce fractional values because the target time differs from the anchor's current time-of-day.
:::

### `.since()`
Calculates the time elapsed *since* a past date. By default, it returns a human-readable localized string (powered by `Intl.RelativeTimeFormat`).

```javascript
const now = new Tempo({ locale: 'en-US' });
const birthday = new Tempo('1990-05-10');

// 1. Returns localized relative string based on the given unit
now.since(birthday, 'years');  // → "36 years ago" (depending on locale)
now.since(birthday, 'days');   // → "13,150 days ago"

// 2. Pass a custom formatter for natural language output (e.g. "yesterday")
const yesterday = now.add({ days: -1 });
const autoFormat = new Intl.RelativeTimeFormat('en-US', { numeric: 'auto' });
now.since(yesterday, { unit: 'days', intl: { relativeTime: { format: autoFormat } } }); // → "yesterday"

// 3. Returns an ISO 8601 Duration String if no unit is provided
now.since(birthday);     // → "-P36Y..."
```

::: info Return Type
Because `.since()` automatically renders a localized string, it returns a primitive JavaScript `String`. Therefore, chaining `.balance()` or `.format()` (see below) onto `.since()` is not possible and will throw an error.
:::

## The Duration Object (EDO)

When you call `until()` (or `Tempo.duration()`), Tempo returns an Extended Data Object (EDO) representing the exact duration.

```javascript
const dur = Tempo.duration('P1Y2M15D');
console.log(dur.years); // 1
console.log(dur.months); // 2
console.log(dur.days); // 15
```

## Intelligent Balancing

::: warning Return Types
If you call `.until()` **without** a unit, it returns a `Tempo.Duration` object, onto which you can chain `.balance()` and `.format()` (see below). 
If you provide a unit (like `'days'`), it returns a primitive JavaScript `Number`. Calling `.balance()` on a Number will throw an error.
:::

Sometimes you have a raw number of days (e.g. `365 days`) and you want to mathematically "balance" it into larger units (like `1 year`). Tempo provides the `.balance()` method directly on the Duration object.

### Strict Calendar Math
By default, `.balance()` uses the `relativeTo` anchor captured during `.until()` to perform perfect calendar math.

```javascript
// Automatically balances 365 days into exactly "1 year" (or 11mo 30d if a leap year!)
const balanced = new Tempo().until('xmas').balance();
```

### Nominal (Commercial) Math
If you are building SaaS pricing tables or catalog displays, strict calendar math can be frustrating (you don't want a 365-day license to display as "11 months and 30 days" during a leap year). 

You can pass `{ nominal: true }` to mathematically force `365 days = 1 year`, `30 days = 1 month`, and `7 days = 1 week` regardless of the calendar.

```javascript
const commercialDur = Tempo.duration({ days: 365 }).balance({ nominal: true });
console.log(commercialDur.years); // 1
console.log(commercialDur.days);  // 0
```

## Formatting Absolute Durations

Once you have a balanced duration, you can instantly render it as a highly localized, plural-aware string using the `.format()` method.

`.format()` automatically looks for the largest non-zero unit and uses `Intl.NumberFormat` to translate it perfectly into the user's language.

```javascript
// Perfect for SaaS Pricing Cards!
const formatted = Tempo.duration({ days: 365 })
  .balance({ nominal: true })
  .format();

console.log(formatted); // "1 year" (or "1 año", "1 an" depending on navigator.language)
```

### Global Configuration
You can also define default formatting options globally by adding `numberFormat` into your `Tempo.init` configuration.

```javascript
Tempo.init({
  intl: {
    numberFormat: { unitDisplay: 'short' } // e.g. "1 yr" instead of "1 year"
  }
});

// Now, all format calls will automatically use 'short' display
const shortDur = Tempo.duration('P1Y').format(); // "1 yr"
```
