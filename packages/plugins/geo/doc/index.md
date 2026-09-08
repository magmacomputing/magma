![Tempo Plugin](/plugin-logo.svg)

# @magmacomputing/tempo-plugin-geo

<p align="center">
  <a href="https://www.npmjs.com/package/@magmacomputing/tempo-plugin-geo"><img src="https://img.shields.io/npm/v/@magmacomputing/tempo-plugin-geo?style=flat-square" alt="npm version" style="display: inline-block; margin: 0 4px;"></a> <a href="https://www.npmjs.com/package/@magmacomputing/tempo"><img src="https://img.shields.io/npm/dependency-version/@magmacomputing/tempo-plugin-geo/peer/@magmacomputing/tempo?style=flat-square" alt="npm peer dependency version" style="display: inline-block; margin: 0 4px;"></a> <a href="https://www.npmjs.com/package/@magmacomputing/tempo-plugin-geo"><img src="https://img.shields.io/npm/l/@magmacomputing/tempo-plugin-geo?style=flat-square" alt="License" style="display: inline-block; margin: 0 4px;"></a> <a href="https://www.typescriptlang.org/"><img src="https://img.shields.io/badge/TypeScript-Ready-blue?logo=typescript&style=flat-square" alt="TypeScript Ready" style="display: inline-block; margin: 0 4px;"></a>
</p>

