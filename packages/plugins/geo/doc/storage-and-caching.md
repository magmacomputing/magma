# Storage & Multi-Tenant Caching

This guide covers coordinate persistence, 24-hour TTL caching, multi-tenant partitioning, and critical operational warnings when using `@magmacomputing/tempo-plugin-geo`.

---

## 1. Ambient Stashing & 24-Hour Bounded Cache

To prevent redundant network requests, `Tempo.geo.lookup()` automatically caches coordinates for 24 hours using `BoundedCache` from `@magmacomputing/tempo/library`.

```typescript
import { Tempo } from '@magmacomputing/tempo';
import { GeoPlugin } from '@magmacomputing/tempo-plugin-geo';

Tempo.use(GeoPlugin);

// First call performs network lookup & caches result
const coords = await Tempo.geo.lookup();

// Subsequent calls return the cached snapshot instantaneously
const cached = await Tempo.geo.lookup();

// Force fresh network lookup by bypassing cache
const fresh = await Tempo.geo.lookup({ refresh: true });

// Read ambient active snapshot synchronously
console.log(Tempo.geo.current);
```

---

## 2. Multi-Tenant Partitioning (`keyOrOpts`)

::: danger Multi-Tenant Isolation
**Unpartitioned ambient storage is shared. In multi-tenant environments, always use unique tenant keys or instance-level options.**
:::

In a shared backend process handling concurrent requests for different tenants, storing coordinates under the global ambient key will cause tenants to overwrite each other.

### Solution A: Keyed Partitioning

Pass a tenant identifier or user ID:

```typescript
// Stash coordinates for Tenant Alpha
Tempo.geo.stash(tenantACoords, undefined, 'tenant-alpha');

// Read coordinates for Tenant Alpha
const alphaCoords = Tempo.geo.get('tenant-alpha');

// Clear coordinates for Tenant Alpha
Tempo.geo.clear('tenant-alpha');
```

Under the hood, storage keys are partitioned under `_magma_geo_:<tenant-id>`, ensuring strict multi-tenant isolation.

### Solution B: Instance-Level Scoping (Recommended)

Attach coordinates directly to `Tempo` instances:

```typescript
const tenantTime = new Tempo(date, { geo: tenantCoords });
```

Instance-level coordinates are local, immutable, and never touch shared memory or global caches.

---

## 3. Server IP vs. Client Location Operational Warnings

::: warning Server IP vs. User Location
**Ambient IP lookup on a server resolves the SERVER's location, NOT the user's location.**
:::

- In a server environment (Node.js, Deno, Bun, Edge runtimes), calling `Tempo.geo.lookup()` without an explicit IP queries the **server datacenter's public outbound IP address**.
- If your server runs in AWS `us-east-1` (Virginia) and an Australian user hits your API, calling ambient `Tempo.geo.lookup()` will resolve to Virginia!
- **Best Practice for Backends**:
  - Always extract the client IP from trusted reverse proxy headers (e.g., `X-Forwarded-For`, `CF-Connecting-IP`) and pass it explicitly:
    ```typescript
    const userCoords = await Tempo.geo.lookup({ ip: clientIp });
    const userTime = new Tempo(date, { geo: userCoords });
    ```
  - Or receive explicit GPS/browser coordinates from the frontend client request payload.
