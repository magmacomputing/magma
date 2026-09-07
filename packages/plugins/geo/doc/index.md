![Tempo Plugin](/plugin-logo.svg)

# @magmacomputing/tempo-plugin-geo

<p align="center">
  <a href="https://www.npmjs.com/package/@magmacomputing/tempo-plugin-geo"><img src="https://img.shields.io/npm/v/@magmacomputing/tempo-plugin-geo?style=flat-square" alt="npm version" style="display: inline-block; margin: 0 4px;"></a> <a href="https://www.npmjs.com/package/@magmacomputing/tempo"><img src="https://img.shields.io/npm/dependency-version/@magmacomputing/tempo-plugin-geo/peer/@magmacomputing/tempo?style=flat-square" alt="npm peer dependency version" style="display: inline-block; margin: 0 4px;"></a> <a href="https://www.npmjs.com/package/@magmacomputing/tempo-plugin-geo"><img src="https://img.shields.io/npm/l/@magmacomputing/tempo-plugin-geo?style=flat-square" alt="License" style="display: inline-block; margin: 0 4px;"></a> <a href="https://www.typescriptlang.org/"><img src="https://img.shields.io/badge/TypeScript-Ready-blue?logo=typescript&style=flat-square" alt="TypeScript Ready" style="display: inline-block; margin: 0 4px;"></a>
</p>

A Community plugin for the [Tempo](https://github.com/magmacomputing/magma) library that provides IP geolocation lookup, browser hardware location services, and coordinate resolution.

By decoupling network-based geolocation lookup into a dedicated plugin, `@magmacomputing/tempo` remains zero-network and pure, while applications that need automatic location detection can easily install this plugin.

## Installation

```bash
npm install @magmacomputing/tempo-plugin-geo
```

## Features

- **Cross-Environment Geolocation**:
  - **Browser**: Uses hardware Geolocation API (`navigator.geolocation`) with local storage stashing.
  - **Server (Node.js/Deno)**: Queries bounded IP geolocation lookup via secure HTTPS endpoints with automatic timeout and size limits.
- **Universal Coordinate Resolution**:
  - Extracts coordinates from existing objects or instances, falling back to lookup only when needed.
- **Tree-Shakeable Functional APIs**:
  - `geoLookup()`, `resolveGeoCoordinates()`, `serverGeoLocation()`, `geoLocation()`, `coerceGeo()`.
- **Fluent OOP Integration**:
  - `t.withGeo()`, `t.lookupGeo()`, `Tempo.geoLookup()`.

## Usage

```typescript
import { Tempo } from '@magmacomputing/tempo';
import { geoLookup, GeoPlugin } from '@magmacomputing/tempo-plugin-geo';

// Functional:
const geo = await geoLookup();
const t1 = new Tempo({ geo });
console.log(t1.geo);

// Fluent OOP:
Tempo.use(GeoPlugin);
const t2 = new Tempo();
const localTime = await t2.withGeo();
console.log(localTime.geo);
```

## Licensing

This is a **Community** plugin. It is completely free and open-source for personal and commercial use under the MIT license.
