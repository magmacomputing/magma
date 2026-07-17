# Business Utilities
This directory contains utility functions designed for financial, business, and SLA calculations.

## Exported Functions

### `workingHoursUntil`
Calculates the exact number of SLA-eligible working hours between a date and a deadline.

```typescript
function workingHoursUntil(
  this: Tempo, 
  deadline: Tempo | string, 
  options?: SLAOptions
): number;
```
**Example:**
```typescript
import { Tempo } from '@magmacomputing/tempo';
import { workingHoursUntil } from '@magmacomputing/tempo-fns';

Tempo.prototype.workingHoursUntil = workingHoursUntil;

const start = new Tempo('2026-07-10T10:00:00'); // Friday
const end = new Tempo('2026-07-13T12:00:00'); // Monday

start.workingHoursUntil(end); // Returns: 10 (hours)
```

### `isSameFiscalQuarter`
Determines if a date falls within the same fiscal quarter as a target date.

```typescript
function isSameFiscalQuarter(date1: Tempo, date2: Tempo): boolean;
```
**Example:**
```typescript
import { isSameFiscalQuarter } from '@magmacomputing/tempo-fns';

const d1 = new Tempo('2026-01-15');
const d2 = new Tempo('2026-03-31');
isSameFiscalQuarter(d1, d2); // Returns: true
```
