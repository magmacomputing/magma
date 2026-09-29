# Pluggable Geocoding Provider Gateway

This guide explains how to connect custom geocoding and geolocation providers (such as OpenStreetMap Nominatim, Mapbox, Google Maps, or internal corporate IP proxies) to `@magmacomputing/tempo-plugin-geo`.

---

## 1. Overview & `GeoProvider` Interface

By default, `@magmacomputing/tempo-plugin-geo` uses browser hardware geolocation in browser environments and public IP geolocation on servers. 

The **Pluggable Geocoding Provider Gateway** allows developers to register custom providers to customize coordinate resolution, forward geocoding (place query → coordinates), and reverse geocoding (coordinates → address/city/country metadata):

```typescript
export interface GeoProvider {
  /** Unique provider identifier */
  readonly name: string;
  /** Primary coordinate and location resolution */
  lookup(opts?: Record<string, any>): Promise<GeoLookupResult | null>;
  /** Optional reverse geocoding from coordinates to location metadata */
  reverseGeocode?(coords: CoordinateInput, opts?: Record<string, any>): Promise<GeoConfig | null>;
  /** Optional forward geocoding from place query string to coordinates */
  forwardGeocode?(query: string, opts?: Record<string, any>): Promise<ResolvedCoordinates | null>;
}
```

---

## 2. Registering a Provider

### A. Global Static Registration (`Tempo.geo.setProvider`)

You can register an active provider globally on the `Tempo.geo` namespace:

```typescript
import { Tempo } from '@magmacomputing/tempo';
import { GeoPlugin, type GeoProvider } from '@magmacomputing/tempo-plugin-geo';

Tempo.use(GeoPlugin);

// Simple 1 req/sec throttle for public OSM Nominatim usage policy
let nextOsmSlot = 0;
async function throttleOsm() {
  const now = Date.now();
  const scheduledTime = Math.max(now, nextOsmSlot);
  nextOsmSlot = scheduledTime + 1000;
  const wait = scheduledTime - now;
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
}

// Example: OpenStreetMap Nominatim Provider (or commercial Mapbox/LocationIQ)
const openStreetMapProvider: GeoProvider = {
  name: 'openstreetmap',

  // 1. Primary Lookup (fall back to default GPS / IP)
  async lookup() {
    return null;
  },

  // 2. Forward Geocoding: Place Query -> Coordinates
  async forwardGeocode(query: string) {
    await throttleOsm();
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1&addressdetails=1`;
    const res = await fetch(url, {
      headers: { 'User-Agent': 'YourApp-TempoGateway/1.0 (contact@example.com)' }
    });
    const list = await res.json();
    if (!Array.isArray(list) || list.length === 0) return null;

    const first = list[0];
    const lat = parseFloat(first.lat);
    const lng = parseFloat(first.lon);
    return {
      lat,
      lng,
      latitude: lat,
      longitude: lng,
      city: first.address?.city ?? first.address?.town ?? first.address?.suburb,
      country: first.address?.country_code ? first.address.country_code.toUpperCase() : undefined,
      sphere: lat >= 0 ? 'north' : 'south',
    };
  },

  // 3. Reverse Geocoding: Coordinates -> Address Details
  async reverseGeocode(coords) {
    await throttleOsm();
    const lat = (coords as any).latitude ?? (coords as any).lat;
    const lng = (coords as any).longitude ?? (coords as any).lng;
    const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`;
    const res = await fetch(url, {
      headers: { 'User-Agent': 'YourApp-TempoGateway/1.0 (contact@example.com)' }
    });
    const data = await res.json();
    return {
      city: data.address?.city ?? data.address?.town ?? data.address?.suburb,
      country: data.address?.country_code ? data.address.country_code.toUpperCase() : undefined,
    };
  }
};

Tempo.geo.setProvider(openStreetMapProvider);
```

> [!NOTE]
> `throttleOsm` operates within a single JavaScript runtime and does not limit combined traffic across concurrent users or browser tabs. Because public OpenStreetMap Nominatim enforces a strict global rate limit of 1 request per second with a contact User-Agent header, multi-user applications should route requests through a shared backend gateway with centralized rate-limiting and caching, or use a dedicated commercial service (e.g. Mapbox, LocationIQ) or self-hosted Nominatim container.

### B. Plugin Installation Options

You can also pass the provider when loading the plugin:

```typescript
Tempo.use(GeoPlugin, {
  provider: openStreetMapProvider,
});
```

### C. Call-Site Override

Providers can also be overridden per call:

```typescript
const t = new Tempo('2026-06-21T12:00:00Z');
const located = await t.geoLocate({ provider: openStreetMapProvider });
```

---

## 3. Forward & Reverse Geocoding Examples

If a provider implements `forwardGeocode` and `reverseGeocode`, you can invoke them via `Tempo.geo.forward()` and `Tempo.geo.reverse()`:

```typescript
// 1. Forward Geocoding: Search query -> Coordinates
const coords = await Tempo.geo.forward('Sydney Opera House');
console.log('Coordinates:', coords?.latitude, coords?.longitude);
console.log('City:', coords?.city, 'Country:', coords?.country);

// Attach resolved coordinates to a Tempo instance:
const sydneyTime = new Tempo('now', { geo: coords });
console.log('Season in Sydney:', sydneyTime.term.szn);

// 2. Reverse Geocoding: Coordinates -> Locality Metadata
const details = await Tempo.geo.reverse({ lat: 48.8566, lng: 2.3522 });
console.log('Reverse Geocoded:', details?.city, details?.country); // 'Paris', 'FR'
```

---

## 4. Built-in Caching & Automatic Failover

- **24-Hour Bounded Cache**: Successful coordinate resolutions through custom providers are automatically stashed in the 24-hour cache layer with multi-tenant partitioning (`Tempo.geo.lookup()`).
- **Graceful Failover**: If a custom provider encounters a network error or rate limit, `geoLookup` automatically falls back to the default environment lookup unless `{ fallback: false }` is specified.
