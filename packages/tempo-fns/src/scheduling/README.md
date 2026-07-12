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
import { nextCron } from '@magmacomputing/tempo-fns/scheduling';
import { Tempo } from '@magmacomputing/tempo';

const now = new Tempo('2026-01-01T08:00:00');
const next = nextCron(now, '30 9 * * 1-5'); // 9:30 AM, Mon-Fri
```

### `Interval`
Advanced recurring scheduling loop with precision drift-correction.

```typescript
class Interval<T extends TemporalPoint = TemporalPoint> {
  constructor(
    start: T, 
    durationObj: Record<string, number>, 
    factory: (iso: string) => T
  );
  next(): IteratorResult<T>;
  [Symbol.iterator](): IterableIterator<T>;
}
```
**Example:**
```typescript
import { Interval } from '@magmacomputing/tempo-fns/scheduling';
import { Tempo } from '@magmacomputing/tempo';

const start = new Tempo('2026-01-01T00:00:00');
const daily = new Interval(start, { days: 1 }, (iso) => new Tempo(iso));

for (const date of daily) {
  console.log(date.toString());
  if (date.year > 2026) break;
}
```
