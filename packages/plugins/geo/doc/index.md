![Tempo Plugin](/plugin-logo.svg)

# @magmacomputing/tempo-plugin-geo

<p align="center">
  <a href="https://www.npmjs.com/package/@magmacomputing/tempo-plugin-geo"><img src="https://img.shields.io/npm/v/@magmacomputing/tempo-plugin-geo?style=flat-square" alt="npm version" style="display: inline-block; margin: 0 4px;"></a> <a href="https://www.npmjs.com/package/@magmacomputing/tempo"><img src="https://img.shields.io/npm/dependency-version/@magmacomputing/tempo-plugin-geo/peer/@magmacomputing/tempo?style=flat-square" alt="npm peer dependency version" style="display: inline-block; margin: 0 4px;"></a> <a href="https://www.npmjs.com/package/@magmacomputing/tempo-plugin-geo"><img src="https://img.shields.io/npm/l/@magmacomputing/tempo-plugin-geo?style=flat-square" alt="License" style="display: inline-block; margin: 0 4px;"></a> <a href="https://www.typescriptlang.org/"><img src="https://img.shields.io/badge/TypeScript-Ready-blue?logo=typescript&style=flat-square" alt="TypeScript Ready" style="display: inline-block; margin: 0 4px;"></a>
</p>

