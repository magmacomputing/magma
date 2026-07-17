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
import { getISOWeekOfYear } from '@magmacomputing/tempo-fns';

getISOWeekOfYear(new Tempo('2026-01-01')); // Returns: 1
```

### `isFirstDayOfMonth`
Returns a boolean indicating if the given date is the first day of its calendar month.

```typescript
function isFirstDayOfMonth(input: { day: number } | Tempo): boolean;
```
**Example:**
```typescript
import { isFirstDayOfMonth } from '@magmacomputing/tempo-fns';

isFirstDayOfMonth(new Tempo('2026-03-01')); // Returns: true
```

### `getPublicHolidays`
Fetches a list of public holidays for a specific region and year from the Nager.Date API.

```typescript
function getPublicHolidays(year?: number, region?: string): Promise<PublicHoliday[]>;
```
**Example:**
```typescript
import { getPublicHolidays } from '@magmacomputing/tempo-fns';

const holidays = await getPublicHolidays(2026, 'US');
console.log(holidays[0].name); // "New Year's Day"
```
