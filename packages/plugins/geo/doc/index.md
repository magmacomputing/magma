![Tempo Plugin](/plugin-logo.svg)

# @magmacomputing/tempo-plugin-geo

<p align="center">
  <a href="https://www.npmjs.com/package/@magmacomputing/tempo-plugin-geo"><img src="https://img.shields.io/npm/v/@magmacomputing/tempo-plugin-geo?style=flat-square" alt="npm version" style="display: inline-block; margin: 0 4px;"></a> <a href="https://www.npmjs.com/package/@magmacomputing/tempo"><img src="https://img.shields.io/npm/dependency-version/@magmacomputing/tempo-plugin-geo/peer/@magmacomputing/tempo?style=flat-square" alt="npm peer dependency version" style="display: inline-block; margin: 0 4px;"></a> <a href="https://www.npmjs.com/package/@magmacomputing/tempo-plugin-geo"><img src="https://img.shields.io/npm/l/@magmacomputing/tempo-plugin-geo?style=flat-square" alt="License" style="display: inline-block; margin: 0 4px;"></a> <a href="https://www.typescriptlang.org/"><img src="https://img.shields.io/badge/TypeScript-Ready-blue?logo=typescript&style=flat-square" alt="TypeScript Ready" style="display: inline-block; margin: 0 4px;"></a>
</p>

A dedicated Community plugin for the [Tempo](https://github.com/magmacomputing/magma) ecosystem providing universal geolocation lookup, forward and reverse geocoding gateway, pluggable provider architecture, cultural locale synchronization, and multi-tenant bounded coordinate caching.

For geometric GIS math, Great-Circle navigation, and impossible travel anomaly detection, see [`@magmacomputing/tempo-plugin-spatial`](../../spatial/doc/index.md).

---

## Installation

```bash
npm install @magmacomputing/tempo-plugin-geo
```

---

## Architecture & Namespacing

Installing `GeoPlugin` mounts an immutable, locked-down **`Tempo.geo`** static namespace onto the `Tempo` class.

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

- **[Provider Gateway & Geocoding](./provider-gateway.md)**: Forward geocoding, reverse geocoding, custom geocoding providers (`OpenStreetMapProvider`, `IpApiProvider`, `MockGeoProvider`), and call-site overrides.
- **[Cultural Synchronization](./cultural-sync.md)**: Automatic cultural locale inference (`setLocale: true` / `'native'`), territorial language resolution, and internationalization synergy.
- **[Storage & Multi-Tenant Caching](./storage-and-caching.md)**: Ambient coordinate caching, 24h TTL `BoundedCache`, tenant isolation, and server vs. client operational warnings.

---

## Which Method Should I Choose?

| Goal | Method to Use | Input | Output |
| :--- | :--- | :--- | :--- |
| **"Where is this machine / user right now?"** | `Tempo.geo.lookup()` | None / ambient options | `{ latitude, longitude, city, ... }` |
| **"Convert place name / address to coordinates"** | `Tempo.geo.forward("Paris")` | Address query string | `{ latitude, longitude, ... }` |
| **"Convert GPS coordinates to street / city / country"** | `Tempo.geo.reverse({ lat, lng })` | Coordinate object | `{ city, country, ... }` |
| **"Extract or safely normalize coordinates from any input"** | `Tempo.geo.resolve(input)` | Instance, config, or object | Canonical `{ latitude, longitude, ... }` |
| **"Localize a Tempo instance with timezone & cultural calendar"** | `await t.geoLocate()` | Existing `Tempo` instance | New enriched `Tempo` instance |

---

## Comprehensive `Tempo.geo` API Surface

| Method / Property | Category | Description |
| :--- | :--- | :--- |
| `Tempo.geo.lookup(opts?)` | Lookup | Universal geolocation lookup (browser hardware GPS or server IP lookup) cached for 24h. Supports `{ refresh: true }`. |
| `Tempo.geo.reverse(coords, opts?)` | Geocoding | Reverse geocodes coordinates to locality/address metadata (`city`, `country`, `displayName`, etc.) using active provider. |
| `Tempo.geo.forward(query, opts?)` | Geocoding | Forward geocodes place query string to coordinates using active provider. |
| `Tempo.geo.setProvider(provider)` | Provider Gateway | Sets custom geolocation/geocoding provider gateway (e.g. OpenStreetMap, Mapbox, internal IP proxy). |
| `Tempo.geo.getProvider()` | Provider Gateway | Retrieves the active custom geolocation provider. |
| `Tempo.geo.resolve(input, opts?)` | Utility | Asynchronously resolves coordinates from an instance, configuration, or ambient storage cache. |
| `Tempo.geo.coerce(input)` | Geometry | Pure function normalizing various coordinate formats (`lat/lng`, `latitude/longitude`, tuples, etc.) into a canonical `GeoConfig`. |
| `resolveCulturalLocale(locale?, country?, mode?)` | Cultural Sync | Standalone function resolving synchronized BCP 47 locale from current locale and ISO country code/name. |
| `Tempo.geo.stash(coords, ttl?, keyOrOpts?)` | Storage | Stashes coordinates in storage with an optional custom TTL (default: 24h) and multi-tenant partitioning. |
| `Tempo.geo.clear(keyOrOpts?)` | Storage | Purges stashed coordinates from storage. |
| `Tempo.geo.get(keyOrOpts?)` | Storage | Reads stashed coordinates for the specified tenant/IP or ambient default. |
| `Tempo.geo.current` | Storage | **Read-only getter** returning the active global/ambient coordinates snapshot (`getStashedGeo() ?? Tempo.config.geo`). |
| `Tempo.geo.server(opts?)` | Low-Level | Low-level server-side IP geolocation handler. |
| `Tempo.geo.browser(opts?)` | Low-Level | Low-level browser Geolocation API handler. |

### Fluent Instance Methods

| Instance Method | Description |
| :--- | :--- |
| `t.geoLocate(opts?)` | Asynchronously resolves physical location (with optional reverse geocoding `{ reverse: true }` and cultural locale synchronization `{ setLocale: true }`) and returns a new enriched `Tempo` instance. |
| `t.geoLookup(opts?)` | Resolves coordinates for this instance via explicit coordinates or automatic IP/hardware lookup. |

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

### 2. Reverse Geocoding and Instance Enrichment

```typescript
import { Tempo } from '@magmacomputing/tempo';
import { GeoPlugin } from '@magmacomputing/tempo-plugin-geo';

Tempo.use(GeoPlugin);

// Reverse geocode coordinates to place details (using built-in lookup or custom GeoProvider)
const place = await Tempo.geo.reverse({ lat: -33.8688, lng: 151.2093 });
console.log(place?.city, place?.country); // Sydney, AU

// Or enrich an existing instance via t.geoLocate({ reverse: true })
const t = new Tempo({ geo: { lat: -33.8688, lng: 151.2093 } });
const enriched = await t.geoLocate({ reverse: true });
console.log(enriched.geo?.city, enriched.geo?.country); // Sydney, AU
```

---

## Security & Immutability

In keeping with Tempo's strict immutability principles, the `Tempo.geo` namespace is fully locked down:

- **Deeply Frozen**: The entire `Tempo.geo` namespace and attached utilities are recursively frozen via `deepFreeze`.
- **Tamper-Proof**: Protected against reassignment or monkey-patching.
- **Pure Instance Operations**: Instance methods like `t.geoLocate()` return new, enriched `Tempo` instances, preserving the immutability of the original instance.

---

## Licensing

This is a **Community** plugin. It is completely free and open-source for personal and commercial use under the MIT license.
