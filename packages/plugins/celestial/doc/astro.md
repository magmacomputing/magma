<div class="plugin-eyebrow">
  <a href="./index.html">← @magmacomputing/tempo-plugin-celestial</a>
</div>

<br>

# Astronomical Seasons, Solstices & Equinoxes

This guide explores astronomical solar quarters, equinoxes, solstices, and hemisphere-aware season calculations in `@magmacomputing/tempo-plugin-celestial`.

---

## 1. Overview & Mechanics {#overview}

`AstroTerm` (`t.term.astro`, `t.term.astronomy`, `t.term.equinox`, `t.term.solstice`) calculates the precise astronomical moments when the Sun crosses the celestial equator (Equinoxes) or reaches its northernmost / southernmost declinations (Solstices).

Calculations utilize the high-precision Jean Meeus solar ephemeris polynomial algorithms implemented in `@magmacomputing/tempo-fns`, providing sub-minute accuracy across historical and future years without requiring internet access.

---

## 2. Astronomical Events & Quarters {#events-and-quarters}

| Event Key | Astronomical Event | Northern Hemisphere Season | Southern Hemisphere Season | Approximate Date |
| :--- | :--- | :--- | :--- | :--- |
| `'Vernal'` | **Spring Equinox** (Solar Longitude = 0°) | Spring | Autumn | March 20–21 |
| `'Summer'` | **Summer Solstice** (Solar Longitude = 90°) | Summer | Winter | June 20–22 |
| `'Autumnal'` | **Autumnal Equinox** (Solar Longitude = 180°) | Autumn | Spring | September 22–23 |
| `'Winter'` | **Winter Solstice** (Solar Longitude = 270°) | Winter | Summer | December 21–22 |

```typescript
import { Tempo } from '@magmacomputing/tempo';
import { CelestialPlugin } from '@magmacomputing/tempo-plugin-celestial';

Tempo.use(CelestialPlugin);

// 1. Northern Hemisphere evaluation
const summerNorth = new Tempo('2026-07-15', { sphere: 'north' });
console.log(summerNorth.term.astro);             // 'Summer'
console.log(summerNorth.term.astronomy.season);  // 'Summer'
console.log(summerNorth.term.astronomy.event);   // 'Solstice'
console.log(summerNorth.term.solstice);          // 'Summer'

// 2. Southern Hemisphere evaluation (inverts seasonal labels)
const winterSouth = new Tempo('2026-07-15', { sphere: 'south' });
console.log(winterSouth.term.astro);             // 'Summer' (astronomy quarter key)
console.log(winterSouth.term.astronomy.season);  // 'Winter' (actual hemisphere season)
console.log(winterSouth.term.astronomy.event);   // 'Solstice'
```

---

## 3. Scoped Ephemeris Details (`t.term.astronomy`) {#astronomy-details}

Accessing `t.term.astronomy` provides the complete structured record for the active astronomical quarter:

```typescript
const t = new Tempo('2026-03-20T12:00:00Z', { sphere: 'north' });
const astro = t.term.astronomy;

console.log(astro.key);      // 'Vernal'
console.log(astro.season);   // 'Spring'
console.log(astro.event);    // 'Equinox'
console.log(astro.year);     // 2026
console.log(astro.month);    // 3
console.log(astro.day);      // 20
console.log(astro.hour);     // 14 (exact UTC hour of equinox)
console.log(astro.minute);   // 45 (exact UTC minute)
console.log(astro.start);    // Tempo instance for the quarter's start boundary
console.log(astro.end);      // Tempo instance for the quarter's end boundary
```

---

## 4. Querying Specific Astronomical Events (`t.term.equinox` / `t.term.solstice`) {#specific-events}

You can filter queries directly for equinoxes or solstices:

```typescript
const spring = new Tempo('2026-04-01', { sphere: 'north' });

// Resolves only equinoxes
console.log(spring.term.equinox);   // 'Vernal'

// Resolves only solstices
const june = new Tempo('2026-06-25', { sphere: 'north' });
console.log(june.term.solstice);   // 'Summer'
```

---

## 5. Standalone Usage {#standalone}

If you only need astronomical seasons without the other celestial ephemeris terms, you can import and register `AstroTerm` directly:

```typescript
import { Tempo } from '@magmacomputing/tempo';
import { AstroTerm } from '@magmacomputing/tempo-plugin-celestial';

Tempo.use(AstroTerm);

const t = new Tempo('2026-09-23', { sphere: 'north' });
console.log(t.term.astro); // 'Autumnal'
```
