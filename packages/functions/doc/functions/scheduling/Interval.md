# Interval

The `Interval` class provides high-performance interval mathematics and representations for temporal points.

## Built for Temporal

`Interval` is designed to be fully compatible with both the core `Tempo` class and the native `Temporal` API (`Temporal.ZonedDateTime` and `Temporal.Instant`). It utilizes `.epochNanoseconds` under the hood to ensure extremely fast $O(1)$ intersection and boundary logic.

## Usage

```typescript
import { Tempo } from '@magmacomputing/tempo';
import { Interval } from '@magmacomputing/functions';

const start = new Tempo('2026-07-01');
const end = new Tempo('2026-07-31');

const july = new Interval(start, end);
```

### `.contains(point)`

Returns `true` if the specified temporal point (a `Tempo` instance or a native `Temporal` object) falls within the `Interval`. The interval is half-open (inclusive of the start, exclusive of the end).

```typescript
july.contains(new Tempo('2026-07-15')); // true
```

### `.overlaps(other)`

Returns `true` if the interval overlaps with another `Interval` instance.

### `.abuts(other)`

Returns `true` if the end of one interval exactly matches the start of the other interval.

### `.intersection(other)`

Returns a new `Interval` representing the overlapping segment of two intervals. Returns `null` if they do not overlap.

### `.union(other)`

Returns a new `Interval` representing the combined span of two intervals. Returns `null` if they do not overlap or abut.
