![Tempo Plugin](/plugin-logo.svg)

# @magmacomputing/tempo-plugin-spatial

<p align="center">
  <a href="https://www.npmjs.com/package/@magmacomputing/tempo-plugin-spatial"><img src="https://img.shields.io/npm/v/@magmacomputing/tempo-plugin-spatial?style=flat-square" alt="npm version" style="display: inline-block; margin: 0 4px;"></a> <a href="https://www.npmjs.com/package/@magmacomputing/tempo"><img src="https://img.shields.io/npm/dependency-version/@magmacomputing/tempo-plugin-spatial/peer/@magmacomputing/tempo?style=flat-square" alt="npm peer dependency version" style="display: inline-block; margin: 0 4px;"></a> <a href="https://www.npmjs.com/package/@magmacomputing/tempo-plugin-spatial"><img src="https://img.shields.io/npm/l/@magmacomputing/tempo-plugin-spatial?style=flat-square" alt="License" style="display: inline-block; margin: 0 4px;"></a> <a href="https://www.typescriptlang.org/"><img src="https://img.shields.io/badge/TypeScript-Ready-blue?logo=typescript&style=flat-square" alt="TypeScript Ready" style="display: inline-block; margin: 0 4px;"></a>
</p>

A comprehensive Community plugin for the [Tempo](https://github.com/magmacomputing/magma) ecosystem providing GIS spatial geometry, Great-Circle navigation, transit velocity and impossible travel anomaly detection, spatial geofencing, and natural solar time offset calculations.

By decoupling geographic mathematics from network lookup into a dedicated plugin, `@magmacomputing/tempo` core remains zero-network, lightweight, and purely deterministic.

---

## Installation

```bash
npm install @magmacomputing/tempo-plugin-spatial
```

---

## Architecture & Namespacing

Installing `SpatialPlugin` mounts an immutable, locked-down **`Tempo.spatial`** static namespace onto the `Tempo` class and adds fluent instance helpers to `Tempo.prototype`:

```typescript
import { Tempo } from '@magmacomputing/tempo';
import { SpatialPlugin } from '@magmacomputing/tempo-plugin-spatial';

Tempo.use(SpatialPlugin);
```

### Auto-Installation (Side-Effect Import)

```typescript
import { Tempo } from '@magmacomputing/tempo';
import '@magmacomputing/tempo-plugin-spatial/install';
```

---

## Documentation Guide

Explore detailed guides on specific capabilities:

- **[Transit & Navigation](./transit-and-navigation.md)**: Great-Circle distance, compass bearing, geographic midpoint, transit velocity, and impossible travel anomaly detection.
- **[Spatial Geofencing](./geofencing.md)**: Proximity checking (`isWithin`), rectangular bounding boxes (`inBoundingBox`), and antimeridian crossing resolution.
- **[Natural Solar Time Offset](./solar-offset.md)**: Longitude delta calculations (`solarOffset`), meridian drift, and circadian rhythm alignment.

---

## Comprehensive `Tempo.spatial` API Surface

| Method / Property | Category | Description |
| :--- | :--- | :--- |
| `Tempo.spatial.distance(from, to, unit?)` | Navigation | Great-Circle Haversine distance between two coordinates (`'km'`, `'miles'`, or `'m'`). |
| `Tempo.spatial.bearing(from, to, opts?)` | Navigation | Initial forward compass azimuth bearing (0°..360°) from origin to destination. |
| `Tempo.spatial.midpoint(from, to)` | Navigation | Exact geographic midpoint along the Great-Circle path between two coordinates with hemisphere inference. |
| `Tempo.spatial.velocity(from, to, opts?)` | Security / Transit | Speed of travel between two timestamped instances (`'km'`, `'miles'`, or `'m'`; time unit `'hh'`, `'ss'`, `'mi'`). |
| `Tempo.spatial.isImpossibleTravel(from, to, opts?)` | Security / Transit | Evaluates whether travel between timestamped instances exceeds physical commercial aviation feasibility (default: > 900 km/h). |
| `Tempo.spatial.isWithin(from, to, maxDist, unit?)` | Geofencing | Checks whether two points fall within a maximum radial distance threshold. |
| `Tempo.spatial.inBoundingBox(coords, bbox)` | Geofencing | Checks whether a coordinate point falls inside a geographic bounding box with antimeridian crossing support. |
| `Tempo.spatial.solarOffset(coords, opts?)` | Solar Timing | Computes natural solar time offset (in minutes, seconds, or hours) derived from meridian offset (4 min/deg). |

### Fluent Instance Methods

| Instance Method | Description |
| :--- | :--- |
| `t.spatialDistance(to, unit?)` | Calculates Great-Circle distance from this instance's coordinates to target coordinates. |
| `t.spatialBearing(to, opts?)` | Computes initial forward compass bearing from this instance to target coordinates. |
| `t.spatialVelocity(to, opts?)` | Calculates travel velocity between this instance and target timestamped instance. |
| `t.spatialSolarOffset(opts?)` | Computes natural solar time offset for this instance's coordinates. |
| `t.isWithin(to, maxDist, unit?)` | Checks if this instance is within a specified proximity radius of target coordinates. |
| `t.inBoundingBox(bbox)` | Checks if this instance falls inside a rectangular bounding box. |

---

## Quickstart Examples

<PluginRepl plugin="spatial" />

### 1. Great-Circle Distance & Bearing

```typescript
import { Tempo } from '@magmacomputing/tempo';
import { SpatialPlugin } from '@magmacomputing/tempo-plugin-spatial';

Tempo.use(SpatialPlugin);

const sydney = { lat: -33.8688, lng: 151.2093 };
const london = { lat: 51.5074, lng: -0.1278 };

const distKm = Tempo.spatial.distance(sydney, london, 'km');
console.log('Distance:', distKm.toFixed(1), 'km'); // ~16988.0 km

const heading = Tempo.spatial.bearing(sydney, london);
console.log('Compass Bearing:', heading.toFixed(1) + '°'); // ~302.2° (WNW)

const mid = Tempo.spatial.midpoint(sydney, london);
console.log('Midpoint:', mid.latitude, mid.longitude);
```

### 2. Impossible Travel Anomaly Detection

```typescript
const login1 = new Tempo('2026-06-21T10:00:00Z', {
  geo: { lat: 51.5074, lng: -0.1278 }, // London
});

const login2 = new Tempo('2026-06-21T11:00:00Z', {
  geo: { lat: 40.7128, lng: -74.0060 }, // New York (1 hour later)
});

const speed = Tempo.spatial.velocity(login1, login2);
console.log('Velocity:', speed.toFixed(1), 'km/h'); // ~5570.2 km/h

const alert = Tempo.spatial.isImpossibleTravel(login1, login2);
console.log('Impossible Travel Alert?', alert); // true
```

---

## License

This is a **Community** plugin. It is completely free and open-source for personal and commercial use under the MIT license. No license token is required.
