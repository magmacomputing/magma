# Timezone & Location Utilities
This directory contains utilities for manipulating offsets, calculating daylight savings, and hemisphere tracking.

## Exported Functions
- `isDST`: Determines if a given date is currently observing Daylight Saving Time in its timezone.
- `getOffsets`: Retrieves the exact nanosecond offset from UTC for a timezone.
- `getHemisphere`: Resolves whether a timezone resides in the Northern or Southern hemisphere based on DST shifts.
- `normalizeUtcOffset`: Transforms informal UTC strings into spec-compliant formats.
