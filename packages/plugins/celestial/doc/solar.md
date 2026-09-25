# Solar Day Cycles, Ephemeris & Apparent Solar Time

This guide covers solar twilight state classifications, horizon dip elevation adjustments, exact solar noon, and Local Apparent Solar Time (AST) in `@magmacomputing/tempo-plugin-celestial`.

---

## 1. Solar Phase States (`t.term.sun` / `t.term.solar`)

`SolarTerm` classifies the solar day into 5 deterministic states based on the Sun's center angle relative to the local geometric horizon:

| Solar State | Solar Elevation Angle (α) | Description |
| :--- | :--- | :--- |
| `'daylight'` | `α >= -0.833° - dip` | Sun is above the visible horizon. Full natural illumination. |
| `'civil-twilight'` | `-6° <= α < -0.833° - dip` | Bright twilight. Terrestrial objects are clearly distinguishable without artificial light. |
| `'nautical-twilight'` | `-12° <= α < -6°` | Medium twilight. Sea horizon is faintly visible; first-magnitude navigation stars appear. |
| `'astronomical-twilight'` | `-18° <= α < -12°` | Dark twilight. Sun no longer illuminates the sky; fainter stars become visible. |
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

## 2. Apparent Solar Noon (`t.term.solar.noon`)

`t.term.solar.noon` returns a `Tempo` instance representing the exact moment of the Sun's transit across the local observer's celestial meridian (the highest solar altitude of the day).

```typescript
const t = new Tempo('2026-06-21T12:00:00Z', { geo: { lat: 40.7128, lng: -74.006 } });

const solarNoon = t.term.solar.noon;
console.log(solarNoon.iso); // e.g. "2026-06-21T16:57:21.134Z"
```

---

## 3. Local Apparent Solar Time (`t.term.solar.solarTime`)

Local Apparent Solar Time (AST) is the time measured directly by the apparent position of the Sun (a true solar sundial clock).

It incorporates:
1. Observer longitudinal displacement: `Δλ × 4 min/deg` from the Prime Meridian.
2. The **Equation of Time (EoT)**: accounting for Earth's orbital eccentricity and axial tilt (≈ -14 to +16 minutes variance across the year).

At the exact moment of solar noon, `solarTime` aligns to `12:00:00.000`.

```typescript
const t = new Tempo('2026-06-21T12:00:00Z', { geo: { lat: 40.7128, lng: -74.006 } });

// Query apparent solar time at current moment
const ast = t.term.solar.solarTime;
console.log(ast.format('HH:mm:ss')); // Local solar clock time

// At exact solar noon:
const atNoon = new Tempo(t.term.solar.noon.epoch.ms, { geo: { lat: 40.7128, lng: -74.006 } });
console.log(atNoon.term.solar.solarTime.format('HH:mm:ss')); // "12:00:00"
```

---

## 4. Atmospheric Elevation Dip Correction (`elevation`)

Observers at higher elevations experience an expanded visible horizon due to geometric horizon dip:

```
dip ≈ 0.0347° × sqrt(elevation_meters)
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

## 5. Twilight Range Boundaries

`t.term.solar.civil`, `t.term.solar.nautical`, and `t.term.solar.astronomical` provide sub-objects with `sunrise` and `sunset` `Tempo` instances for each twilight band:

```typescript
const { civil, nautical, astronomical } = t.term.solar;

console.log(civil.sunrise.format('HH:mm')); // Civil dawn
console.log(civil.sunset.format('HH:mm'));  // Civil dusk
```
