# Cron Utils

The `functions` cron utilities provide zero-dependency, lightweight, and timezone-aware cron scheduling logic natively built for `Tempo`.

## Available Functions

### `nextCron`

Finds the next occurrence of a cron pattern starting from (and excluding) the current minute.

```typescript
import { Tempo } from '@magmacomputing/tempo';
import { nextCron } from '@magmacomputing/functions';

const start = new Tempo('2026-07-01T08:00:00Z');
// Every 5 minutes between 9 AM and 5 PM, Monday-Friday
const next = nextCron(start, '*/5 9-17 * * 1-5');

console.log(next.format('{hhmiss}')); // '09:00:00'
```

### `prevCron`

Finds the previous occurrence of a cron pattern starting from (and excluding) the current minute.

```typescript
import { Tempo } from '@magmacomputing/tempo';
import { prevCron } from '@magmacomputing/functions';

const start = new Tempo('2026-07-01T18:00:00Z');
// Every 5 minutes between 9 AM and 5 PM, Monday-Friday
const prev = prevCron(start, '*/5 9-17 * * 1-5');

console.log(prev.format('{hhmiss}')); // '17:55:00'
```

### `parseCron`

Exposes the internal tokenizer, returning a strongly typed `CronSchedule` dictionary representing allowed numeric values per-field.

```typescript
import { parseCron } from '@magmacomputing/functions';

const schedule = parseCron('*/5 9-17 * * 1-5');
console.log(schedule.minutes.allowed.has(5)); // true
```

## Supported Syntax

The tokenizer currently supports standard 5-field UNIX cron syntax: `minute hour day(month) month day(week)`.

Features supported:
- **`*`**: Match all values
- **`-`**: Ranges (e.g. `9-17`)
- **`/`**: Steps (e.g. `*/5`)
- **`,`**: Lists (e.g. `1,15,30`)

> [!NOTE]
> When both the Day-of-Month and Day-of-Week fields are restricted (not `*`), the parser uses native `OR` logic, meaning the schedule will trigger if the date matches **either** the Day-of-Month or the Day-of-Week.
