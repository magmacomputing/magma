# Scheduling Utilities
This directory contains utilities for cron parsing, scheduling intervals, and recurring logic.

## Exported Functions

### `nextCron` / `prevCron`
Evaluates zero-dependency cron expressions to find the next or previous matching date.

```typescript
function nextCron(tempo: Tempo, pattern: string): Tempo;
function prevCron(tempo: Tempo, pattern: string): Tempo;
```
**Example:**
```typescript
import { nextCron } from '@magmacomputing/functions/scheduling';
import { Tempo } from '@magmacomputing/tempo';

const now = new Tempo('2026-01-01T08:00:00');
const next = nextCron(now, '30 9 * * 1-5'); // 9:30 AM, Mon-Fri
```

### `Interval`
Represents a continuous span of time with start and end boundaries, supporting set operations like intersections and unions.

```typescript
class Interval<T extends TemporalPoint = TemporalPoint> {
  constructor(start: T, end: T);
  
  contains(point: TemporalPoint): boolean;
  overlaps(other: Interval<any>): boolean;
  abuts(other: Interval<any>): boolean;
  intersection(other: Interval<T>): Interval<T> | null;
  union(other: Interval<T>): Interval<T> | null;
}
```
**Example:**
```typescript
import { Interval } from '@magmacomputing/tempo';
import { Temporal } from '@js-temporal/polyfill'; // or native Temporal in Node 22+

const start = Temporal.ZonedDateTime.from('2026-01-01T08:00[UTC]');
const end = Temporal.ZonedDateTime.from('2026-01-01T17:00[UTC]');
const shift = new Interval(start, end);

const meetingStart = Temporal.ZonedDateTime.from('2026-01-01T14:00[UTC]');
const meetingEnd = Temporal.ZonedDateTime.from('2026-01-01T15:00[UTC]');
const meeting = new Interval(meetingStart, meetingEnd);

console.log(shift.contains(meetingStart)); // true
console.log(shift.overlaps(meeting)); // true
```
