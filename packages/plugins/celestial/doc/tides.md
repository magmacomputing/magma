# Astronomical Tidal Mechanics & Coastal Predictions

This guide explores astronomical tidal state classification, syzygy and quadrature alignment, perigee factors, King Tide indicators, local coastal tide predictions, and lunitidal port calibration in `@magmacomputing/tempo-plugin-celestial`.

---

## 1. Deterministic Astronomical Calculations {#astronomical-calculations}

Tidal state resolution in `TidalTerm` (`t.term.tide`, `t.term.tides`) relies purely on deterministic celestial mechanics:
- **Ecliptic Longitude Delta (Δλ)**: The angular separation between the Sun and the Moon.
- **Anomalistic Month Perigee Proximity**: The Moon's orbital distance from Earth along its elliptical orbit (perigee vs. apogee).
- **Meridian Transit Geometry**: Lunar upper and lower culminations relative to observer longitude.

---

## 2. Tidal States (`t.term.tide` / `t.term.tides.state`) {#tidal-states}

| Tidal State | Astronomical Mechanism | Impact on Water Levels |
| :--- | :--- | :--- |
| `'spring'` | **Syzygy** (Δλ ≈ 0° New Moon or 180° Full Moon). Gravitational forces of Sun and Moon constructively reinforce. | Maximum tidal range (highest high tides, lowest low tides). |
| `'neap'` | **Quadrature** (Δλ ≈ 90° First Quarter or 270° Third Quarter). Gravitational forces act orthogonally. | Minimum tidal range (moderate high tides, moderate low tides). |
| `'normal'` | Intermediate orbital positions between syzygy and quadrature. | Standard daily tidal fluctuations. |

```typescript
import { Tempo } from '@magmacomputing/tempo';
import { CelestialPlugin } from '@magmacomputing/tempo-plugin-celestial';

Tempo.use(CelestialPlugin);

const t = new Tempo('2026-03-03T12:00:00Z', {
  geo: { lat: -33.8688, lng: 151.2093 }
});

console.log(t.term.tide);               // 'spring', 'neap', or 'normal'
console.log(t.term.tides.alignmentDeg); // Angular separation (0..360°)
console.log(t.term.tides.isSpringTide); // true during New or Full Moon
console.log(t.term.tides.isNeapTide);   // true during 1st or 3rd Quarter
```

---

## 3. King Tides & Perigee Factor (`isKingTide` / `perigeeFactor`) {#king-tides}

A **King Tide** (Perigean Spring Tide) occurs when a Spring Tide (New or Full Moon) coincides with the Moon at or near its closest orbital approach to Earth (**Perigee**).

- **`perigeeFactor`**: Normalized metric from 0.0 (Apogee, farthest) to 1.0 (Perigee, closest).
- **`isKingTide`**: Evaluates to `true` when `isSpringTide === true` and `perigeeFactor >= 0.75`.

```typescript
if (t.term.tides.isKingTide) {
  console.warn('King Tide Warning: Expect exceptionally high astronomical tides!');
  console.log('Perigee Proximity Factor:', t.term.tides.perigeeFactor);
}
```

---

## 4. Local Coastal Tide Predictions & Port Calibration {#coastal-predictions}

When observer coordinates are supplied, `TidalTerm` calculates the upcoming local high and low tides based on lunar meridian transits and local hydrodynamic port lag (lunitidal interval):

| Property | Type | Description |
| :--- | :--- | :--- |
| `nextHighTide` | `Tempo \| null` | `Tempo` instance for the estimated local high tide anchored to observer coordinates. |
| `nextLowTide` | `Tempo \| null` | `Tempo` instance for the estimated local low tide. |
| `lunitidalIntervalMin` | `number \| null` | Port-specific hydrodynamic phase lag offset in minutes. |
| `regime` | `'semi-diurnal' \| 'diurnal' \| 'mixed' \| null` | Tidal cycle pattern for the region. |

```typescript
const sydney = new Tempo('2026-03-03T12:00:00Z', {
  geo: { lat: -33.8688, lng: 151.2093 }
});

console.log(sydney.term.tides.nextHighTide?.iso); // e.g. "2026-03-03T15:24:10.000Z"
console.log(sydney.term.tides.nextLowTide?.iso);  // e.g. "2026-03-03T21:36:46.000Z"
console.log(sydney.term.tides.regime);           // 'semi-diurnal'

// Custom Port Calibration (e.g. 110-minute port lag)
const portCalibrated = new Tempo('2026-03-03T12:00:00Z', {
  geo: { lat: -33.8688, lng: 151.2093, lunitidalIntervalMin: 110 }
});
console.log(portCalibrated.term.tides.lunitidalIntervalMin); // 110
```

---

## 5. Lunar Tidal Cycle Minutes (`lunarTideMinute`) {#lunar-tidal-cycle}

When geographic coordinates are supplied, `t.term.tides.lunarTideMinute` reports the current minute within the 745.2-minute semi-diurnal lunar tidal cycle (≈ 12 hours 25.2 minutes between successive lunar culminations).
