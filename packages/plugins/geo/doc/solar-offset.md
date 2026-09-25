# Natural Solar Time Offset

This guide explains natural solar time offset calculations and meridian longitudinal delta modeling in `@magmacomputing/tempo-plugin-geo`.

---

## 1. Natural Solar Time vs. Clock Time

Standard civil time zones group wide longitudinal bands (typically $\approx 15^\circ$ wide) into uniform standard offsets (e.g. UTC+1, UTC-5). However, Earth rotates continuously at:

$$1^\circ\text{ longitude} = 4\text{ minutes of time} = 240,000\text{ ms}$$

The **Natural Solar Time Offset** measures the exact physical time difference between an observer's physical longitude ($\lambda$) and the UTC Prime Meridian ($0^\circ$).

---

## 2. API Usage (`Tempo.geo.solarOffset` / `t.geoSolarOffset`)

The `solarOffset` method computes this delta in minutes (default) or milliseconds:

```typescript
import { Tempo } from '@magmacomputing/tempo';
import { GeoPlugin } from '@magmacomputing/tempo-plugin-geo';

Tempo.use(GeoPlugin);

// Sydney: Longitude 151.2093° East
// 151.2093° * 4 min/deg ≈ 604.837 minutes (≈ +10h 04m 50s)
const sydneyOffsetMin = Tempo.geo.solarOffset({ lat: -33.8688, lng: 151.2093 });
console.log(sydneyOffsetMin); // ~604.84 minutes

// Offset in milliseconds
const sydneyOffsetMs = Tempo.geo.solarOffset({ lat: -33.8688, lng: 151.2093 }, 'ms');
console.log(sydneyOffsetMs); // ~36,290,232 ms

// Via Tempo instance
const tSydney = new Tempo({ geo: { lat: -33.8688, lng: 151.2093 } });
console.log(tSydney.geoSolarOffset()); // ~604.84 minutes
```

---

## 3. Dual-Tier Hybrid Architecture: `geo` vs `celestial`

A common question is when to use `Tempo.geo.solarOffset` versus `t.term.solar.solarTime` from `tempo-plugin-celestial`:

| Dimension | `Tempo.geo.solarOffset` (`tempo-plugin-geo`) | `SolarTerm` (`tempo-plugin-celestial`) |
| :--- | :--- | :--- |
| **Concept** | **Natural Solar Time Offset** (Longitudinal Delta) | **Apparent Solar Trajectory & Ephemeris** |
| **Physics** | $\Delta \lambda \times 4\text{ min/deg}$ from Prime Meridian | Exact orbital solar altitude, Equation of Time (EoT), and transit |
| **Runtime Cost** | $O(1)$ analytical geometry, zero external dependencies | Keplerian orbital ephemeris & trigonometric modeling |
| **Use Cases** | Circadian light tracking, timezone meridian drift | Twilight tracking, golden hour photography, apparent solar noon |
| **API Target** | `Tempo.geo.solarOffset(coords)` | `t.term.solar.noon` & `t.term.solar.solarTime` |
