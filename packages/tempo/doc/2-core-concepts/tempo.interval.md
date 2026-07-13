# Interval

In the realm of time mathematics, an **Interval** is a continuous segment of time bounded by two fixed points (a start and an end). While a `Duration` represents an *amount* of time (e.g., "5 hours"), an `Interval` is firmly anchored to the timeline (e.g., "9:00 AM to 2:00 PM").

The official [ECMAScript Temporal proposal](https://tc39.es/proposal-temporal/docs/) currently lacks a native `Interval` type. Tempo bridges this gap by providing a mathematically pure, highly optimized `Interval` primitive directly in the core package.

## Instantiating an Interval

You can access the `Interval` class either statically through the `Tempo` namespace (for developer convenience) or as a decoupled named export (for strict tree-shaking).

### 1. The Ergonomic Approach (Attached to Tempo)
The easiest way to use `Interval` is directly from the `Tempo` class. When instantiated this way, `Tempo.Interval` automatically intercepts its arguments and parses them through the `Tempo` constructor. This means you can pass standard strings, Temporal objects, or `Date` objects directly without wrapping them yourself!

```typescript
import { Tempo } from '@magmacomputing/tempo';

const meeting = new Tempo.Interval(
  '2026-07-15T14:00:00Z',
  '2026-07-15T15:00:00Z'
);
```

### 2. The Purist Approach (Tree-Shakeable Export)
If you are strictly using native `Temporal` polyfill objects and want to avoid bundling the entire `Tempo` class, you can import `Interval` directly. The pure `Interval` class has stricter requirements: it relies on simple duck-typing and requires the arguments to be pre-instantiated objects that expose an `epochNanoseconds` or `epoch.ns` property.

```typescript
import { Interval } from '@magmacomputing/tempo';
import { Temporal } from '@js-temporal/polyfill';

const meeting = new Interval(
  Temporal.Instant.from('2026-07-15T14:00:00Z'),
  Temporal.Instant.from('2026-07-15T15:00:00Z')
);
```
*Note: Because `Interval` uses duck-typing to read `epochNanoseconds`, it natively supports all Temporal point-in-time types (`Instant`, `ZonedDateTime`, etc.) and `Tempo` instances right out of the box.*

### Open-Ended Boundaries
Both `Tempo.Interval` and the pure `Interval` class fully support open-ended time spans! Just pass `null` for the `start` or `end` parameter.

```typescript
const fromNowOn = new Tempo.Interval(Tempo.now(), null);
const untilThen = new Interval(null, Temporal.Instant.from('2026-07-15T14:00:00Z'));
```

## Set Operations

The `Interval` class provides powerful, lightning-fast methods for evaluating time ranges.

### `overlaps()`
Checks if two intervals share any common timeline segment. Perfect for finding meeting scheduling conflicts.

```typescript
const bookedSlot = new Tempo.Interval(
  new Tempo('2026-07-15T14:30:00Z'), 
  new Tempo('2026-07-15T16:00:00Z')
);

if (meeting.overlaps(bookedSlot)) {
  throw new Error('This time slot is already taken!');
}
```

### `contains()`
Checks if a specific point in time falls within the boundaries of the interval (inclusive of `start`, exclusive of `end`). Useful for business-hours or promotional-period evaluations.

```typescript
const businessHours = new Tempo.Interval(
  new Tempo('09:00'), 
  new Tempo('17:00')
);

if (businessHours.contains(Tempo.now())) {
  console.log("We are open!");
}
```

### `abuts()`
Checks if one interval ends *exactly* when another begins. 

```typescript
const shift1 = new Tempo.Interval(new Tempo('09:00'), new Tempo('13:00'));
const shift2 = new Tempo.Interval(new Tempo('13:00'), new Tempo('17:00'));

shift1.abuts(shift2); // true
```

### `intersection()`
Returns a new `Interval` representing the shared, overlapping time between two intervals. Returns `null` if they do not overlap. Useful for finding mutual availability.

```typescript
const aliceFreeTime = new Tempo.Interval(new Tempo('09:00'), new Tempo('12:00'));
const bobFreeTime = new Tempo.Interval(new Tempo('11:00'), new Tempo('14:00'));

const mutualFreeTime = aliceFreeTime.intersection(bobFreeTime);
// Interval: 11:00 to 12:00
```

### `union()`
Returns a new `Interval` that spans the entire duration of two overlapping or abutting intervals. Returns `null` if there is a gap between them.

```typescript
const shift1 = new Tempo.Interval(new Tempo('09:00'), new Tempo('13:00'));
const shift2 = new Tempo.Interval(new Tempo('13:00'), new Tempo('17:00'));

const fullDay = shift1.union(shift2);
// Interval: 09:00 to 17:00
```
