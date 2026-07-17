# Duration Utilities
This directory contains pure functions for normalizing and evaluating durations.

## Exported Functions

### `normaliseFractionalDurations`
Normalizes fractional representations in a duration object payload into smaller discrete units (e.g., 0.5 hours -> 30 minutes).

```typescript
function normaliseFractionalDurations(
  payload: Record<string, any>
): Record<string, any>;
```
**Example:**
```typescript
import { normaliseFractionalDurations } from '@magmacomputing/functions/duration';

normaliseFractionalDurations({ hours: 1.5 }); 
// Returns: { hours: 1, minutes: 30 }
```
