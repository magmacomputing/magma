![Tempo Plugin](/plugin-logo.svg)

# @magmacomputing/tempo-plugin-celestial

> [!WARNING]
> **Experimental Plugin**: `@magmacomputing/tempo-plugin-celestial` is currently in active development (`v0.1.0`). Ephemeris calculation algorithms and API properties are subject to refinement prior to a stable `1.0.0` release.

<p align="center">
  <a href="https://www.npmjs.com/package/@magmacomputing/tempo-plugin-celestial"><img src="https://img.shields.io/npm/v/@magmacomputing/tempo-plugin-celestial?style=flat-square" alt="npm version" style="display: inline-block; margin: 0 4px;"></a> <a href="https://www.npmjs.com/package/@magmacomputing/tempo"><img src="https://img.shields.io/npm/dependency-version/@magmacomputing/tempo-plugin-celestial/peer/@magmacomputing/tempo?style=flat-square" alt="npm peer dependency version" style="display: inline-block; margin: 0 4px;"></a> <a href="https://www.npmjs.com/package/@magmacomputing/tempo-plugin-celestial"><img src="https://img.shields.io/npm/l/@magmacomputing/tempo-plugin-celestial?style=flat-square" alt="License" style="display: inline-block; margin: 0 4px;"></a> <a href="https://www.typescriptlang.org/"><img src="https://img.shields.io/badge/TypeScript-Ready-blue?logo=typescript&style=flat-square" alt="TypeScript Ready" style="display: inline-block; margin: 0 4px;"></a>
</p>

This is a Community plugin for [Tempo](https://github.com/magmacomputing/magma) providing location-aware solar twilight events (`t.term.sun`, `t.term.solar`) and real-time lunar cycle phases (`t.term.moon`, `t.term.lunar`).

## Installation

```bash
npm install @magmacomputing/tempo-plugin-celestial
```

## Features

- **Solar Day Cycles**: Calculates `daylight`, `night`, `civil-twilight`, `nautical-twilight`, and `astronomical-twilight`.
- **Ephemeris Data**: Returns `sunrise`, `sunset`, `noon`, total `daylightDurationMs`, and explicit `latitude`/`longitude` for given coordinates.
- **Lunar Phase & Ephemeris**: Calculates 8 discrete lunar phase states (`new-moon`, `waxing-crescent`, etc.), illumination 0.0–1.0 fraction, age in days, hemisphere-aware emoji indicators, and location-aware `moonrise` and `moonset` events.

## Geographic Coordinates & Defaults

> [!NOTE]
> If `latitude` and `longitude` are omitted, location-aware calculations (`SolarTerm` sunrise/sunset and `LunarTerm` moonrise/moonset) default coordinates to `(0, 0)` (Equator / Prime Meridian). Check `t.term.solar.latitude` and `t.term.solar.longitude` to inspect active coordinates.

### Obtaining Coordinates

Use `geoLookup()` from `@magmacomputing/tempo/library` to automatically resolve location coordinates across both browser and server environments:

> [!WARNING]
> **Geolocation Behavior**:
> - **Browser**: On first invocation, `geoLookup()` will prompt the user for permission to access hardware location services.
> - **Server**: In Node.js or server environments without GPS hardware, coordinates are resolved via IP geolocation representing the physical server/datacenter network location.

```typescript
import { Tempo } from '@magmacomputing/tempo';
import { geoLookup } from '@magmacomputing/tempo/library';
import '@magmacomputing/tempo-plugin-celestial';

// Automatically resolves location coordinates via browser hardware or server IP
const coords = await geoLookup();
const t = new Tempo({ latitude: coords.lat, longitude: coords.lng });

console.log(t.term.sun);             // 'daylight' or 'night'
console.log(t.term.lunar.moonrise); // Tempo instance or undefined when no rise occurs on the local date
```

## Usage

```typescript
import { Tempo } from '@magmacomputing/tempo';
import { LunarTerm, SolarTerm } from '@magmacomputing/tempo-plugin-celestial';

const t = new Tempo('2026-06-21T12:00:00Z', { latitude: 40.7128, longitude: -74.006 });

// --- Solar Day State & Phase Querying ---
console.log(t.term.sun);                 // 'daylight'
console.log(t.term.solar.key);           // 'daylight'
console.log(t.term.solar.phase);         // 'Daylight'
console.log(t.term.solar.phases);        // ['night', 'astronomical-twilight', 'nautical-twilight', 'civil-twilight', 'daylight']
console.log(t.term.solar.sunrise);       // Tempo instance for local sunrise
console.log(t.term.solar.latitude);      // 40.7128

// --- Lunar Phase & Ephemeris ---
console.log(t.term.moon);                // 'waxing-crescent'
console.log(t.term.lunar.phase);         // 'Waxing Crescent'
console.log(t.term.lunar.phases);        // ['new-moon', 'waxing-crescent', 'first-quarter', 'waxing-gibbous', 'full-moon', 'waning-gibbous', 'third-quarter', 'waning-crescent']
console.log(t.term.lunar.illumination);  // 0.45
console.log(t.term.lunar.moonrise);      // Tempo instance for local moonrise (or undefined)

// --- Programmatic Navigation ---
// Use .phases to dynamically navigate to the next lunar phase
const nextPhaseKey = t.term.lunar.phases[t.term.lunar.index % 8];
const nextMoonTempo = t.set(`#lunar.${nextPhaseKey}`);
```

## Phase Discovery & Scope Metadata

Both `LunarTerm` and `SolarTerm` expose immutable, frozen array references (`Object.freeze`) containing all valid identifiers for terms resolution:

- **Static Term References**: `LunarTerm.phases` and `SolarTerm.phases` are available on the plugin definitions without instantiating a `Tempo` object.
- **Instance Scope References**: `t.term.lunar.phases` and `t.term.solar.phases` share the exact same frozen array reference (`t.term.lunar.phases === LunarTerm.phases`), adding zero memory or GC overhead.

> [!TIP]
> **Indexing Tip**: Like all Tempo terms (`.month.index`, `.quarter.index`), `.index` is 1-based (`1..8`), while `.phases` is a standard 0-indexed JavaScript array (`0..7`).
> - **Current Phase**: Use `lunar.key` or `lunar.phases[lunar.index - 1]`.
> - **Next Phase**: Use `lunar.phases[lunar.index % 8]` (1-based index modulo 8 seamlessly targets the next phase index with automatic wrap-around).

## Licensing

This is a **Community** plugin. It is completely free and open-source for personal and commercial use. No license token is required.

## License

MIT
