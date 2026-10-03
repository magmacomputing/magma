<div class="plugin-eyebrow">
  <a href="./index.html">← @magmacomputing/tempo-plugin-holidays</a>
</div>

<br>

# Production Use Cases & Architectural Patterns

Real-world business systems do not run on simple 24/7 timelines. Banking networks close, financial markets freeze trading on statutory holidays, payroll must disburse before long weekends, and SaaS support contracts enforce strict business-hours response SLAs.

Naive date math—such as adding 48 hours or multiplying days by 86,400,000 milliseconds—causes immediate production bugs: premature SLA breach alerts, miscalculated trade settlement dates, and payroll disputes.

The `@magmacomputing/tempo-plugin-holidays` plugin gives Tempo instances native awareness of public holidays, weekend observation shifts, and business-day arithmetic.

---

## 1. Multi-Tenant SaaS SLA Resolution Engine

In B2B SaaS platforms (such as Zendesk, Jira, or ServiceNow architectures), customer support contracts specify service level agreements (SLAs) based on **working business hours in the client's jurisdiction**:
- *"Tier-1 critical incidents acknowledged within 4 business hours."*
- *"Standard tickets resolved within 2 business days."*

If a customer in the UK logs a ticket at 4:30 PM on the Friday before a Bank Holiday, a naive `+ 48h` timer will flag an SLA breach on Sunday afternoon. With `tempo-plugin-holidays`, the SLA engine respects the client's local country and statutory holidays automatically.

### Architecture Pattern

```typescript
import '@magmacomputing/tempo-plugin-holidays/install';
import { Tempo } from '@magmacomputing/tempo';

interface CustomerOrganization {
  id: string;
  name: string;
  country: string; // e.g. 'US', 'GB', 'AU', 'DE'
  region?: string;  // e.g. 'NSW', 'VIC', 'CA'
  slaBusinessDays: number;
}

export function computeSlaDeadline(
  ticketCreatedAt: string,
  customer: CustomerOrganization
): { deadline: Tempo; isRiskOfBreach: boolean; remainingWorkingHours: number } {
  // 1. Initialize ticket Tempo with the customer's geographic context
  const ticketTime = new Tempo(ticketCreatedAt, {
    geo: { country: customer.country, region: customer.region }
  });

  // 2. Add customer's contracted business days (skips holidays + weekends)
  const deadline = ticketTime.holidays.addBusinessDays(customer.slaBusinessDays);

  // 3. Compute remaining working hours (standard 9am - 5pm business day)
  const now = new Tempo('now', {
    geo: { country: customer.country, region: customer.region }
  });

  const remainingWorkingHours = now.holidays.workingHoursUntil(deadline, {
    startHour: 9,
    endHour: 17
  });

  return {
    deadline,
    isRiskOfBreach: remainingWorkingHours < 4,
    remainingWorkingHours
  };
}

// Example: UK Customer creates ticket on Friday before Summer Bank Holiday
const ticket = computeSlaDeadline('2026-08-28 16:30:00', {
  id: 'org_enterprise_uk',
  name: 'Acme UK Ltd',
  country: 'GB',
  slaBusinessDays: 2
});

// Friday + 2 business days (skipping Sat, Sun, and Bank Holiday Monday Aug 31):
// Resolves accurately to Wednesday, Sep 2, 2026
console.log(ticket.deadline.format('{yyyy}-{mm}-{dd}')); // '2026-09-02'
```

---

## 2. Financial T+2 Settlement & Trade Value Dates

In securities trading, currency exchange (FX), and treasury management, trades settle on **T+2** (Trade Date + 2 Business Days). If a trade occurs on Thursday before Good Friday, financial clearing houses (Fedwire, TARGET2, CHAPS) are closed on both Good Friday and Easter Monday.

Settlement cannot occur until the second valid banking day following the trade.

```typescript
import { Tempo } from '@magmacomputing/tempo';
import { addBusinessDays, isBusinessDay } from '@magmacomputing/tempo-plugin-holidays';

export function calculateTradeSettlement(tradeDateIso: string, marketCountry: string): {
  tradeDate: string;
  settlementDate: string;
  interveningHolidaysSkipped: number;
} {
  const trade = new Tempo(tradeDateIso, { geo: { country: marketCountry } });

  // Ensure trade was executed on a valid market day
  if (!trade.holidays.isBusinessDay()) {
    throw new Error(`Trade executed on non-clearing day: ${trade.format('{yyyy}-{mm}-{dd}')}`);
  }

  // T+2 Settlement Date (skips exchange holidays & weekends)
  const settlement = trade.holidays.addBusinessDays(2);

  return {
    tradeDate: trade.format('{yyyy}-{mm}-{dd}'),
    settlementDate: settlement.format('{yyyy}-{mm}-{dd}'),
    interveningHolidaysSkipped: trade.holidays.businessDaysUntil(settlement)
  };
}

// Thursday April 2, 2026 (day before Good Friday on the London Stock Exchange)
const trade = calculateTradeSettlement('2026-04-02', 'GB');

// In the UK, April 3 (Good Friday) and April 6 (Easter Monday) are bank holidays.
// April 4-5 is the weekend:
// T+1 = Tuesday April 7, T+2 = Wednesday April 8
console.log(trade.settlementDate); // '2026-04-08'
```

---

## 3. Payroll & Automated Invoicing (Preceding vs. Following Conventions)

When automated billing or employee salary disbursement is scheduled for a fixed calendar date (e.g. the 1st or 15th of the month), banking regulations require applying a business day rolling convention if that date lands on a weekend or public holiday:

