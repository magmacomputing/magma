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

const myCustomProvider: GeoProvider = {
  name: 'corporate-proxy',
  async lookup(opts) {
    const res = await fetch(`https://geo.internal.corp/lookup?ip=${opts?.ip ?? ''}`);
    const data = await res.json();
    return {
      latitude: data.lat,
      longitude: data.lng,
      city: data.city,
      country: data.countryCode,
      timezone: data.tz,
    };
  }
};

Tempo.geo.setProvider(myCustomProvider);
```

### B. Plugin Installation Options

You can also pass the provider when loading the plugin:

```typescript
Tempo.use(GeoPlugin, {
  provider: myCustomProvider,
});
```

### C. Call-Site Override

Providers can also be overridden per call:

```typescript
const t = new Tempo('2026-06-21T12:00:00Z');
const located = await t.geoLocate({ provider: myCustomProvider });
```

---

## 3. Forward & Reverse Geocoding

If a provider implements `forwardGeocode` and `reverseGeocode`, you can invoke them via `Tempo.geo.forward()` and `Tempo.geo.reverse()`:

```typescript
// Forward Geocoding: Search query -> Coordinates
const coords = await Tempo.geo.forward('Sydney Opera House');
console.log(coords?.latitude, coords?.longitude);

// Reverse Geocoding: Coordinates -> Locality Metadata
const details = await Tempo.geo.reverse({ lat: 48.8566, lng: 2.3522 });
console.log(details?.city, details?.country); // 'Paris', 'FR'
```

---

## 4. Built-in Caching & Automatic Failover

- **24-Hour Bounded Cache**: Successful coordinate resolutions through custom providers are automatically stashed in the 24-hour cache layer with multi-tenant partitioning (`Tempo.geo.lookup()`).
- **Graceful Failover**: If a custom provider encounters a network error or rate limit, `geoLookup` automatically falls back to the default environment lookup unless `{ fallback: false }` is specified.
