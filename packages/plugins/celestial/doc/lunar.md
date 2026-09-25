# Lunar Ephemeris, Phases & Moonrise/Moonset

This guide covers synodic lunar phase cycles, illumination ratio, lunar age, hemisphere-aware emoji rendering, and topocentric moonrise/moonset events in `@magmacomputing/tempo-plugin-celestial`.

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

Because the Moon's illuminated crescent appears reversed between the Northern and Southern Hemispheres, configuring `sphere: 'south'` adjusts visual emoji indicators:

```typescript
const north = new Tempo('2026-06-18', { sphere: 'north' });
console.log(north.term.lunar.emoji); // 🌒 (Waxing Crescent - North)

const south = new Tempo('2026-06-18', { sphere: 'south' });
console.log(south.term.lunar.emoji); // 🌘 (Waxing Crescent - South)
```

---

## 3. Location-Aware Moonrise & Moonset

When geographic coordinates are supplied, `t.term.lunar.moonrise` and `t.term.lunar.moonset` return `Tempo` instances representing local topocentric horizon events:

```typescript
const t = new Tempo('2026-06-21T12:00:00Z', {
  geo: { lat: -33.8688, lng: 151.2093 } // Sydney
});

if (t.term.lunar.moonrise) {
  console.log('Moonrise:', t.term.lunar.moonrise.format('HH:mm'));
}

if (t.term.lunar.moonset) {
  console.log('Moonset:', t.term.lunar.moonset.format('HH:mm'));
}
```
