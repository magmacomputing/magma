# Calendar Utilities
This directory contains calendar and date-oriented utility functions (e.g. week of year, first day of month).

## Exported Functions

### `getISOWeekOfYear`
Retrieves the ISO 8601 week number for a given date.

```typescript
function getISOWeekOfYear(zdt: Temporal.ZonedDateTime | Tempo): number;
```
**Example:**
```typescript
import { getISOWeekOfYear } from '@magmacomputing/functions/calendar';

getISOWeekOfYear(new Tempo('2026-01-01')); // Returns: 1
```

### `isFirstDayOfMonth`
Returns a boolean indicating if the given date is the first day of its calendar month.

```typescript
function isFirstDayOfMonth(input: { day: number } | Tempo): boolean;
```
**Example:**
```typescript
import { isFirstDayOfMonth } from '@magmacomputing/functions/calendar';

isFirstDayOfMonth(new Tempo('2026-03-01')); // Returns: true
```
