# Plan: Astrological (Astronomical) Season Term

## Overview
Currently, the `SeasonTerm` uses static meteorological dates (fixed to the 1st of the month). There is a desire to implement a more precise "Astrological" (also known as Astronomical) season term that tracks the exact moments of Equinoxes and Solstices.

## Complexity
The timing of equinoxes and solstices is dynamic due to the Tropical Year (~365.2422 days) not being a perfect multiple of the Calendar Year. This causes the events to drift by approximately 6 hours each year, resetting partially with leap years.

## Proposed Strategy
Instead of using the default template-cloning logic in `resolveCycleWindow`, a future `AstroSeasonTerm` would use a specialized `resolve` function.

### 1. Calculation Engine
A "Medium Precision" polynomial approximation (e.g., Jean Meeus' method) can be used to calculate the moment of transition for a given year without requiring heavy external dependencies.

**Example Approximation (March Equinox):**
```typescript
function getSpringEquinox(year: number) {
  const y = (year - 2000) / 1000;
  // Mean JDE for Spring Equinox (base polynomial only)
  const jde = 2451623.80984 + 365242.37404 * y + 0.05169 * y * y;
  return Temporal.Instant.fromEpochMilliseconds((jde - 2440587.5) * 86400000);
}
```

### 2. Implementation Pattern
The term would calculate boundaries for the current, previous, and next cycle to provide a deterministic list of ranges for `getTermRange` to evaluate.

```typescript
export const AstroSeasonTerm = defineTerm({
    key: 'szn.astro',
    scope: 'season',
    resolve(t: Tempo, anchor?: any) {
        const year = anchor ? anchor.year : t.year;
        const list = [];

        // Generate boundaries for Year-1, Year, and Year+1
        for (const y of [year - 1, year, year + 1]) {
            list.push({ 
                key: 'Spring', 
                ...calculateAstroMoment(y, 'vernal'), 
                group: 'astrological' 
            });
            // ... Summer, Autumn, Winter
        }
        return list;
    }
});
```

## Considerations
- **Hemisphere Awareness**: The labels must be inverted in the Southern Hemisphere while maintaining the same astronomical trigger points.
- **Precision**: For the 21st century, a simplified polynomial is accurate to within a few minutes, which is sufficient for most calendar-based applications.
