![Tempo Plugin](https://raw.githubusercontent.com/magmacomputing/magma/main/packages/tempo/public/plugin-logo.svg)

# @magmacomputing/tempo-plugin-geo

<p align="center">
  <a href="https://www.npmjs.com/package/@magmacomputing/tempo-plugin-geo"><img src="https://img.shields.io/npm/v/@magmacomputing/tempo-plugin-geo?style=flat-square" alt="npm version" style="display: inline-block; margin: 0 4px;"></a> <a href="https://www.npmjs.com/package/@magmacomputing/tempo"><img src="https://img.shields.io/npm/dependency-version/@magmacomputing/tempo-plugin-geo/peer/@magmacomputing/tempo?style=flat-square" alt="npm peer dependency version" style="display: inline-block; margin: 0 4px;"></a> <a href="https://www.npmjs.com/package/@magmacomputing/tempo-plugin-geo"><img src="https://img.shields.io/npm/l/@magmacomputing/tempo-plugin-geo?style=flat-square" alt="License" style="display: inline-block; margin: 0 4px;"></a> <a href="https://www.typescriptlang.org/"><img src="https://img.shields.io/badge/TypeScript-Ready-blue?logo=typescript&style=flat-square" alt="TypeScript Ready" style="display: inline-block; margin: 0 4px;"></a> <a href="https://magmacomputing.github.io/magma/doc/9-plugins/geo.index.html"><img src="https://img.shields.io/badge/Docs-VitePress-brightgreen?logo=vitepress&style=flat-square" alt="Documentation" style="display: inline-block; margin: 0 4px;"></a>
</p>

A Community plugin for the [Tempo](https://github.com/magmacomputing/magma) ecosystem that provides IP geolocation lookup, browser hardware location services, forward & reverse geocoding gateway with pluggable providers, cultural locale synchronization, and 24-hour multi-tenant coordinate caching.

For geometric GIS math, Great-Circle navigation, and impossible travel anomaly detection, see [`@magmacomputing/tempo-plugin-spatial`](https://www.npmjs.com/package/@magmacomputing/tempo-plugin-spatial).

👉 **[View the full documentation on our GitHub Pages](https://magmacomputing.github.io/magma/doc/9-plugins/geo.index.html)**

---

## Installation

```bash
npm install @magmacomputing/tempo-plugin-geo
```

---

## Usage

### 1. Fluent OOP with Namespaced `Tempo.geo`

Installing `GeoPlugin` mounts an immutable, locked-down **`Tempo.geo`** namespace onto the `Tempo` class:

```typescript
import { Tempo } from '@magmacomputing/tempo';
import { GeoPlugin, OpenStreetMapProvider } from '@magmacomputing/tempo-plugin-geo';

Tempo.use(GeoPlugin);

// 1. Universal Geolocation Lookup (cached for 24h)
const lookupResult = await Tempo.geo.lookup();
console.log(lookupResult.lat, lookupResult.lng, lookupResult.city);

// 2. Reverse Geocoding with Provider Gateway
Tempo.geo.setProvider(new OpenStreetMapProvider());
const address = await Tempo.geo.reverse({ lat: -33.8688, lng: 151.2093 });
console.log(address.city, address.country);

// 3. Inspect Current Ambient / Global Coordinates
console.log(Tempo.geo.current); // { latitude: ..., longitude: ..., city: ... }

// 4. Force Fresh Network Lookup (bypassing 24h cache)
const fresh = await Tempo.geo.lookup({ refresh: true });

// 5. Enrich a Tempo Instance Asynchronously with Cultural Sync
const t = new Tempo('2026-06-21T12:00:00Z', {
  geo: { lat: 30.0444, lng: 31.2357, country: 'EG' } // Cairo
});
const localTime = await t.geoLocate({ setLocale: 'native' });
console.log(localTime.locale); // 'ar-EG'
```

> ⚡ **[Try this live in the interactive Tempo Sandbox ↗](https://magmacomputing.github.io/magma/repl/index.html?plugin=geo)**

### 2. Functional Tree-Shakeable APIs

All underlying utilities can be imported as standalone tree-shakeable functions without augmenting `Tempo`:

```typescript
import { Tempo } from '@magmacomputing/tempo';
import {
  geoLookup,
  geoReverse,
  geoForward,
  resolveCulturalLocale,
  resolveGeoCoordinates,
  stashGeo,
  clearStashedGeo,
  getStashedGeo,
} from '@magmacomputing/tempo-plugin-geo';

// Standalone lookup & instance creation
const coords = await geoLookup();
const t = new Tempo('2026-06-21', { geo: coords });
```

---

## The `Tempo.geo` API Surface

| Method / Property | Description |
| :--- | :--- |
| `Tempo.geo.lookup(opts?)` | Universal geolocation lookup (browser hardware GPS or server IP lookup) cached for 24h. Supports `{ refresh: true }`. |
| `Tempo.geo.reverse(coords, opts?)` | Reverse geocodes coordinates to place/locality metadata using the active provider. |
| `Tempo.geo.forward(query, opts?)` | Forward geocodes query string to coordinates using the active provider. |
| `Tempo.geo.setProvider(provider)` | Sets the active custom geocoding provider (e.g. OpenStreetMap, Mapbox, internal IP proxy). |
| `Tempo.geo.getProvider()` | Retrieves the active custom geocoding provider. |
| `Tempo.geo.resolve(input, opts?)` | Asynchronously resolves coordinates from an instance, configuration, or ambient storage cache. |
| `Tempo.geo.coerce(input)` | Pure function normalizing various coordinate formats (`lat/lng`, `latitude/longitude`, etc.) into a canonical `GeoConfig`. |
| `Tempo.geo.stash(coords, ttl?, keyOrOpts?)` | Stashes coordinates in storage with an optional custom TTL (default: 24h) and multi-tenant partitioning. |
| `Tempo.geo.clear(keyOrOpts?)` | Purges stashed coordinates from storage. |
| `Tempo.geo.get(keyOrOpts?)` | Reads stashed coordinates for the specified tenant/IP or ambient default. |
| `Tempo.geo.current` | **Read-only getter** returning the active global/ambient coordinates snapshot (`getStashedGeo() ?? Tempo.config.geo`). |
| `Tempo.geo.server(opts?)` | Low-level server-side IP geolocation handler. |
| `Tempo.geo.browser(opts?)` | Low-level browser Geolocation API handler. |

---

## ⚠️ Critical Operational Warnings

> [!CAUTION]
> **Server Environments (Node.js, Deno, Bun, Workers)**:
> In server environments without hardware GPS, calling `Tempo.geo.lookup()` falls back to server outbound public IP geolocation. When executing in multi-user request pipelines, do **not** use the default singleton ambient cache if requests come from multiple distinct users. Instead, pass explicit coordinate payloads (`new Tempo({ geo: userGeo })`) or use tenant keys with `stashGeo(coords, ttl, tenantKey)`.

---

## License

This is a **Community** plugin. It is completely free and open-source for personal and commercial use under the MIT license.
