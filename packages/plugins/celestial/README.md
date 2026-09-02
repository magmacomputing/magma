![Tempo Plugin](https://raw.githubusercontent.com/magmacomputing/magma/main/packages/tempo/public/plugin-logo.svg)

# @magmacomputing/tempo-plugin-celestial

<p align="center">
  <a href="https://www.npmjs.com/package/@magmacomputing/tempo-plugin-celestial"><img src="https://img.shields.io/npm/v/@magmacomputing/tempo-plugin-celestial?style=flat-square" alt="npm version" style="display: inline-block; margin: 0 4px;"></a> <a href="https://www.npmjs.com/package/@magmacomputing/tempo"><img src="https://img.shields.io/npm/dependency-version/@magmacomputing/tempo-plugin-celestial/peer/@magmacomputing/tempo?style=flat-square" alt="npm peer dependency version" style="display: inline-block; margin: 0 4px;"></a> <a href="https://www.npmjs.com/package/@magmacomputing/tempo-plugin-celestial"><img src="https://img.shields.io/npm/l/@magmacomputing/tempo-plugin-celestial?style=flat-square" alt="License" style="display: inline-block; margin: 0 4px;"></a> <a href="https://www.typescriptlang.org/"><img src="https://img.shields.io/badge/TypeScript-Ready-blue?logo=typescript&style=flat-square" alt="TypeScript Ready" style="display: inline-block; margin: 0 4px;"></a>
</p>

Tempo plugin for location-aware solar twilight events (`sun`/`solar`) and lunar phase tracking (`moon`/`lunar`).

## Installation

```bash
npm install @magmacomputing/tempo-plugin-celestial
```

## Features

- **Solar Day Cycles**: Calculates `daylight`, `night`, `civil-twilight`, `nautical-twilight`, and `astronomical-twilight`.
- **Ephemeris Data**: Returns `sunrise`, `sunset`, `solarNoon`, total `daylightDurationMs`, and explicit `latitude`/`longitude` for given coordinates.
- **Lunar Phase & Ephemeris**: Calculates 8 discrete lunar phase states (`new-moon`, `waxing-crescent`, etc.), illumination 0.0–1.0 fraction, age in days, hemisphere-aware emoji indicators, and location-aware `moonrise` and `moonset` events.

## Geographic Coordinates & Defaults

> [!NOTE]
> If `latitude` and `longitude` are omitted, location-aware calculations (`SolarTerm` sunrise/sunset and `LunarTerm` moonrise/moonset) default coordinates to `(0, 0)` (Equator / Prime Meridian). Check `t.term.solar.latitude` and `t.term.solar.longitude` to inspect active coordinates.

### Obtaining Coordinates

Use `geoLookup()` from `@magmacomputing/library` to automatically resolve location coordinates across both browser and server environments:

```typescript
import { geoLookup } from '@magmacomputing/library';
import { Tempo } from '@magmacomputing/tempo';
import '@magmacomputing/tempo-plugin-celestial';

// Automatically resolves coordinates via browser hardware or server IP
const coords = await geoLookup();
const t = new Tempo({ latitude: coords.lat, longitude: coords.lng });

console.log(t.term.sun);             // 'daylight' or 'night'
console.log(t.term.lunar.moonrise); // Tempo instance for local moonrise
```

## Usage

```typescript
import { Tempo } from '@magmacomputing/tempo';
import '@magmacomputing/tempo-plugin-celestial';

const t = new Tempo('2026-06-21T12:00:00Z', { latitude: 40.7128, longitude: -74.006 });

// Solar Day State
console.log(t.term.sun); // 'daylight'
console.log(t.term.solar.sunrise); // Tempo instance for local sunrise
console.log(t.term.solar.latitude); // 40.7128

// Lunar Phase & Ephemeris
console.log(t.term.moon); // 'waxing-crescent'
console.log(t.term.lunar.illumination); // 0.45
console.log(t.term.lunar.moonrise); // Tempo instance for local moonrise (or undefined)
```

## Documentation

For full documentation and live examples, visit the [Celestial Plugin Documentation](https://magmacomputing.github.io/magma/doc/9-plugins/celestial.index.html).

## Licensing

This is a **Community** plugin. It is completely free and open-source for personal and commercial use. No license token is required.

## License

MIT
