# Astronomical & Celestial Utilities
This directory contains pure astronomical, solar, lunar, and zodiac calculation functions.

## Exported Functions

### `getLunarPhase`
Calculates lunar phase details (key, phase name, 1-based index, illumination 0.0–1.0 fraction, age in days, waxing status, and hemisphere-aware emojis).

```typescript
function getLunarPhase(dateInput: Date | number | string, options?: LunarPhaseOptions): LunarPhaseResult;
```
**Example:**
```typescript
import { getLunarPhase } from '@magmacomputing/tempo-fns';

const lunar = getLunarPhase('2000-01-06T18:14:00Z', { sphere: 'north' });
console.log(lunar.key); // 'new-moon'
console.log(lunar.index); // 1
console.log(lunar.emoji); // '🌑'
```

### `getLunarPhaseRange`
Calculates exact start and end epoch millisecond boundaries for the current lunar phase cycle.

```typescript
function getLunarPhaseRange(dateInput: Date | number | string, options?: LunarPhaseOptions): LunarPhaseRange;
```

### `getSolarEvents`
Calculates exact Jean Meeus (Ch 27) equinoxes and solstices for a given year (-1000 to +3000).

```typescript
function getSolarEvents(year: number): SolarEventResult[];
```
**Example:**
```typescript
import { getSolarEvents } from '@magmacomputing/tempo-fns';

const events = getSolarEvents(2026);
// Returns Vernal, Summer, Autumnal, and Winter solar event timestamps
```

### `getSunriseSunset`
Calculates Sunrise, Sunset, Solar Noon, daylight duration, 1-based solar phase index (1..5), daily solar phase state (`daylight`, `night`, `civil-twilight`, `nautical-twilight`, `astronomical-twilight`), and twilight phase windows (`civil`, `nautical`, `astronomical`) for a date and location coordinates (`lat`, `lon` or `{ latitude, lat, longitude, long, lng }`).

```typescript
function getSunriseSunset(
  dateInput: Date | number | string,
  latOrOptions?: number | SolarOptions,
  lonInput?: number
): SunriseSunsetResult;
```
**Example:**
```typescript
import { getSunriseSunset } from '@magmacomputing/tempo-fns';

const solar = getSunriseSunset('2026-06-21T02:00:00Z', { lat: -33.8688, lng: 151.2093 });
console.log(solar.isDaylight); // true
console.log(solar.index); // 5 (daylight)
console.log(solar.civil.sunriseMs); // Civil twilight start timestamp
```

### `getZodiacSign`
Determines the Western Tropical Zodiac sign for a given date.

```typescript
function getZodiacSign(dateInput: Date | number | string): WesternZodiacSign;
```

### `getChineseZodiac`
Calculates Chinese Zodiac animal, element, and Yin/Yang state for a given year.

```typescript
function getChineseZodiac(year: number): ChineseZodiacResult;
```
