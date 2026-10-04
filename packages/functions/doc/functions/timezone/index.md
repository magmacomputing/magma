# Timezone & Location Utilities
This directory contains utilities for validating IANA timezone identifiers, calculating exact Daylight Saving Time transitions, manipulating offsets, and tracking hemispheres.

## Exported Functions

### `isValidTimeZone`
Validates whether a string is a recognized, valid IANA timezone identifier (e.g. `'America/New_York'`, `'UTC'`) supported by the runtime environment.

```typescript
function isValidTimeZone(timeZone: unknown): timeZone is string;
```
**Example:**
```typescript
import { isValidTimeZone } from '@magmacomputing/tempo-fns';

isValidTimeZone('America/New_York'); // Returns: true
isValidTimeZone('Europe/London');    // Returns: true
isValidTimeZone('Mars/Curiosity');   // Returns: false
isValidTimeZone(null);               // Returns: false
```

### `getDSTTransitions`
Resolves exact timestamps of Daylight Saving Time (DST) transitions for a given timezone and calendar year.

```typescript
function getDSTTransitions(
  timeZone: string,
  year: number
): DSTTransitionsResult;
```
**Example:**
```typescript
import { getDSTTransitions } from '@magmacomputing/tempo-fns';

const dst = getDSTTransitions('America/New_York', 2026);
// Returns DSTTransitionsResult:
// {
//   hasDST: true,
//   springForwardMs: 1772953200000,
//   fallBackMs: 1793512800000,
//   dstShiftMinutes: 60
// }
```

### `isDST`
Determines if a given date is currently observing Daylight Saving Time in its timezone.

```typescript
function isDST(
  date?: Temporal.ZonedDateTime | string, 
  timeZone?: string
): boolean;
```
**Example:**
```typescript
import { isDST } from '@magmacomputing/tempo-fns';

isDST('2026-07-01T12:00:00', 'America/New_York'); // Returns: true
isDST('2026-01-01T12:00:00', 'America/New_York'); // Returns: false
```

### `getOffsets`
Retrieves the exact nanosecond offset from UTC for a timezone across the year.

```typescript
function getOffsets(timeZone: string, year?: number): number[];
```
**Example:**
```typescript
import { getOffsets } from '@magmacomputing/tempo-fns';

getOffsets('Australia/Sydney'); 
// Returns array of offset changes for the year
```

### `getHemisphere`
Resolves whether a timezone resides in the Northern or Southern hemisphere based on seasonal DST shifts.

```typescript
function getHemisphere(timeZone?: string): 'N' | 'S' | 'E' | undefined;
```
**Example:**
```typescript
import { getHemisphere } from '@magmacomputing/tempo-fns';

getHemisphere('America/New_York'); // Returns: 'N'
getHemisphere('Australia/Sydney');  // Returns: 'S'
```

### `normalizeUtcOffset`
Transforms informal UTC strings into spec-compliant formats.

```typescript
function normalizeUtcOffset(zone: string): string;
```
**Example:**
```typescript
import { normalizeUtcOffset } from '@magmacomputing/tempo-fns';

normalizeUtcOffset('UTC+10'); // Returns: '+10:00'
```
