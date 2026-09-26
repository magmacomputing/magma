# Solar Day Cycles, Ephemeris & Apparent Solar Time

This guide covers solar twilight state classifications, horizon dip elevation adjustments, exact solar noon, Local Apparent Solar Time (AST), real-time horizontal coordinates, photometric lighting phases, and polar day/night handling in `@magmacomputing/tempo-plugin-celestial`.

---

## 1. Solar Phase States (`t.term.sun` / `t.term.solar`) {#solar-phase-states}

`SolarTerm` classifies the solar day into 5 deterministic states based on the Sun's center angle relative to the local geometric horizon:

| Solar State | Solar Elevation Angle (α) | Description |
| :--- | :--- | :--- |
| `'daylight'` | `α ≥ -0.833° - dip` | Sun is above the visible horizon. Full natural illumination. |
| `'civil-twilight'` | `-6° ≤ α < -0.833° - dip` | Bright twilight. Terrestrial objects are clearly distinguishable without artificial light. |
| `'nautical-twilight'` | `-12° ≤ α < -6°` | Medium twilight. Sea horizon is faintly visible; first-magnitude navigation stars appear. |
| `'astronomical-twilight'` | `-18° ≤ α < -12°` | Dark twilight. Sun no longer illuminates the sky; fainter stars become visible. |
| `'night'` | `α < -18°` | Total astronomical darkness. |

```typescript
import { Tempo } from '@magmacomputing/tempo';
import { CelestialPlugin } from '@magmacomputing/tempo-plugin-celestial';

Tempo.use(CelestialPlugin);

const t = new Tempo('2026-06-21T12:00:00Z', { geo: { lat: 40.7128, lng: -74.006 } });

console.log(t.term.sun);          // 'daylight'
console.log(t.term.solar.key);    // 'daylight'
console.log(t.term.solar.phase);  // 'Daylight'
console.log(t.term.solar.phases); // ['night', 'astronomical-twilight', 'nautical-twilight', 'civil-twilight', 'daylight']
```

---

## 2. Apparent Solar Noon (`t.term.solar.noon`) {#solar-noon}

`t.term.solar.noon` returns a `Tempo` instance representing the exact moment of the Sun's transit across the local observer's celestial meridian (the highest solar altitude of the day).

```typescript
const t = new Tempo('2026-06-21T12:00:00Z', { geo: { lat: 40.7128, lng: -74.006 } });

const solarNoon = t.term.solar.noon;
console.log(solarNoon.iso); // e.g. "2026-06-21T16:57:21.134Z"
```

---

## 3. Local Apparent Solar Time (`t.term.solar.solarTime`) {#apparent-solar-time}

Local Apparent Solar Time (AST) is the time measured directly by the apparent position of the Sun (a true solar sundial clock).

It incorporates:
1. Observer longitudinal displacement: `Δλ × 4 min/deg` from the Prime Meridian.
2. The **Equation of Time (EoT)**: accounting for Earth's orbital eccentricity and axial tilt (≈ -14 to +16 minutes variance across the year).

At the exact moment of solar noon, `solarTime` aligns to `12:00:00.000`.

```typescript
const t = new Tempo('2026-06-21T12:00:00Z', { geo: { lat: 40.7128, lng: -74.006 } });

// Query apparent solar time at current moment
const ast = t.term.solar.solarTime;
console.log(ast.format('{hh}:{mi}:{ss}')); // Local solar clock time

// At exact solar noon:
const atNoon = new Tempo(t.term.solar.noon.epoch.ms, { geo: { lat: 40.7128, lng: -74.006 } });
console.log(atNoon.term.solar.solarTime.format('{hh}:{mi}:{ss}')); // "12:00:00"
```

---

## 4. Atmospheric Elevation Dip Correction (`elevation`) {#elevation-dip}

Observers at higher elevations experience an expanded visible horizon due to geometric horizon dip:

```
dip ≈ 0.0347° × √(elevation_meters)
```

