# Timezone & Location Utilities
This directory contains utilities for manipulating offsets, calculating daylight savings, and hemisphere tracking.

## Exported Functions

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
import { isDST } from '@magmacomputing/functions/timezone';

isDST('2026-07-01T12:00:00', 'America/New_York'); // Returns: true
```

### `getOffsets`
Retrieves the exact nanosecond offset from UTC for a timezone.

```typescript
function getOffsets(timeZone: string, year?: number): number[];
```
**Example:**
```typescript
import { getOffsets } from '@magmacomputing/functions/timezone';

getOffsets('Australia/Sydney'); 
// Returns array of offset changes for the year
```

### `getHemisphere`
Resolves whether a timezone resides in the Northern or Southern hemisphere based on DST shifts.

```typescript
function getHemisphere(timeZone?: string): 'N' | 'S' | 'E' | undefined;
```
**Example:**
```typescript
import { getHemisphere } from '@magmacomputing/functions/timezone';

getHemisphere('America/New_York'); // Returns: 'N'
```

### `normalizeUtcOffset`
Transforms informal UTC strings into spec-compliant formats.

```typescript
function normalizeUtcOffset(zone: string): string;
```
**Example:**
```typescript
import { normalizeUtcOffset } from '@magmacomputing/functions/timezone';

normalizeUtcOffset('UTC+10'); // Returns: '+10:00'
```
