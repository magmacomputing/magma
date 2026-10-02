# Astronomical & Celestial Utilities
This directory contains pure astronomical, solar, lunar, tidal, eclipse, and zodiac calculation functions built on high-precision Jean Meeus algorithms.

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

### `getMoonriseMoonset`
Calculates exact Moonrise and Moonset timestamps for a given date and location coordinates (`lat`, `lng`).

```typescript
function getMoonriseMoonset(
  dateInput: Date | number | string,
  latOrOptions?: number | SolarOptions,
  lngInput?: number
): MoonriseMoonsetResult;
```
**Example:**
```typescript
import { getMoonriseMoonset } from '@magmacomputing/tempo-fns';

const moon = getMoonriseMoonset('2026-10-02', { lat: 40.7128, lng: -74.006 });
console.log(moon.moonriseMs);
console.log(moon.moonsetMs);
```

### `getLunarPosition` & `getLunarDistance`
Calculates topocentric/geocentric lunar coordinates (Right Ascension, Declination, Altitude, Azimuth) and Earth-Moon distance in kilometers.

```typescript
function getLunarPosition(dateInput: Date | number | string, latOrOptions?: number | SolarOptions, lngInput?: number): LunarPositionResult;
function getLunarDistance(dateInput: Date | number | string): LunarDistanceResult;
```

### `getCrescentTilt`
Calculates the visual crescent tilt angle (parallactic angle) of the Moon as seen by an observer on Earth.

```typescript
function getCrescentTilt(dateInput: Date | number | string, latOrOptions?: number | SolarOptions, lngInput?: number): CrescentTiltResult;
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
Calculates Sunrise, Sunset, Solar Noon, daylight duration, 1-based solar phase index (1..5), daily solar phase state (`daylight`, `night`, `civil-twilight`, `nautical-twilight`, `astronomical-twilight`), and twilight phase windows (`civil`, `nautical`, `astronomical`) for a date and location coordinates.

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

### `getSolarPosition`
Calculates solar altitude, azimuth, declination, and right ascension for a given date and location.

```typescript
function getSolarPosition(dateInput: Date | number | string, latOrOptions?: number | SolarOptions, lonInput?: number): SolarPositionResult;
```

### `getTidalState`
Estimates coastal tidal state (High, Low, Flood, Ebb) and Spring/Neap cycle classification based on lunar and solar ephemeris.

```typescript
function getTidalState(dateInput: Date | number | string, options?: TidalOptions): TidalResult;
```

### `getEclipse`
Identifies solar and lunar eclipse occurrences and circumstances near a date.

```typescript
function getEclipse(dateInput: Date | number | string): EclipseResult | undefined;
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
