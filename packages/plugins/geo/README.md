![Tempo Plugin](https://raw.githubusercontent.com/magmacomputing/magma/main/packages/tempo/public/plugin-logo.svg)

# @magmacomputing/tempo-plugin-geo

<p align="center">
  <a href="https://www.npmjs.com/package/@magmacomputing/tempo-plugin-geo"><img src="https://img.shields.io/npm/v/@magmacomputing/tempo-plugin-geo?style=flat-square" alt="npm version" style="display: inline-block; margin: 0 4px;"></a> <a href="https://www.npmjs.com/package/@magmacomputing/tempo"><img src="https://img.shields.io/npm/dependency-version/@magmacomputing/tempo-plugin-geo/peer/@magmacomputing/tempo?style=flat-square" alt="npm peer dependency version" style="display: inline-block; margin: 0 4px;"></a> <a href="https://www.npmjs.com/package/@magmacomputing/tempo-plugin-geo"><img src="https://img.shields.io/npm/l/@magmacomputing/tempo-plugin-geo?style=flat-square" alt="License" style="display: inline-block; margin: 0 4px;"></a> <a href="https://www.typescriptlang.org/"><img src="https://img.shields.io/badge/TypeScript-Ready-blue?logo=typescript&style=flat-square" alt="TypeScript Ready" style="display: inline-block; margin: 0 4px;"></a> <a href="https://magmacomputing.github.io/magma/doc/9-plugins/geo.index.html"><img src="https://img.shields.io/badge/Docs-VitePress-brightgreen?logo=vitepress&style=flat-square" alt="Documentation" style="display: inline-block; margin: 0 4px;"></a>
</p>

A Community plugin for the [Tempo](https://github.com/magmacomputing/magma) library that provides IP geolocation lookup, browser hardware location services, and coordinate resolution.

👉 **[View the full documentation on our GitHub Pages](https://magmacomputing.github.io/magma/doc/9-plugins/geo.index.html)**

## Installation

```bash
npm install @magmacomputing/tempo-plugin-geo
```

## Usage

### Functional Paradigm (Tree-Shakeable)

```typescript
import { Tempo } from '@magmacomputing/tempo';
import { geoLookup, resolveGeoCoordinates } from '@magmacomputing/tempo-plugin-geo';

// Automatically resolves coordinates via browser hardware GPS or server IP lookup
const geo = await geoLookup();
const t = new Tempo({ geo });

console.log(t.geo?.latitude, t.geo?.longitude);
```

### Fluent OOP Paradigm

```typescript
import { Tempo } from '@magmacomputing/tempo';
import { GeoPlugin } from '@magmacomputing/tempo-plugin-geo';

Tempo.use(GeoPlugin);

const t = new Tempo();

// Resolve coordinates asynchronously and return a new enriched Tempo instance
const localTime = await t.withGeo();
console.log(localTime.geo?.latitude, localTime.geo?.longitude);
```

## Documentation

For full API reference and configuration options, please visit the official **[Geo Plugin Documentation ↗](https://magmacomputing.github.io/magma/doc/9-plugins/geo.index.html)**.

## Licensing

This is a **Community** plugin. It is completely free and open-source for personal and commercial use under the MIT license.
