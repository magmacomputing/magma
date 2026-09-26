# Natural Solar Time Offset

This guide explains natural solar time offset calculations and meridian longitudinal delta modeling in `@magmacomputing/tempo-plugin-geo`.

---

## 1. Natural Solar Time vs. Clock Time

Standard civil time zones group wide longitudinal bands (typically ≈ 15° wide) into uniform standard offsets (e.g. UTC+1, UTC-5). However, Earth rotates continuously at:

```
1° longitude = 4 minutes of time = 240 seconds
```

The **Natural Solar Time Offset** measures the exact physical time difference between an observer's physical longitude (`lng`) and their standard reference timezone meridian (or the nearest 15° meridian: `round(lng / 15) * 15°`).

---

## 2. API Usage (`Tempo.geo.solarOffset` / `t.geoSolarOffset`)

The `solarOffset` method computes this delta in minutes (default), seconds, or hours:

```typescript
import { Tempo } from '@magmacomputing/tempo';
import { GeoPlugin } from '@magmacomputing/tempo-plugin-geo';

Tempo.use(GeoPlugin);

// Sydney: Longitude 151.2093° East vs Reference Meridian 150° East (UTC+10)
// Delta: (151.2093° - 150°) * 4 min/deg ≈ +4.84 minutes
const sydneyOffsetMin = Tempo.geo.solarOffset({ lat: -33.8688, lng: 151.2093 });
console.log(sydneyOffsetMin); // ~4.84 minutes

// Offset in seconds
const sydneyOffsetSec = Tempo.geo.solarOffset({ lat: -33.8688, lng: 151.2093 }, { unit: 'ss' });
console.log(sydneyOffsetSec); // ~290.23 seconds

// Offset in hours
const sydneyOffsetHours = Tempo.geo.solarOffset({ lat: -33.8688, lng: 151.2093 }, { unit: 'hh' });
console.log(sydneyOffsetHours); // ~0.08 hours

// Via Tempo instance
const tSydney = new Tempo({ geo: { lat: -33.8688, lng: 151.2093 } });
console.log(tSydney.geoSolarOffset()); // ~4.84 minutes
```

---

## 3. Dual-Tier Hybrid Architecture: `geo` vs `celestial`

A common question is when to use `Tempo.geo.solarOffset` versus `t.term.solar.solarTime` from `tempo-plugin-celestial`:

| Dimension | `Tempo.geo.solarOffset` (`tempo-plugin-geo`) | `SolarTerm` (`tempo-plugin-celestial`) |
| :--- | :--- | :--- |
| **Concept** | **Natural Solar Time Offset** (Longitudinal Delta) | **Apparent Solar Trajectory & Ephemeris** |
| **Physics** | Longitudinal delta (`Δλ × 4 min/deg`) from reference meridian | Exact orbital solar altitude, Equation of Time (EoT), and transit |
| **Runtime Cost** | O(1) analytical geometry, zero external dependencies | Keplerian orbital ephemeris & trigonometric modeling |
| **Use Cases** | Circadian light tracking, timezone meridian drift | Twilight tracking, golden hour photography, apparent solar noon |
| **API Target** | `Tempo.geo.solarOffset(coords)` | `t.term.solar.noon` & `t.term.solar.solarTime` |