Passing `elevation` (in meters) automatically adjusts `sunrise`, `sunset`, and twilight timestamps:

```typescript
// Denver observer at 1,600 meters elevation
const denver = new Tempo('2026-06-21T12:00:00Z', {
  geo: { lat: 39.7392, lng: -104.9903, elevation: 1600 }
});

console.log(denver.term.solar.elevation);          // 1600
console.log(denver.term.solar.daylightDurationMs); // Longer daylight duration than sea level
```

---

## 5. Real-Time Solar Coordinates & Photometric Hours {#solar-coordinates}

When geographic coordinates are present, `SolarTerm` exposes topocentric horizontal coordinates and photography lighting metrics:

| Property | Type | Description |
| :--- | :--- | :--- |
| `altitude` | `number \| null` | Topocentric solar elevation angle in degrees above (+) or below (-) horizon (-90°..+90°). |
| `azimuth` | `number \| null` | Solar compass bearing in degrees (0°..360°, where 0° = North, 90° = East, 180° = South, 270° = West). |
| `zenith` | `number \| null` | Angular distance in degrees from the overhead zenith (`90° - altitude`). |
| `isGoldenHour` | `boolean \| null` | True when solar altitude is between -4° and +6° (warm, diffused sunlight). |
| `isBlueHour` | `boolean \| null` | True when solar altitude is between -6° and -4° (deep blue twilight sky). |
| `shadowRatio` | `number \| null` | Vertical object shadow length multiplier (`cot(altitude)`), or `null` when Sun is below the horizon. |

```typescript
const sydney = new Tempo('2026-12-21T02:00:00Z', {
  geo: { lat: -33.8688, lng: 151.2093 }
});

console.log(sydney.term.solar.altitude);     // e.g. 78.5°
console.log(sydney.term.solar.azimuth);      // Compass bearing in degrees
console.log(sydney.term.solar.shadowRatio);  // Object shadow multiplier
console.log(sydney.term.solar.isGoldenHour); // false
console.log(sydney.term.solar.isBlueHour);   // false
```

---

## 6. Polar Regions Handling (Midnight Sun & Polar Night) {#polar-regions}

In high-latitude regions (|lat| > 66.5°), the Sun may remain continuously above or below the horizon for extended periods:

- **`isMidnightSun`**: `true` on dates when the Sun remains continuously above the visible horizon for 24 hours. `sunrise` and `sunset` evaluate to `null`, `daylightDurationMs` is 86,400,000 ms, and `key` remains `'daylight'`.
- **`isPolarNight`**: `true` on dates when the Sun does not rise above the visible horizon. `sunrise` and `sunset` evaluate to `null`, `daylightDurationMs` is 0 ms, and `key` transitions between twilight states (such as `'civil-twilight'` at midday) and total `'night'`.

```typescript
// Tromsø, Norway (69.65° N) on Summer Solstice
const midnightSun = new Tempo('2026-06-21T12:00:00Z', {
  geo: { lat: 69.6492, lng: 18.9553 }
});

console.log(midnightSun.term.solar.isMidnightSun); // true
console.log(midnightSun.term.solar.sunrise);       // null
console.log(midnightSun.term.solar.isDaylight);    // true

// Tromsø, Norway on Winter Solstice
const polarNight = new Tempo('2026-12-21T12:00:00Z', {
  geo: { lat: 69.6492, lng: 18.9553 }
});

console.log(polarNight.term.solar.isPolarNight);   // true
console.log(polarNight.term.solar.key);            // 'civil-twilight' at midday
```

---

## 7. Twilight Range Boundaries {#twilight-windows}

`t.term.solar.civil`, `t.term.solar.nautical`, and `t.term.solar.astronomical` provide sub-objects with `sunrise` and `sunset` `Tempo` instances for each twilight band:

```typescript
const { civil, nautical, astronomical } = t.term.solar;

console.log(civil.sunrise?.format('{hh}:{mi}')); // Civil dawn
console.log(civil.sunset?.format('{hh}:{mi}'));  // Civil dusk
```
