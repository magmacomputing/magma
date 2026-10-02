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
Discovers all Daylight Saving Time (DST) clock shift transition events for a timezone within a given calendar year using millisecond-precision binary search.

```typescript
function getDSTTransitions(
  timeZone: string,
  year: number = new Date().getFullYear()
): DSTTransition[];
```
**Example:**
```typescript
import { getDSTTransitions } from '@magmacomputing/tempo-fns';

const transitions = getDSTTransitions('America/New_York', 2026);
// Returns 2 transitions (Spring forward in March, Fall back in November):
// [
//   { type: 'gap', instant: Temporal.Instant..., previousOffset: -18000, newOffset: -14400, ... },
//   { type: 'overlap', instant: Temporal.Instant..., previousOffset: -14400, newOffset: -18000, ... }
// ]
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
