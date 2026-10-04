<div class="plugin-eyebrow">
  <a href="./index.html">← @magmacomputing/tempo-plugin-spatial</a>
</div>

<br>

# Natural Solar Time Offset

This guide explains natural solar time offset calculations and meridian longitudinal delta modeling in `@magmacomputing/tempo-plugin-spatial`.

---

## 1. Natural Solar Time vs. Clock Time

Standard civil time zones group wide longitudinal bands (typically ≈ 15° wide) into uniform standard offsets (e.g. UTC+1, UTC-5). However, Earth rotates continuously at:

```
1° longitude = 4 minutes of time = 240 seconds
```

The **Natural Solar Time Offset** measures the exact physical time difference between an observer's physical longitude (`lng`) and their standard reference timezone meridian (or the nearest 15° meridian: `round(lng / 15) * 15°`).

---

## 2. API Usage (`Tempo.spatial.solarOffset` / `t.spatialSolarOffset` / `solarOffset`)

The `solarOffset` method computes this delta in minutes (default), seconds, or hours:

```typescript
import { Tempo } from '@magmacomputing/tempo';
import { SpatialPlugin, solarOffset } from '@magmacomputing/tempo-plugin-spatial';

Tempo.use(SpatialPlugin);

// Sydney: Longitude 151.2093° East vs Reference Meridian 150° East (UTC+10)
// Delta: (151.2093° - 150°) * 4 min/deg ≈ +4.84 minutes
const sydneyOffsetMin = Tempo.spatial.solarOffset({ lat: -33.8688, lng: 151.2093 });
console.log(sydneyOffsetMin); // ~4.84 minutes

// Offset in seconds
const sydneyOffsetSec = Tempo.spatial.solarOffset({ lat: -33.8688, lng: 151.2093 }, { unit: 'ss' });
console.log(sydneyOffsetSec); // ~290.23 seconds

// Offset in hours
const sydneyOffsetHours = Tempo.spatial.solarOffset({ lat: -33.8688, lng: 151.2093 }, { unit: 'hh' });
console.log(sydneyOffsetHours); // ~0.08 hours

// Via Tempo instance
const tSydney = new Tempo({ geo: { lat: -33.8688, lng: 151.2093 } });
console.log(tSydney.spatialSolarOffset()); // ~4.84 minutes
```

---

## 3. Dual-Tier Architecture: `spatial` vs `celestial`

| Dimension | `Tempo.spatial.solarOffset` (`tempo-plugin-spatial`) | `SolarTerm` (`tempo-plugin-celestial`) |
| :--- | :--- | :--- |
| **Concept** | **Natural Solar Time Offset** (Longitudinal Delta) | **Apparent Solar Trajectory & Ephemeris** |
| **Physics** | Longitudinal delta (Δλ × 4 min/deg) from reference meridian | Exact orbital solar altitude, Equation of Time (EoT), and transit |
| **Runtime Cost** | O(1) analytical geometry, zero external dependencies | Keplerian orbital ephemeris & trigonometric modeling |
| **Use Cases** | Circadian light tracking, timezone meridian drift | Twilight tracking, golden hour photography, apparent solar noon |
| **API Target** | `Tempo.spatial.solarOffset(coords)` | `t.term.solar.noon` & `t.term.solar.solarTime` |
