# Business Utilities
This directory contains utility functions designed for financial, business, working day math, and SLA calculations.

All core business day functions accept universal date inputs: ISO date strings (`'YYYY-MM-DD'`), native `Temporal.PlainDate` / `Temporal.ZonedDateTime` instances, JS `Date` objects, timestamps, or `Tempo` objects.

## Exported Functions

### `isBusinessDay`
Determines whether a given date is an active working business day (non-weekend and non-holiday).

```typescript
function isBusinessDay(date: DateInput, options?: BusinessDayOptions): boolean;
```
**Example:**
```typescript
import { isBusinessDay } from '@magmacomputing/tempo-fns';

isBusinessDay('2026-10-02'); // true (Friday)
isBusinessDay('2026-10-03'); // false (Saturday)
isBusinessDay('2026-12-25', { holidays: ['2026-12-25'] }); // false (Christmas Day)

// Native Temporal:
isBusinessDay(Temporal.PlainDate.from('2026-10-02')); // true

// Regional weekend support (e.g. Fri-Sat weekend in Middle East)
isBusinessDay('2026-10-02', { locale: 'ar-SA' }); // false (Friday is a weekend)
```

### `nextBusinessDay` & `prevBusinessDay`
Calculates the immediate next or previous business day, automatically advancing or rewinding past weekends and recognized public holidays.

```typescript
function nextBusinessDay(date: DateInput, options?: BusinessDayOptions): Temporal.ZonedDateTime;
function prevBusinessDay(date: DateInput, options?: BusinessDayOptions): Temporal.ZonedDateTime;
```
**Example:**
```typescript
import { nextBusinessDay, prevBusinessDay } from '@magmacomputing/tempo-fns';

nextBusinessDay('2026-10-02'); // 2026-10-05T00:00:00 (Monday following Friday)
prevBusinessDay('2026-10-05'); // 2026-10-02T00:00:00 (Friday preceding Monday)
```

### `addBusinessDays`
Adds or subtracts a signed integer number of working business days, skipping weekends and configured public holidays. Pass `options.holidays` or `options.isHoliday` to define regional holidays (ideal for financial settlement calculations such as T+2 settlement).

```typescript
function addBusinessDays(date: DateInput, amount: number, options?: BusinessDayOptions): Temporal.ZonedDateTime;
```
**Example:**
```typescript
import { addBusinessDays } from '@magmacomputing/tempo-fns';

// T+2 trade settlement starting Thursday:
addBusinessDays('2026-10-01', 2); // 2026-10-05 (Monday)

// Negative business day subtraction:
addBusinessDays('2026-10-05', -2); // 2026-10-01 (Thursday)
```

### `businessDaysBetween`
Calculates the exact signed integer count of working business days between two dates, excluding weekends and recognized holidays.

```typescript
function businessDaysBetween(start: DateInput, end: DateInput, options?: BusinessDayOptions): number;
```
**Example:**
```typescript
import { businessDaysBetween } from '@magmacomputing/tempo-fns';

businessDaysBetween('2026-10-02', '2026-10-05'); // Returns: 1
businessDaysBetween('2026-10-05', '2026-10-02'); // Returns: -1
businessDaysBetween('2026-10-02', '2026-10-02'); // Returns: 0
```

### `workingHoursUntil`
Calculates the exact number of SLA-eligible working hours between a start date/time and a deadline. Accepts native `Temporal.ZonedDateTime` instances or `Tempo` objects.

```typescript
function workingHoursUntil(
  start: Temporal.ZonedDateTime | Tempo, 
  deadline: Temporal.ZonedDateTime | Tempo, 
  options?: SLAOptions
): number;
```
**Example:**
```typescript
import { workingHoursUntil } from '@magmacomputing/tempo-fns';

const start = Temporal.ZonedDateTime.from('2026-07-10T10:00:00+00:00[UTC]'); // Friday
const end = Temporal.ZonedDateTime.from('2026-07-13T12:00:00+00:00[UTC]');   // Monday

const hours = workingHoursUntil(start, end, { startHour: 9, endHour: 17 });
console.log(hours); // 10 (working hours)
```

### `isSameFiscalQuarter`
Determines if two dates fall within the same fiscal quarter. This function leverages the Tempo **Terms Engine** to evaluate custom organizational fiscal calendars.

```typescript
function isSameFiscalQuarter(date1: Tempo, date2: Tempo): boolean;
```
**Example:**
```typescript
import { isSameFiscalQuarter } from '@magmacomputing/tempo-fns';
import { Tempo } from '@magmacomputing/tempo';

const d1 = new Tempo('2026-01-15');
const d2 = new Tempo('2026-03-31');
isSameFiscalQuarter(d1, d2); // Returns: true
```
