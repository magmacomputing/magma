![Tempo Plugin](/plugin-logo.svg)

# @magmacomputing/tempo-plugin-celestial

<p align="center">
  <a href="https://www.npmjs.com/package/@magmacomputing/tempo-plugin-celestial"><img src="https://img.shields.io/npm/v/@magmacomputing/tempo-plugin-celestial?style=flat-square" alt="npm version" style="display: inline-block; margin: 0 4px;"></a> <a href="https://www.npmjs.com/package/@magmacomputing/tempo"><img src="https://img.shields.io/npm/dependency-version/@magmacomputing/tempo-plugin-celestial/peer/@magmacomputing/tempo?style=flat-square" alt="npm peer dependency version" style="display: inline-block; margin: 0 4px;"></a> <a href="https://www.npmjs.com/package/@magmacomputing/tempo-plugin-celestial"><img src="https://img.shields.io/npm/l/@magmacomputing/tempo-plugin-celestial?style=flat-square" alt="License" style="display: inline-block; margin: 0 4px;"></a> <a href="https://www.typescriptlang.org/"><img src="https://img.shields.io/badge/TypeScript-Ready-blue?logo=typescript&style=flat-square" alt="TypeScript Ready" style="display: inline-block; margin: 0 4px;"></a>
</p>

A Community plugin for [Tempo](https://github.com/magmacomputing/magma) providing location-aware solar twilight events (`t.term.sun`, `t.term.solar`), real-time lunar cycle phases (`t.term.moon`, `t.term.lunar`), and astronomical tidal mechanics (`t.term.tide`, `t.term.tides`).

---

## Installation

```bash
npm install @magmacomputing/tempo-plugin-celestial
```

---

## Documentation Guide

Explore detailed guides on specific celestial capabilities:

- **[Solar Day Cycles & Ephemeris](./solar.md)**: Twilight bands (`civil`, `nautical`, `astronomical`), atmospheric elevation dip correction, exact apparent solar noon (`solar.noon`), and Local Apparent Solar Time (`solar.solarTime`).
- **[Lunar Ephemeris, Topocentric Ephemeris & Eclipses](./lunar.md)**: 8 synodic lunar phases, illumination ratio, lunar age, hemisphere-aware emojis, topocentric horizon events (`moonrise`/`moonset`), meridian transits (`transit`), real-time sky position (`altitude`/`azimuth`), crescent tilt (`crescentTiltDeg`), orbital distance (`isSupermoon`/`isMicromoon`), and local solar/lunar eclipse detection (`eclipse`/`obscuration`).
- **[Astronomical Tidal Mechanics](./tides.md)**: Syzygy, quadrature, and perigee calculations (`spring`, `neap`, `king` tides), solar-lunar alignment angles, and 745-minute tidal cycles.

---

## Features Overview

- **Solar Day Cycles**: Calculates `daylight`, `night`, `civil-twilight`, `nautical-twilight`, and `astronomical-twilight`.
- **Solar Ephemeris Data**: Returns `sunrise`, `sunset`, `noon`, `solarTime` (Local Apparent Solar Time), total `daylightDurationMs`, and observer `elevation` horizon dip adjustments.
- **Lunar Phase & Topocentric Ephemeris**: Calculates 8 discrete lunar phase states, illumination fraction (0.0–1.0), age in days, hemisphere-aware emojis, local `moonrise` and `moonset` events, meridian transit (`transit`), topocentric position (`altitude`/`azimuth`), bright limb crescent tilt (`crescentTiltDeg`), and orbital distance (`distanceKm`, `angularDiameterArcmin`, `isSupermoon`, `isMicromoon`).
- **Local Eclipse Obscuration**: Detects active solar and lunar eclipses (`'total-solar'`, `'annular-solar'`, `'partial-solar'`, `'total-lunar'`, `'partial-lunar'`, `'penumbral-lunar'`) and computes local disk obscuration fraction (`0.0` to `1.0`).
- **Astronomical Tidal Mechanics**: Provides pure astronomical solar/lunar alignment calculations (`t.term.tide`, `t.term.tides`) for `spring`, `neap`, and `normal` tides, alongside `isKingTide` perigee indicators.

---

## Geographic Coordinates & Null Contract

::: tip Pure Astronomical Calculations
Tidal state resolution and synodic lunar phases rely on deterministic celestial mechanics for reproducible, offset-independent math across all time zones.
:::

::: warning Location-Dependent Null Contract
- **Global Astronomical Properties** (`t.term.moon`, `t.term.lunar.phase`, `t.term.lunar.illumination`, `t.term.tides.isSpringTide`, `t.term.tides.alignmentDeg`) resolve location-independently and are always computed.
- **Geo-Dependent Properties** (`t.term.sun`, `solar.sunrise`, `solar.sunset`, `solar.noon`, `solar.solarTime`, `lunar.moonrise`, `lunar.moonset`, `lunar.transit`, `lunar.altitude`, `lunar.azimuth`, `lunar.crescentTiltDeg`, `lunar.distanceKm`, `lunar.eclipse`, `lunar.obscuration`, `tides.lunarTideMinute`) evaluate to `null` when geographic coordinates (`geo: { lat, lng }`) are omitted.
- **Distinction**: Property access on `t.term` evaluates to `undefined` if `CelestialPlugin` is not loaded, and to `null` if the plugin is active but location coordinates were not supplied. When `debug >= 1` is enabled in `Tempo` configuration, a developer warning is logged when evaluating geo-dependent keys without coordinates.
:::

---

## Quickstart

<PluginRepl plugin="celestial" />

```typescript
import { Tempo } from '@magmacomputing/tempo';
import { CelestialPlugin } from '@magmacomputing/tempo-plugin-celestial';

Tempo.use(CelestialPlugin);

// Provide geographic coordinates (e.g. New York City)
const t = new Tempo('2026-06-21T12:00:00Z', {
  geo: { lat: 40.7128, lng: -74.006 }
});

// --- Solar Day State & Ephemeris ---
console.log(t.term.sun);                 // 'daylight'
console.log(t.term.solar.phase);         // 'Daylight'
console.log(t.term.solar.sunrise);       // Tempo instance for local sunrise
console.log(t.term.solar.noon);          // Tempo instance for local solar noon
console.log(t.term.solar.solarTime);     // Tempo instance for local apparent solar time (AST)

// --- Lunar Phase & Ephemeris ---
console.log(t.term.moon);                // 'waxing-crescent'
console.log(t.term.lunar.phase);         // 'Waxing Crescent'
console.log(t.term.lunar.illumination);  // 0.45
console.log(t.term.lunar.moonrise);      // Tempo instance for local moonrise (or null)

// --- Astronomical Tidal Mechanics ---
console.log(t.term.tide);                // 'spring', 'neap', or 'normal'
console.log(t.term.tides.alignmentDeg);  // Solar-lunar alignment angle (0..360°)
console.log(t.term.tides.isSpringTide);  // true during Syzygy (New or Full Moon)
console.log(t.term.tides.isKingTide);    // true when Spring Tide aligns with Lunar Perigee
```

### Auto-Installation (Side-Effect Import)

```typescript
import { Tempo } from '@magmacomputing/tempo';
import '@magmacomputing/tempo-plugin-celestial/install';

const t = new Tempo('2026-06-21T12:00:00Z', { geo: { lat: 40.7128, lng: -74.006 } });
console.log(t.term.sun);
```

---

## Licensing

This is a **Community** plugin. It is completely free and open-source for personal and commercial use under the MIT license.
