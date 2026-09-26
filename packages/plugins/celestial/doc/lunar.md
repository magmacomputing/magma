# Lunar Ephemeris, Phases & Topocentric Position

This guide covers synodic lunar phase cycles, illumination ratio, lunar age, hemisphere-aware emoji rendering, topocentric horizon events (`moonrise`/`moonset`), meridian transits, real-time sky position (`altitude`/`azimuth`), crescent tilt orientation, distance, and supermoon/micromoon identification in `@magmacomputing/tempo-plugin-celestial`.

---

## 1. Lunar Phase Cycles (`t.term.moon` / `t.term.lunar`)

`LunarTerm` models the 29.53-day synodic month across 8 discrete phases:

| Phase Key | Phase Name | Illumination (%) | Age (Days) |
| :--- | :--- | :--- | :--- |
| `'new-moon'` | New Moon | 0% | 0.0 - 3.7 |
| `'waxing-crescent'` | Waxing Crescent | 1% - 49% | 3.7 - 7.4 |
| `'first-quarter'` | First Quarter | 50% | 7.4 - 11.1 |
| `'waxing-gibbous'` | Waxing Gibbous | 51% - 99% | 11.1 - 14.8 |
| `'full-moon'` | Full Moon | 100% | 14.8 - 18.5 |
| `'waning-gibbous'` | Waning Gibbous | 99% - 51% | 18.5 - 22.1 |
| `'third-quarter'` | Third Quarter | 50% | 22.1 - 25.8 |
| `'waning-crescent'` | Waning Crescent | 49% - 1% | 25.8 - 29.53 |

```typescript
import { Tempo } from '@magmacomputing/tempo';
import { CelestialPlugin } from '@magmacomputing/tempo-plugin-celestial';

Tempo.use(CelestialPlugin);

const t = new Tempo('2026-03-03T12:00:00Z', { sphere: 'north' });

console.log(t.term.moon);               // 'full-moon'
console.log(t.term.lunar.phase);        // 'Full Moon'
console.log(t.term.lunar.index);        // 5 (1-based index)
console.log(t.term.lunar.illumination); // 1.0
console.log(t.term.lunar.ageDays);      // ~14.8 days
console.log(t.term.lunar.isWaxing);     // false
```

---

## 2. Hemisphere-Aware Visual Emoji (`lunar.emoji`)

Because the Moon's illuminated crescent appears reversed between the Northern and Southern Hemispheres, configuring `sphere: 'south'` (or passing negative latitude coordinates) adjusts visual emoji indicators:

```typescript
const north = new Tempo('2026-06-18', { sphere: 'north' });
console.log(north.term.lunar.emoji); // 🌒 (Waxing Crescent - North)

const south = new Tempo('2026-06-18', { sphere: 'south' });
console.log(south.term.lunar.emoji); // 🌘 (Waxing Crescent - South)
```

---

## 3. Location-Aware Horizon & Transit Events

When geographic coordinates are supplied, `LunarTerm` resolves observer-specific topocentric rise, set, and upper meridian culmination events:

```typescript
const t = new Tempo('2026-06-21T12:00:00Z', {
  geo: { lat: -33.8688, lng: 151.2093 } // Sydney
});

if (t.term.lunar.moonrise) {
  console.log('Moonrise:', t.term.lunar.moonrise.format('{hh}:{mi}'));
}

if (t.term.lunar.transit) {
  console.log('Meridian Transit (highest altitude):', t.term.lunar.transit.format('{hh}:{mi}'));
}

if (t.term.lunar.moonset) {
  console.log('Moonset:', t.term.lunar.moonset.format('{hh}:{mi}'));
}
```

---

## 4. Real-Time Topocentric Sky Position

`LunarTerm` computes the real-time apparent position of the Moon in the observer's sky, corrected for horizontal parallax and atmospheric refraction:

- **`altitude`**: Degrees above (+) or below (-) the local horizon (-90°..90°).
- **`azimuth`**: Compass bearing in degrees (0°..360°, where North = 0°, East = 90°, South = 180°, West = 270°).
- **`isAboveHorizon`**: Boolean flag indicating if the Moon is currently above the local horizon.