- **Preceding Business Day (Standard Payroll)**: Employees must be paid *before* the holiday weekend (e.g. Wednesday Dec 31 if Jan 1 is New Year's Day).
- **Following Business Day (Invoicing & Direct Debits)**: Payments are drawn on the next banking day after the holiday.

```typescript
import '@magmacomputing/tempo-plugin-holidays/install';
import { Tempo } from '@magmacomputing/tempo';

type RollConvention = 'PRECEDING' | 'FOLLOWING';

export function resolvePaymentRunDate(
  scheduledDateIso: string,
  country: string,
  convention: RollConvention
): Tempo {
  const target = new Tempo(scheduledDateIso, { geo: { country } });

  // If already a valid working day, process on scheduled date
  if (target.holidays.isBusinessDay()) {
    return target;
  }

  // Apply banking adjustment convention
  return convention === 'PRECEDING'
    ? target.holidays.prevBusinessDay()
    : target.holidays.nextBusinessDay();
}

// 1. Payroll Run: Jan 1, 2026 (New Year's Day - US Bank Holiday)
const payrollRun = resolvePaymentRunDate('2026-01-01', 'US', 'PRECEDING');
console.log(payrollRun.format('{yyyy}-{mm}-{dd}')); // '2025-12-31' (Wednesday)

// 2. Direct Debit Draw: July 4, 2026 (US Independence Day - Saturday)
// Observed holiday is Friday July 3; next banking business day is Monday July 6
const debitRun = resolvePaymentRunDate('2026-07-04', 'US', 'FOLLOWING');
console.log(debitRun.format('{yyyy}-{mm}-{dd}')); // '2026-07-06' (Monday)
```

---

## 4. HR Leave Balance & Vacation Day Accounting

When employees submit annual leave requests, naive calendar day subtraction calculates `endDate - startDate + 1`. This incorrectly charges employees vacation balance for weekends and statutory bank holidays occurring during their time off.

Using `businessDaysUntil` or `isBusinessDay()` ensures fair, legally compliant leave deductions.

```typescript
import '@magmacomputing/tempo-plugin-holidays/install';
import { Tempo } from '@magmacomputing/tempo';

export function calculateLeaveDeduction(
  startDateIso: string,
  endDateIso: string,
  country: string
): { totalCalendarDays: number; chargeableLeaveDays: number; holidaysIncluded: string[] } {
  const start = new Tempo(startDateIso, { geo: { country } });
  const end = new Tempo(endDateIso, { geo: { country } });

  const holidaysIncluded: string[] = [];
  let chargeableDays = 0;
  let current = start;

  while (current.epoch.ms <= end.epoch.ms) {
    if (current.holidays.isHoliday()) {
      holidaysIncluded.push(`${current.format('{yyyy}-{mm}-{dd}')}: ${current.holidays.name}`);
    } else if (current.holidays.isBusinessDay()) {
      chargeableDays++;
    }
    current = current.add({ day: 1 });
  }

  return {
    totalCalendarDays: Math.round((end.epoch.ms - start.epoch.ms) / 86_400_000) + 1,
    chargeableLeaveDays: chargeableDays,
    holidaysIncluded
  };
}

// Employee books Christmas break in Australia (Dec 24, 2026 to Jan 4, 2027)
const leave = calculateLeaveDeduction('2026-12-24', '2027-01-04', 'AU');

console.log(leave.totalCalendarDays);   // 12 days
console.log(leave.chargeableLeaveDays);  // 5 working days deducted
console.log(leave.holidaysIncluded);
// [
//   '2026-12-25: Christmas Day',
//   '2026-12-28: Boxing Day (Observed)',
//   '2027-01-01: New Year\'s Day'
// ]
```

---

## 5. Corporate Calendar Overlays & Floating Shutdowns

Enterprises frequently observe non-statutory company closures in addition to national holidays:
- Year-end corporate shutdowns (e.g. December 24 through January 2).
- Annual company hackathons or global mental health recharge days.
- Regional warehouse maintenance downtime.

`tempo-plugin-holidays` supports **`customHolidays`**, seamlessly blending proprietary enterprise closure dates into the national holiday calendar without modifying runtime source files:

```typescript
import { Tempo } from '@magmacomputing/tempo';
import { isBusinessDay, addBusinessDays } from '@magmacomputing/tempo-plugin-holidays';

const corporateCalendar = {
  country: 'US',
  customHolidays: [
    '2026-11-27', // Company Day after Thanksgiving
    '2026-12-24', // Christmas Eve Corporate Closure
    '2026-12-31'  // New Year's Eve Corporate Closure
  ]
};

const thanksgivingThursday = new Tempo('2026-11-26');

// Friday Nov 27 is a normal federal business day in the US,
// but our custom enterprise overlay treats it as non-working:
console.log(isBusinessDay(thanksgivingThursday.add({ day: 1 }), corporateCalendar)); // false

// Advances past Thanksgiving (Thu), Company Day (Fri), and the Weekend to Monday:
const nextActiveWorkDay = addBusinessDays(thanksgivingThursday, 1, corporateCalendar);
console.log(nextActiveWorkDay.format('{yyyy}-{mm}-{dd}')); // '2026-11-30' (Monday)
```

---

## 6. Zero-Latency Synchronous Resolution

All standard country calculations (including Easter Computus and observed floating holiday algorithms) execute **100% synchronously in pure memory**.

There are no network round-trips to third-party government APIs, no rate limits, and zero asynchronous latency—making `tempo-plugin-holidays` suitable for high-throughput batch transaction pipelines, bulk database ETL jobs, and millisecond-sensitive order routing engines.
