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

const now = new Tempo('2026-05-10T08:00:00');
const xmas = new Tempo('2026-12-25');

// 1. Return an Extended Data Object (EDO)
const duration = now.until(xmas);

// 2. Or, calculate relative to a specific unit (returns a primitive Number)
now.until('afternoon', 'minutes'); // → 420    (example output: exactly 7 hours)
now.until('xmas', 'days');         // → 229    (example output: whole number — see note below)
now.until('xmas', 'weeks');        // → ~32.71 (example output: fractional)
now.until(now.add({ days: 2 }), 'hours'); // → 48 (targets can also be Temporal/Tempo instances)
```

::: tip Date-only targets inherit the current time
When a target resolves to a **date without a time component** (e.g. `'xmas'`, `'tomorrow'`, `'next friday'`), Tempo copies the current time-of-day from the anchor into the target. This means:

- `t.until('xmas', 'days')` → a **whole number** — the time components cancel out exactly.
- `t.until('xmas', 'hours')` → a **whole number** — same reason.
- `t.until('xmas', 'weeks')` → **fractional** — 229 days does not divide evenly into weeks.

This matches natural-language intuition: *"How many days until Christmas?"* expects `229`, not `229.43`. Targets with an **explicit time** (e.g. `'afternoon'`, `'9am'`) produce fractional values if the target time differs from the anchor's current time-of-day.
:::

### `.since()`
Calculates the time elapsed *since* a past date. By default, it returns a human-readable localized string (powered by `Intl.RelativeTimeFormat`).

```javascript
const anchor = new Tempo('2026-05-10', { locale: 'en-US' });
const birthday = new Tempo('1990-05-10');

// 1. Returns localized relative string based on the given unit
// Note: Tempo uses a compact ('narrow') Intl style by default
anchor.since(birthday, 'years');  // → "36y ago" (deterministic)
anchor.since(birthday, 'days');   // → "13,149d ago" (deterministic)

// 2. Pass a custom formatter for natural language output (e.g. "yesterday")
const yesterday = anchor.add({ days: -1 });
const autoFormat = new Intl.RelativeTimeFormat('en-US', { numeric: 'auto' });
anchor.since(yesterday, { unit: 'days', intl: { relativeTimeFormat: autoFormat.format.bind(autoFormat) } }); // → "yesterday"

// 3. Returns an ISO 8601 Duration String if no unit is provided
anchor.since(birthday);     // → "-P36Y..."
```

## The Duration Object (EDO)

When you call `until()` (or `Tempo.duration()`), Tempo returns an Extended Data Object (EDO) representing the exact duration.

```javascript
const dur = Tempo.duration('P1Y2M15D');
console.log(dur.years);   // 1
console.log(dur.months);  // 2
console.log(dur.days);    // 15
```

## Intelligent Balancing

::: warning Return Types
If you call `.until()` **without** a unit, it returns a `Tempo.Duration` object, onto which you can chain `.balance()` and `.format()` (see below). 
If you provide a unit (like `'days'`), it returns a primitive JavaScript `Number`. Calling `.balance()` on a Number will throw an error.
:::

Sometimes you have a raw number of days (e.g. `365 days`) and you want to mathematically "balance" it into larger units (like `1 year`). Tempo provides the `.balance()` method directly on the Duration object.

::: tip When to use .balance()
Because Tempo injects `{ largestUnit: 'years' }` by default, `.until()` is usually perfectly balanced out of the box. However, you will still need to chain `.balance()` in three specific scenarios:
1. **Raw Durations:** When you manually construct an unbalanced duration (e.g., `Tempo.duration({ days: 365 })`).
2. **Cross-Timezone Math:** If you run `.until()` between two *different* timezones, Tempo restricts the result to `hours` to prevent calendar ambiguity. Chaining `.balance()` forces the rollup into Years/Months.
3. **Nominal Math:** When you want to force commercial math (`{ nominal: true }`) instead of strict calendar math.
:::

### Strict Calendar Math
By default, `.balance()` uses a `relativeTo` anchor to perform perfect calendar math.

```javascript
// A manually created duration is unbalanced by default: { days: 365 }
const rawDuration = Tempo.duration({ days: 365 });

// Balance it using an anchor: safely converts it to { years: 1 } (or 11mo 30d if a leap year!)
const balanced = rawDuration.balance({ relativeTo: '2026-01-01' });
```

### Nominal (Commercial) Math
If you are building SaaS pricing tables or catalog displays, strict calendar math can be frustrating (you don't want a 365-day license to display as "11 months and 30 days" during a leap year). 

You can pass `{ nominal: true }` to mathematically force `365 days = 1 year`, `30 days = 1 month`, and `7 days = 1 week` regardless of the calendar.

```javascript
const commercialDur = Tempo.duration({ days: 365 }).balance({ nominal: true });
console.log(commercialDur.years); // 1
console.log(commercialDur.days);  // 0
```

### Balancing Downwards (Un-balancing)
You can also force a duration to roll *downwards* into smaller units by specifying a `largestUnit`. This is incredibly useful for UI countdown timers (e.g., displaying "48 Hours" instead of "2 Days") or per-diem billing calculations where you need to know exactly how many days are in a specific year.

```javascript
const yearlyLicense = Tempo.duration({ years: 1 });

// Un-balance the year down into exact days (365 or 366 depending on the anchor)
const exactDays = yearlyLicense.balance({ 
  largestUnit: 'days', 
  relativeTo: '2024-01-01' 
});

console.log(exactDays.days); // 366 (2024 is a leap year!)
```

## Formatting Absolute Durations

Once you have a balanced duration, you can instantly render it as a highly localized, plural-aware string using the `.format()` method.

`.format()` natively uses `Intl.DurationFormat` (or a robust multi-unit polyfill) to render all non-zero units perfectly into the user's language.

```javascript
// Perfect for detailed countdowns or SaaS dashboards!
const formatted = Tempo.duration({ days: 395, hours: 4 })
  // 'nominal: true' uses 365d/yr and 30d/mo math, so no relativeTo anchor is needed
  .balance({ nominal: true })
  .format();

console.log(formatted); // "1 year, 1 month, and 4 hours" (or localized equivalent)
```

### Global Configuration
You can also define default formatting options globally by adding `durationFormat` into your `Tempo.init` configuration.

```javascript
Tempo.init({
  intl: {
    durationFormat: { style: 'short' } // e.g. "1 yr, 1 mth, 4 hr" instead of long-form
  }
});

// Now, all format calls will automatically use 'short' display
const shortDur = Tempo.duration('P1Y1M').format(); // "1 yr, 1 mth"
```
