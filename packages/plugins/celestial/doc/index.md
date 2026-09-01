![Tempo Plugin](/plugin-logo.svg)

# @magmacomputing/tempo-plugin-celestial

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
- **Ephemeris Data**: Returns `sunrise`, `sunset`, `solarNoon`, and total `daylightDurationMs` for given latitude and longitude coordinates.
- **Lunar Phase Cycles**: Calculates 8 discrete lunar phase states (`new-moon`, `waxing-crescent`, `first-quarter`, `waxing-gibbous`, `full-moon`, `waning-gibbous`, `third-quarter`, `waning-crescent`), illumination 0.0–1.0 fraction, age in days, and hemisphere-aware emoji indicators.

## Usage

```typescript
import { Tempo } from '@magmacomputing/tempo';
import '@magmacomputing/tempo-plugin-celestial';

const t = new Tempo('2026-06-21T12:00:00Z', { latitude: 40.7128, longitude: -74.006, sphere: 'north' });

// Solar Day State
console.log(t.term.sun); // 'daylight'
console.log(t.term.solar.sunrise); // Tempo instance for local sunrise

// Lunar Phase
console.log(t.term.moon); // 'waxing-crescent'
console.log(t.term.lunar.illumination); // 0.45
```

## Licensing

This is a **Community** plugin. It is completely free and open-source for personal and commercial use. No license token is required.

## License

MIT
