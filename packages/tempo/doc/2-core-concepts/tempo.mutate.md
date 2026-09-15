# Mutation & Math

Tempo's API for modifying instances is intentionally microscopic. Rather than bloating the prototype with dozens of distinct methods (`.addDays()`, `.subMonths()`, `.startOf()`, etc.), Tempo provides unified utilities that natively support intuitive shorthand strings.

> [!IMPORTANT] Immutability & Chainability
> All mutation methods in Tempo (`.add()`, `.subtract()`, `.set()`) are strictly **immutable**. They never modify the original instance. Instead, they evaluate the change and return a **new `Tempo` instance**, ensuring absolute safety and allowing for predictable method chaining.

## The `.add()` Method

The `.add()` method returns a new `Tempo` instance shifted by a specific amount.

```typescript
const t = tempo();
t.add({ days: 5 });           // Adds 5 days
```

## The `.subtract()` Method

The `.subtract()` method returns a new `Tempo` instance shifted backwards by a specific amount.

```typescript
t.subtract({ days: 5 });      // Subtracts 5 days
```

You can also use negative values if you prefer:

```typescript
t.add({ days: -5 });          // Subtracts 5 days
t.subtract({ days: -5 });     // Adds 5 days (double negative)
```

## The `.set()` Method

While `.add()` *shifts* a date, the `.set()` method *replaces* components.

```typescript
t.set({ year: 2026, month: 1 }); // Sets to January 2026
```

### Navigating to Boundaries

You can snap to boundaries using intuitive property-based `{ Term: Value }` assignment, or use [Slick Structural Keys](../4-advanced-reference/tempo.shorthand.md) to navigate custom terminology cycles:

```typescript
t.set({ month: 'start' });    // Native: Start of the current month
t.set({ '#qtr': 'end' });     // Slick: End of the current quarter
```

#### Week Boundaries & Dedicated ISO Invariance
By default, week boundaries follow ISO 8601 (Monday start, Thursday middle, Sunday end):
```typescript
t.set({ week: 'start' });     // Snaps to Monday 00:00:00
t.set({ week: 'mid' });       // Snaps to Thursday 00:00:00
t.set({ week: 'end' });       // Snaps to Sunday 23:59:59.999999999
```

When `localeInfo: true` is enabled, `week` boundary calculations adapt to the active locale's regional first day of the week (e.g., Sunday in `en-US`, Saturday in `ar-EG`):
```typescript
const us = new Tempo('2026-09-16', { locale: 'en-US', localeInfo: true });
us.set({ week: 'start' });    // Snaps to Sunday 2026-09-13 00:00:00
us.set({ week: 'mid' });      // Snaps to Wednesday 2026-09-16 00:00:00
us.set({ week: 'end' });      // Snaps to Saturday 2026-09-19 23:59:59.999999999
```

To guarantee strict ISO 8601 Monday-to-Sunday boundaries regardless of active locale or `localeInfo` settings, use dedicated ISO tokens:
```typescript
us.set({ isoWeek: 'start' }); // Always snaps to Monday 00:00:00
us.set({ wy: 'start' });      // Equivalent dedicated ISO week boundary
```

#### ISO Week & ISO Year Mutation (`wy`, `yw`)

Tempo provides full mathematical support for ISO 8601 week calendar coordinates `(yw, wy, dow)`:

##### 1. Numeric ISO Week Assignment (`wy`, `isoWeek`, `isoweek`)
Assign an ISO week number (`1..53`) while preserving day of week (`dow`), time, and ISO year of week (`yw`):
```typescript
t.set({ isoWeek: 25 });       // Jump to week 25 in the same ISO year
t.set({ wy: 10 });            // 2-letter token equivalent
t.set({ isoweek: 5 });        // Case-insensitive alias
```
If an ISO year has 52 weeks and `53` is assigned, Tempo gracefully clamps to week `52` without leaking into the next year.

##### 2. Numeric ISO Year Assignment & Shifting (`yw`, `isoYear`, `isoyear`)
Assign or shift the ISO week-numbering year while preserving week-of-year (`wy`), day-of-week (`dow`), and wall-clock time:
```typescript
t.set({ yw: 2028 });          // Move to ISO year 2028 (preserves wy, dow, and time)
t.set({ isoYear: 2029 });     // Descriptive alias
t.set({ isoyear: 2030 });     // Case-insensitive alias

t.add({ yw: 1 });             // Shift forward 1 ISO year
t.subtract({ yw: 1 });        // Shift backward 1 ISO year
```
When shifting from a 53-week ISO year (e.g., 2020) to a 52-week ISO year (e.g., 2021), Week 53 safely clamps to Week 52 while preserving weekday and time.

##### 3. ISO Year Boundaries (`start`, `mid`, `end`)
Snap directly to key ISO year checkpoints:
```typescript
t.set({ yw: 'start' });       // Monday of Week 1 at 00:00:00
t.set({ yw: 'mid' });         // Thursday of Week 26 at 00:00:00
t.set({ yw: 'end' });         // Sunday of Week 52/53 at 23:59:59.999999999

t.set({ start: 'yw' });       // Equivalent shorthand
t.set({ end: 'isoYear' });    // Equivalent alias
```

Snippet shorthand keys (`mm`, `yy`, `dd`) are also supported for boundary snapping:

```typescript
t.set({ mm: 'start' });       // Snaps to start of current month
t.set({ yy: 'end' });         // Snaps to end of current year
```

### Slick Object Mutations

You can also navigate relative to your current date by using Slick Shorthand operators directly inside the `.set()` object payload. Use the snippet shorthand keys (`yy`, `mm`, `ww`, `dd`, `wkd`, etc.) and provide a string payload containing a directional modifier:

```typescript
const t = new Tempo('2024-05-20'); // Monday

// Jump forward two months
t.set({ mm: '>2' }); // July 20th

// Jump to the next Friday
t.set({ wkd: '>Fri' }); // May 24th
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

::: info 💡 Why can't I use Slick modifiers on timezones (`tz`)?
Changing a timezone (`tz` or `timeZone`) does not traverse the timeline—it merely changes the local representation of the exact same absolute moment in time. Because no temporal displacement occurs, applying directional Slick modifiers (like `>`) to a timezone is logically invalid and unsupported.
:::

## Chainability

Because all mutations return a new instance, you can safely chain `.add()` and `.set()` methods together to perform complex temporal logic in a single, readable line.

```typescript
const endOfQ1 = t
  .set({ year: 'start' })     // Snap to January 1st
  .add({ months: 3 })         // Shift forward 3 months (to April 1st)
  .subtract({ days: 1 })      // Step back exactly one day (March 31st)
  .set({ month: 'end' });     // Snap to March 31st at 23:59:59.999
```

## Relational vs. Navigation Shifting

When using custom terminology plugins (like Fiscal Quarters or Seasons), Tempo provides two distinct shorthand styles for mutation:

### 1. Navigation Mode (String)
Use a string to **jump** to a specific boundary. This relies on chronological momentum.

```typescript
t.set('#qtr.>q1');              // Snaps to the start of the next Q1
t.add('#timeOfDay.>afternoon'); // Jumps to the start of the next Afternoon
```

### 2. Relational Mode (Object)
Use an object to **shift** by a specific semantic step while preserving your relative position in the cycle.

```typescript
t.add({ '#qtr': 1 });           // Shift forward 1 quarter, preserving progress
```
If you are 20 days into Q1, relational shifting will put you exactly 20 days into Q2.

👉 **Learn More:** For deeper details on cycle preservation and directional operators, see the [Shorthand Engine Reference](../4-advanced-reference/tempo.shorthand.md).