A Community plugin for the [Tempo](https://github.com/magmacomputing/magma) ecosystem providing IP geolocation lookup, browser hardware location services, coordinate normalization, and 24-hour cached coordinate stashing.

By decoupling network-based geolocation lookup into a dedicated plugin, `@magmacomputing/tempo` remains zero-network and purely deterministic.

---

## Installation

```bash
npm install @magmacomputing/tempo-plugin-geo
```

---

## Architecture & Namespacing

Installing `GeoPlugin` mounts an immutable, locked-down **`Tempo.geo`** namespace onto the `Tempo` class. This avoids polluting the root class while providing a single landing pad for all coordinate and lookup operations.

```typescript
import { Tempo } from '@magmacomputing/tempo';
import { GeoPlugin } from '@magmacomputing/tempo-plugin-geo';

Tempo.use(GeoPlugin);
```

### The `Tempo.geo` API Surface

| Method / Property | Description |
| :--- | :--- |
| `Tempo.geo.lookup(opts?)` | Universal geolocation lookup (browser hardware GPS or server IP lookup) cached for 24h. Supports `{ refresh: true }`. |
| `Tempo.geo.resolve(input, opts?)` | Asynchronously resolves coordinates from an instance, configuration, or ambient storage cache. |
| `Tempo.geo.coerce(input)` | Pure function normalizing various coordinate formats (`lat/lng`, `latitude/longitude`, etc.) into a canonical `GeoConfig`. |
| `Tempo.geo.stash(coords, ttl?, keyOrOpts?)` | Stashes coordinates in storage with an optional custom TTL (default: 24h) and multi-tenant partitioning. |
| `Tempo.geo.clear(keyOrOpts?)` | Purges stashed coordinates from storage. |
| `Tempo.geo.get(keyOrOpts?)` | Reads stashed coordinates for the specified tenant/IP or ambient default. |
| `Tempo.geo.current` | **Read-only getter** returning the active global/ambient coordinates snapshot (`getStashedGeo() ?? Tempo.config.geo`). |
| `Tempo.geo.server(opts?)` | Low-level server-side IP geolocation handler. |
| `Tempo.geo.browser(opts?)` | Low-level browser Geolocation API handler. |

---

## Usage Examples

### 1. Fluent OOP with `Tempo.geo`

```typescript
import { Tempo } from '@magmacomputing/tempo';
import { GeoPlugin } from '@magmacomputing/tempo-plugin-geo';

Tempo.use(GeoPlugin);

// Universal Geolocation Lookup (cached for 24h)
const lookup = await Tempo.geo.lookup();
console.log(lookup.lat, lookup.lng, lookup.city);

// Inspect live ambient coordinate snapshot
console.log(Tempo.geo.current);

// Force fresh network lookup (bypassing 24h cache)
const fresh = await Tempo.geo.lookup({ refresh: true });

// Enrich a Tempo instance asynchronously
const t = new Tempo();
const localTime = await t.geoLocate();
console.log(localTime.geo?.latitude, localTime.geo?.longitude);
```

### 2. Functional Tree-Shakeable APIs

All underlying utilities can be imported as standalone pure functions:

```typescript
import { Tempo } from '@magmacomputing/tempo';
import {
  geoLookup,
  resolveGeoCoordinates,
  stashGeo,
  clearStashedGeo,
  getStashedGeo,
} from '@magmacomputing/tempo-plugin-geo';

const coords = await geoLookup();
const t = new Tempo('2026-06-21', { geo: coords });
```

---

## ⚠️ Critical Operational Warnings

### 1. Server Context vs. Client Context

::: warning Server IP vs. User Location
**Ambient IP lookup on a server resolves the SERVER's location, NOT the user's location.**

- In a server environment (Node.js, Deno, Bun, Edge runtimes), calling `Tempo.geo.lookup()` without options queries the **server datacenter's public outbound IP address**.
- If your server runs in AWS `us-east-1` (Virginia) and an Australian user hits your API, calling ambient `Tempo.geo.lookup()` will resolve to Virginia!
- **Best Practice for Backends**:
  - Always extract the client IP from trusted reverse proxy headers (e.g., `X-Forwarded-For`, `CF-Connecting-IP`) and pass it explicitly:
    ```typescript
    const userCoords = await Tempo.geo.lookup({ ip: clientIp });
    const userTime = new Tempo(date, { geo: userCoords });
    ```
  - Or receive explicit GPS/browser coordinates from the frontend client request payload.
:::

---

### 2. Multi-Tenant Key Isolation

::: danger Shared Ambient Storage
**Unpartitioned ambient storage is shared. In multi-tenant environments, always use unique keys or instance-level options.**

- Ambient storage stores coordinates under `_magma_geo_` by default.
- In a shared process handling requests for multiple tenants or distinct users, calling `stash()` or ambient `lookup()` without a key will cause tenants to **overwrite each other's cached coordinates**!
- **Solution A: Multi-Tenant Key Scoping**:
  Pass a tenant identifier or user ID as the key:
  ```typescript
  // Stash coordinates partitioned for tenant A:
  Tempo.geo.stash(tenantACoords, undefined, 'tenant-alpha');

  // Lookup / retrieve for a specific tenant:
  const coords = Tempo.geo.get('tenant-alpha');
  Tempo.geo.clear('tenant-alpha');
  ```
  The cache automatically partitions keys under `_magma_geo_:<tenant-id>`, guaranteeing strict isolation.

- **Solution B: Instance-Level Configuration (Recommended)**:
  Avoid ambient storage altogether by binding coordinates directly to `Tempo` instances:
  ```typescript
  const tenantTime = new Tempo(date, { geo: tenantCoords });
  ```
  Instance-level coordinates are completely local, immutable, and never touch shared memory or ambient caches.
:::

---

## Security & Immutability

In keeping with Tempo's strict immutability principles, the `Tempo.geo` namespace is fully locked down:

- **Deeply Frozen**: The entire `Tempo.geo` namespace and its attached utilities are recursively frozen.
- **Tamper-Proof**: Protected against modification, deletion, or monkey-patching. Any attempt to reassign `Tempo.geo` or mutate its methods (e.g. `Tempo.geo.lookup = ...`) will throw a `TypeError` in strict mode.
- **Pure Instance Operations**: Instance methods like `t.geoLocate()` always return a new, enriched `Tempo` instance, preserving the immutability of the original instance.

---

## Licensing

This is a **Community** plugin. It is completely free and open-source for personal and commercial use under the MIT license.