A comprehensive Community plugin for the [Tempo](https://github.com/magmacomputing/magma) ecosystem providing universal geolocation lookup, spatial geofencing, Great-Circle navigation, transit velocity and impossible travel anomaly detection, cultural locale synchronization, and natural solar time offset calculations.

By decoupling network-based geolocation lookup and geographic math into a dedicated plugin, `@magmacomputing/tempo` core remains zero-network, lightweight, and purely deterministic.

---

## Installation

```bash
npm install @magmacomputing/tempo-plugin-geo
```

---

## Architecture & Namespacing

Installing `GeoPlugin` mounts an immutable, locked-down **`Tempo.geo`** static namespace onto the `Tempo` class. This avoids root-level namespace pollution while providing a single, cohesive landing pad for all spatial and navigation capabilities.

```typescript
import { Tempo } from '@magmacomputing/tempo';
import { GeoPlugin } from '@magmacomputing/tempo-plugin-geo';

Tempo.use(GeoPlugin);
```

### Auto-Installation (Side-Effect Import)

```typescript
import { Tempo } from '@magmacomputing/tempo';
import '@magmacomputing/tempo-plugin-geo/install';
```

---

## Documentation Guide

Explore detailed guides on specific capabilities:

- **[Transit & Navigation](./transit-and-navigation.md)**: Great-Circle distance, compass bearing, geographic midpoint, transit velocity, and impossible travel anomaly detection.
- **[Spatial Geofencing](./geofencing.md)**: Proximity checking (`isWithin`), rectangular bounding boxes (`inBoundingBox`), and antimeridian crossing resolution.
- **[Cultural Synchronization](./cultural-sync.md)**: Automatic cultural locale inference (`setLocale: true`), territorial language resolution, and internationalization synergy.
- **[Natural Solar Time Offset](./solar-offset.md)**: Longitude delta calculations (`solarOffset`), meridian drift, and circadian rhythm alignment.
- **[Storage & Multi-Tenant Caching](./storage-and-caching.md)**: Ambient coordinate caching, 24h TTL `BoundedCache`, tenant isolation, and server vs. client operational warnings.

---

## Comprehensive `Tempo.geo` API Surface

| Method / Property | Category | Description |
| :--- | :--- | :--- |
| `Tempo.geo.lookup(opts?)` | Lookup | Universal geolocation lookup (browser hardware GPS or server IP lookup) cached for 24h. Supports `{ refresh: true }`. |
| `Tempo.geo.resolve(input, opts?)` | Lookup | Asynchronously resolves coordinates from an instance, configuration, or ambient storage cache. |
| `Tempo.geo.coerce(input)` | Geometry | Pure function normalizing various coordinate formats (`lat/lng`, `latitude/longitude`, tuples, etc.) into a canonical `GeoConfig`. |
| `Tempo.geo.distance(from, to, unit?)` | Navigation | Great-Circle Haversine distance between two coordinates (`'km'`, `'miles'`, or `'m'`). |
| `Tempo.geo.bearing(from, to)` | Navigation | Initial forward compass azimuth bearing (0°..360°) from origin to destination. |
| `Tempo.geo.midpoint(from, to)` | Navigation | Exact geographic midpoint along the Great-Circle path between two coordinates. |
| `Tempo.geo.velocity(from, to, opts?)` | Security / Transit | Speed of travel between two timestamped instances (`'km'`, `'miles'`, or `'m'`; time unit `'hh'`, `'ss'`, `'mi'`). |
| `Tempo.geo.isImpossibleTravel(from, to, opts?)` | Security / Transit | Evaluates whether travel between timestamped instances exceeds physical commercial feasibility (default: > 900 km/h). |
| `Tempo.geo.isWithin(from, to, maxDist, unit?)` | Geofencing | Checks whether two points fall within a maximum radius. |
| `Tempo.geo.inBoundingBox(coords, box)` | Geofencing | Checks whether a coordinate point falls inside a geographic bounding box with antimeridian support. |
| `resolveCulturalLocale(locale?, country?, mode?)` | Cultural Sync | Standalone function resolving synchronized BCP 47 locale from current locale and ISO country code/name. |
| `Tempo.geo.solarOffset(coords, opts?)` | Solar Timing | Computes natural solar time offset (in minutes, seconds, or hours) derived from meridian offset (4 min/deg). |
| `Tempo.geo.setProvider(provider)` | Provider Gateway | Sets custom geolocation/geocoding provider gateway (e.g. OpenStreetMap, Mapbox, internal IP proxy). |
| `Tempo.geo.getProvider()` | Provider Gateway | Retrieves the active custom geolocation provider. |
| `Tempo.geo.reverse(coords, opts?)` | Provider Gateway | Reverse geocodes coordinates to locality/address metadata using the active provider. |
| `Tempo.geo.forward(query, opts?)` | Provider Gateway | Forward geocodes place query string to coordinates using the active provider. |
| `Tempo.geo.stash(coords, ttl?, keyOrOpts?)` | Storage | Stashes coordinates in storage with an optional custom TTL (default: 24h) and multi-tenant partitioning. |
| `Tempo.geo.clear(keyOrOpts?)` | Storage | Purges stashed coordinates from storage. |
| `Tempo.geo.get(keyOrOpts?)` | Storage | Reads stashed coordinates for the specified tenant/IP or ambient default. |
| `Tempo.geo.current` | Storage | **Read-only getter** returning the active global/ambient coordinates snapshot (`getStashedGeo() ?? Tempo.config.geo`). |
| `Tempo.geo.server(opts?)` | Low-Level | Low-level server-side IP geolocation handler. |
| `Tempo.geo.browser(opts?)` | Low-Level | Low-level browser Geolocation API handler. |

---

## Quickstart Examples

<PluginRepl plugin="geo" />

### 1. Fluent OOP with `Tempo.geo`

```typescript
import { Tempo } from '@magmacomputing/tempo';
import { GeoPlugin } from '@magmacomputing/tempo-plugin-geo';

Tempo.use(GeoPlugin);

// Universal Geolocation Lookup (cached for 24h)
const lookup = await Tempo.geo.lookup();
console.log(lookup.lat, lookup.lng, lookup.city);

// Enrich a Tempo instance with physical reality and native cultural locale
const t = new Tempo('2026-06-21T12:00:00Z', {
  geo: { lat: 30.0444, lng: 31.2357, country: 'EG' } // Cairo, Egypt
});
const localTime = await t.geoLocate({ setLocale: 'native' });
console.log(localTime.geo?.latitude, localTime.geo?.longitude);
console.log(localTime.locale); // 'ar-EG'
console.log(localTime.format({ dateStyle: 'full' })); // 'الأحد، ٢١ يونيو ٢٠٢٦' (Arabic Egyptian culture)
```

### 2. Standalone Tree-Shakeable Functions

All core algorithms are exported as tree-shakeable pure functions for minimal bundle footprint:

```typescript
import {
  haversineDistance,
  calculateBearing,
  calculateMidpoint,
  calculateVelocity,
  isImpossibleTravel,
  isWithin,
  inBoundingBox,
  resolveCulturalLocale,
  geoLookup
} from '@magmacomputing/tempo-plugin-geo';

const distance = haversineDistance(
  { lat: 40.7128, lng: -74.006 }, // New York
  { lat: 51.5074, lng: -0.1278 }, // London
  'km'
); // ~5570 km
```

---

## Security & Immutability

In keeping with Tempo's strict immutability principles, the `Tempo.geo` namespace is fully locked down:

- **Deeply Frozen**: The entire `Tempo.geo` namespace and attached utilities are recursively frozen via `deepFreeze`.
- **Tamper-Proof**: Protected against reassignment or monkey-patching. Any attempt to mutate methods (e.g. `Tempo.geo.lookup = ...`) throws a `TypeError` in strict mode.
- **Pure Instance Operations**: Instance methods like `t.geoLocate()` return new, enriched `Tempo` instances, preserving the immutability of the original instance.

---

## Licensing

This is a **Community** plugin. It is completely free and open-source for personal and commercial use under the MIT license.
