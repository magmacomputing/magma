# Business Days & SLA Arithmetic

The **Regional Holidays Plugin** extends Tempo with robust business day operations and SLA (Service Level Agreement) working hours arithmetic under the `t.holidays` namespace.

---

## Determining Working Business Days

A date is considered a **business day** if:
1. It does not fall on a weekend day (according to the cultural locale weekend definition in `tempo.intl.weekend`, defaulting to Saturday/Sunday).
2. It does not fall on a recognized public holiday in the active country/region.
3. It does not match any date in `options.customHolidays`.

```typescript
import '@magmacomputing/tempo-plugin-holidays/install';
import { Tempo } from '@magmacomputing/tempo';

// US Independence Day (Observed Friday July 3, 2026)
const t1 = new Tempo('2026-07-03', { geo: { country: 'US' } });
console.log(t1.holidays.isBusinessDay()); // false (Holiday)

// Regular Monday
const t2 = new Tempo('2026-07-06', { geo: { country: 'US' } });
console.log(t2.holidays.isBusinessDay()); // true
```

---

## Navigating Business Days

### `t.holidays.nextBusinessDay()` and `t.holidays.prevBusinessDay()`

Skips over weekends and intervening public holidays to find the nearest valid working business day:

```typescript
// Thursday July 2, 2026 (US)
const start = new Tempo('2026-07-02', { geo: { country: 'US' } });

// Friday July 3 is Independence Day (Observed), July 4-5 is the weekend
const next = start.holidays.nextBusinessDay();
console.log(next.format('{yyyy}-{mm}-{dd}')); // '2026-07-06' (Monday)

// Stepping backwards from Monday July 6
const prev = next.holidays.prevBusinessDay();
console.log(prev.format('{yyyy}-{mm}-{dd}')); // '2026-07-02' (Thursday)
```

---

## Adding Business Days

### `t.holidays.addBusinessDays(amount, options?)`

Adds or subtracts a specific number of working business days:

```typescript
const orderDate = new Tempo('2026-07-02', { geo: { country: 'US' } });

// Add 3 business days:
// Day 1: Mon July 6
// Day 2: Tue July 7
// Day 3: Wed July 8
const deliveryDate = orderDate.holidays.addBusinessDays(3);
console.log(deliveryDate.format('{yyyy}-{mm}-{dd}')); // '2026-07-08'

// Subtract 3 business days back
const original = deliveryDate.holidays.addBusinessDays(-3);
console.log(original.format('{yyyy}-{mm}-{dd}')); // '2026-07-02'
```

---

## Counting Business Days Between Dates

### `t.holidays.businessDaysUntil(target, options?)`

Calculates the exact number of full business days between two dates:

```typescript
const start = new Tempo('2026-07-02', { geo: { country: 'US' } });
const end = new Tempo('2026-07-08', { geo: { country: 'US' } });

console.log(start.holidays.businessDaysUntil(end)); // 3
console.log(end.holidays.businessDaysUntil(start)); // -3
```

---

## SLA Working Hours Calculation

### `t.holidays.workingHoursUntil(deadline, options?)`

Calculates the exact number of SLA-eligible working hours between two timestamps, taking into account:
- Configurable working day hours (defaults to 9:00 AM to 5:00 PM).
- Exclusion of non-working weekend days.
- Exclusion of regional public holidays and custom non-working days.

```typescript
// Ticket opened on Friday Jan 23, 2026 at 3:00 PM in Australia
const opened = new Tempo('2026-01-23 15:00:00', { geo: { country: 'AU' } });

// Ticket resolved on Tuesday Jan 27, 2026 at 11:00 AM
// (Monday Jan 26 is Australia Day public holiday)
const resolved = new Tempo('2026-01-27 11:00:00', { geo: { country: 'AU' } });

const slaHours = opened.holidays.workingHoursUntil(resolved);
console.log(slaHours); // 4.0 hours
// Breakdown:
// - Friday Jan 23: 15:00 to 17:00 = 2.0 hours
// - Saturday Jan 24: Weekend = 0 hours
// - Sunday Jan 25: Weekend = 0 hours
// - Monday Jan 26: Australia Day = 0 hours
// - Tuesday Jan 27: 09:00 to 11:00 = 2.0 hours
// Total: 4.0 working hours
```

### Custom Work Hour Windows

```typescript
// Custom 8:00 AM to 4:00 PM working day
const hours = opened.holidays.workingHoursUntil(resolved, {
  startHour: 8,
  endHour: 16,
});
```

---

## Cultural Locale Weekend Awareness

Different countries have different working weeks. For example, in Saudi Arabia (`ar-SA`) and other Middle Eastern jurisdictions, the weekend is Friday and Saturday, and Sunday is a working business day.

Tempo automatically respects the active locale's weekend definition via `tempo.intl.weekend`:

```typescript
// Saudi Arabia (ar-SA)
const friday = new Tempo('2026-05-15', { locale: 'ar-SA', geo: { country: 'SA' } });
const sunday = new Tempo('2026-05-17', { locale: 'ar-SA', geo: { country: 'SA' } });

console.log(friday.holidays.isBusinessDay()); // false (Friday is non-working weekend in SA)
console.log(sunday.holidays.isBusinessDay()); // true  (Sunday is a standard working day in SA)
```
