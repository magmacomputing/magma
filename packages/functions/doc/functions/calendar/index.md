# Calendar Utilities
This directory contains calendar and date-oriented utility functions (e.g. week of year, first/last day of month, leap year, days in month, weekend/weekday checks).

All functions accept universal date inputs: ISO date strings (`'YYYY-MM-DD'`), native `Temporal.PlainDate` / `Temporal.ZonedDateTime` instances, JS `Date` objects, timestamps, or `Tempo` objects.

## Exported Functions

### `isFirstDayOfMonth`
Returns a boolean indicating if the given date is the first day of its calendar month.

```typescript
function isFirstDayOfMonth(date: DateInput): boolean;
```
**Example:**
```typescript
import { isFirstDayOfMonth } from '@magmacomputing/tempo-fns';

isFirstDayOfMonth('2026-03-01'); // Returns: true
isFirstDayOfMonth('2026-03-15'); // Returns: false

// Native Temporal:
isFirstDayOfMonth(Temporal.PlainDate.from('2026-04-01')); // Returns: true

// Standard JS Date:
isFirstDayOfMonth(new Date(2026, 2, 1)); // Returns: true
```

### `isLastDayOfMonth`
Returns a boolean indicating if the given date is the final day of its calendar month, accounting for leap years.

```typescript
function isLastDayOfMonth(date: DateInput): boolean;
```
**Example:**
```typescript
import { isLastDayOfMonth } from '@magmacomputing/tempo-fns';

isLastDayOfMonth('2024-02-29'); // Returns: true (leap year)
isLastDayOfMonth('2024-02-28'); // Returns: false
isLastDayOfMonth('2023-02-28'); // Returns: true (non-leap year)

// Native Temporal:
isLastDayOfMonth(Temporal.PlainDate.from('2026-07-31')); // Returns: true
```

### `isLeapYear`
Determines whether a given 4-digit calendar year, Date, ISO string, or Temporal instance falls in a Gregorian leap year.

```typescript
function isLeapYear(date: DateInput): boolean;
```
**Example:**
```typescript
import { isLeapYear } from '@magmacomputing/tempo-fns';

isLeapYear(2024); // Returns: true
isLeapYear(2023); // Returns: false
isLeapYear(2000); // Returns: true
isLeapYear(1900); // Returns: false

// ISO string or Date:
isLeapYear('2024-06-15'); // Returns: true
isLeapYear(new Date(2023, 0, 1)); // Returns: false
```

### `daysInMonth`
Returns the exact day count (28, 29, 30, or 31) for a specified year and month.

```typescript
function daysInMonth(date: DateInput, month?: number): number;
```
**Example:**
```typescript
import { daysInMonth } from '@magmacomputing/tempo-fns';

daysInMonth(2024, 2); // Returns: 29
daysInMonth(2023, 2); // Returns: 28
daysInMonth('2026-04-15'); // Returns: 30
```

### `isWeekend` & `isWeekday`
Determines whether a given date falls on a weekend or weekday. Defaults to ISO 8601 Saturday & Sunday (`[6, 7]`), with support for cultural locale adaptation (e.g. `ar-SA` for Fri-Sat) or custom `weekendDays`.

```typescript
function isWeekend(date: DateInput, options?: WeekendOptions): boolean;
function isWeekday(date: DateInput, options?: WeekendOptions): boolean;
```
**Example:**
```typescript
import { isWeekend, isWeekday } from '@magmacomputing/tempo-fns';

isWeekend('2026-10-03'); // Returns: true (Saturday)
isWeekend('2026-10-05'); // Returns: false (Monday)
isWeekday('2026-10-05'); // Returns: true (Monday)

// Cultural weekend adaptation
isWeekend('2026-10-02', { locale: 'ar-SA' }); // Returns: true (Friday in Saudi Arabia)
```

### `getISOWeekOfYear`
Retrieves the ISO 8601 week number and week-numbering year for a given date.

```typescript
function getISOWeekOfYear(zdt: Temporal.ZonedDateTime | Tempo): { weekOfYear: number; yearOfWeek: number };
```
**Example:**
```typescript
import { getISOWeekOfYear } from '@magmacomputing/tempo-fns';

getISOWeekOfYear(Temporal.ZonedDateTime.from('2026-01-01T00:00:00+00:00[UTC]'));
// Returns: { weekOfYear: 1, yearOfWeek: 2026 }
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