```typescript
const t = new Tempo('2026-09-02T12:00:00Z', {
  geo: { lat: 51.5074, lng: -0.1278 } // London
});

console.log('Altitude:', t.term.lunar.altitude);             // e.g. 42.15°
console.log('Azimuth:', t.term.lunar.azimuth);               // e.g. 172.84° (South-Southeast)
console.log('Visible in Sky:', t.term.lunar.isAboveHorizon); // true
```

---

## 5. Crescent Tilt & Bright Limb Angle (`lunar.crescentTiltDeg`)

The visual orientation of the Moon's illuminated crescent relative to the zenith depends on observer latitude and local hour angle:

- In tropical and equatorial latitudes (|lat| < 23.5°), the crescent appears "lying on its back" (the *Wet Moon* or *Cheshire Cat Moon*).
- In polar and temperate latitudes, the crescent appears upright.
- **`crescentTiltDeg`** resolves the angle (0°..360°) relative to the local vertical (Zenith), enabling pixel-accurate SVG and UI canvas rendering.

```typescript
const singapore = new Tempo('2026-09-15T12:00:00Z', {
  geo: { lat: 1.3521, lng: 103.8198 } // Equatorial latitude
});

console.log('Crescent Tilt (Zenith-relative):', singapore.term.lunar.crescentTiltDeg); // ~92.4°
```

---

## 6. Distance, Apparent Size, Supermoons & Micromoons

The Moon's elliptical orbit causes its distance from Earth to fluctuate between ~356,400 km (perigee) and ~406,700 km (apogee):

- **`distanceKm`**: Topocentric distance from observer to the Moon in kilometers.
- **`angularDiameterArcmin`**: Apparent visual size of the lunar disk in arcminutes (~29.3' to 34.1').
- **`isSupermoon`**: `true` when a Full Moon or New Moon occurs near perigee (distance ≤ 362,000 km).
- **`isMicromoon`**: `true` when a Full Moon or New Moon occurs near apogee (distance ≥ 404,000 km).

```typescript
const huntersMoon = new Tempo('2024-10-17T11:26:00Z', {
  geo: { lat: 40.7128, lng: -74.006 }
});

console.log('Distance (km):', huntersMoon.term.lunar.distanceKm); // ~357,364 km
console.log('Angular Diameter:', huntersMoon.term.lunar.angularDiameterArcmin); // ~33.43 arcmin
console.log('Is Supermoon:', huntersMoon.term.lunar.isSupermoon); // true
console.log('Is Micromoon:', huntersMoon.term.lunar.isMicromoon); // false
```

---

## 7. Local Solar & Lunar Eclipse Obscuration (`lunar.eclipse` & `lunar.obscuration`)

`LunarTerm` provides real-time local eclipse classification and disk obscuration fraction based on the observer's geographic coordinates:

- **`eclipse`**: Detects active eclipses (`'total-solar'`, `'annular-solar'`, `'partial-solar'`, `'total-lunar'`, `'partial-lunar'`, `'penumbral-lunar'`, or `null`).
- **`obscuration`**: Fraction of the solar or lunar disk obscured for the observer (0.0 to 1.0).

```typescript
// Solar Eclipse (April 8, 2024 - Dallas, TX)
const solarEclipse = new Tempo('2024-04-08T18:40:00Z', {
  geo: { lat: 32.7767, lng: -96.7970 }
});

console.log('Active Eclipse:', solarEclipse.term.lunar.eclipse);       // e.g. 'partial-solar' / 'total-solar'
console.log('Disk Obscuration:', solarEclipse.term.lunar.obscuration); // e.g. 0.60 .. 1.0

// Lunar Eclipse (May 16, 2022 - New York, NY)
const lunarEclipse = new Tempo('2022-05-16T04:12:00Z', {
  geo: { lat: 40.7128, lng: -74.0060 }
});

console.log('Active Eclipse:', lunarEclipse.term.lunar.eclipse);       // 'total-lunar'
console.log('Disk Obscuration:', lunarEclipse.term.lunar.obscuration); // 1.0
```



