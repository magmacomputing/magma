# Astronomical Tidal Mechanics

This guide explores astronomical tidal state classification, syzygy and quadrature alignment, perigee factors, and King Tide indicators in `@magmacomputing/tempo-plugin-celestial`.

---

## 1. Deterministic Astronomical Calculations

Tidal state resolution in `TidalTerm` (`t.term.tide`, `t.term.tides`) relies purely on deterministic celestial mechanics:
- **Ecliptic Longitude Delta ($\Delta\lambda$)**: The angular separation between the Sun and the Moon.
- **Anomalistic Month Perigee Proximity**: The Moon's orbital distance from Earth along its elliptical orbit (perigee vs. apogee).

---

## 2. Tidal States (`t.term.tide` / `t.term.tides.state`)

| Tidal State | Astronomical Mechanism | Impact on Water Levels |
| :--- | :--- | :--- |
| `'spring'` | **Syzygy** ($\Delta\lambda \approx 0^\circ$ New Moon or $180^\circ$ Full Moon). Gravitational forces of Sun and Moon constructively reinforce. | Maximum tidal range (highest high tides, lowest low tides). |
| `'neap'` | **Quadrature** ($\Delta\lambda \approx 90^\circ$ First Quarter or $270^\circ$ Third Quarter). Gravitational forces act orthogonally. | Minimum tidal range (moderate high tides, moderate low tides). |
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

## 3. King Tides & Perigee Factor (`isKingTide` / `perigeeFactor`)

A **King Tide** (Perigean Spring Tide) occurs when a Spring Tide (New or Full Moon) coincides with the Moon at or near its closest orbital approach to Earth (**Perigee**).

- **`perigeeFactor`**: Normalized metric from $0.0$ (Apogee, farthest) to $1.0$ (Perigee, closest).
- **`isKingTide`**: Evaluates to `true` when `isSpringTide === true` and `perigeeFactor \ge 0.85`.

```typescript
if (t.term.tides.isKingTide) {
  console.warn('King Tide Warning: Expect exceptionally high astronomical tides!');
  console.log('Perigee Proximity Factor:', t.term.tides.perigeeFactor);
}
```

---

## 4. Lunar Tidal Cycle Minutes (`lunarTideMinute`)

When geographic coordinates are supplied, `t.term.tides.lunarTideMinute` reports the current minute within the $745.2\text{-minute}$ semi-diurnal lunar tidal cycle ($\approx 12\text{ hours } 25.2\text{ minutes}$ between successive lunar culminations).
