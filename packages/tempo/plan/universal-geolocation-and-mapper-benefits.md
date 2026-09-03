# Architectural Plan: Universal Geolocation & Mapper Library Capabilities in Tempo

## Executive Summary

This plan outlines the architectural expansion of Tempo's geographic configuration (`t.geo`) leveraging `@magmacomputing/library`'s dual browser (`browser/mapper.library.ts`) and server (`server/mapper.library.ts`) mapping engines.

---

## 1. TidalTerm & Geographic Coordinates (`lat` / `lng`)

### Current State
`TidalTerm` and `getTidalState()` calculate **global astronomical equilibrium tides**:
- **Phase Resolution**: Determines `spring`, `neap`, and `normal` tide states based on solar-lunar ecliptic longitude alignment ($\Delta \lambda$).
- **Perigee Factor**: Identifies `king` tides based on anomalistic lunar perigee proximity.
- **Coordinates Requirement**: **None.** Global astronomical phase classification is deterministic and coordinate-independent.

### Benefits of Geographic Coordinates for Tidal Mechanics
While phase classification is global, **local high-water and low-water timing** at a specific coastal location is strongly location-dependent:
1. **Lunar Meridian Transit Offset**: High tide timing shifts by ~4 minutes per degree of geographic longitude ($\lambda$) as the Moon transits the observer's local meridian.
2. **Local Lunitidal Interval**: Ocean basin hydrodynamics cause a localized delay (lunitidal interval) between lunar meridian transit and peak high water.
3. **Future Extension**: Incorporating `lat`/`lng` into `TidalTerm` will allow resolving local high-tide and low-tide timestamps (`t.term.tides.nextHighTide`, `t.term.tides.nextLowTide`) anchored to the user's specific coastal coordinates.

---

## 2. Browser Mapper Integration (`browser/mapper.library.ts`)

### Key Capabilities & Benefits for Tempo

#### A. Structured Address Components (`mapAddress`)
`mapAddress()` reverse-geocodes coordinates via Google Maps API into normalized components:
- **`country` (ISO Code, e.g., `'US'`, `'AU'`, `'JP'`)**:
  - **Holiday & Regional Plugins**: Enables automatic country-level bank holiday resolution (`tempo-plugin-holidays`).
  - **Calendar Defaults**: In fns and plugins, `country` dictates locale conventions such as first-day-of-week (`Sunday` in US/JP vs `Monday` in EU/AU) and fiscal year start months.
- **`locality` / `city`**:
  - Provides rich human-readable location context on `t.geo.city` for UI badges, logs, and schedule metadata.

#### B. Automated Hemisphere Inference (`mapHemisphere`)
- **Benefit**: Evaluates Google Maps geocoding or falls back to `getHemisphere()` (timezone offset heuristic).
- **Tempo Impact**: Automatically populates `t.sphere` (`'north'` vs `'south'`) when explicit `sphere` configuration is omitted, seamlessly driving `AstroTerm`, `LunarTerm`, and `TidalTerm` hemisphere adjustments.

#### C. Observer Elevation / Altitude (`coords.altitude`)
- **Benefit**: `navigator.geolocation` captures `coords.altitude` (meters above sea level).
- **Tempo Impact**: Observer elevation shifts apparent horizon dip ($\text{dip} \approx 0.0347^\circ \times \sqrt{\text{elevation\_meters}}$). Passing `elevation` to `SolarTerm` refines sub-minute sunrise/sunset and twilight event timestamps for mountain/aviation applications.

---

## 3. Server-Side Mapper Strategy & Workarounds (`server/mapper.library.ts`)

### Current State
`serverGeoLocation()` executes HTTPS IP-geolocation queries by default (rejecting plain HTTP URLs for non-local endpoints), resolving `{ lat, lng, country, city, timezone }`.

### Challenges & Workarounds for Server/SSR Environments

| Challenge | Impact | Proposed Workaround / Strategy |
| :--- | :--- | :--- |
| **Unencrypted HTTP Endpoint** | Modern HTTPS servers or Cloudflare Workers reject mixed unencrypted `http://` calls. | Default to HTTPS ip-api endpoints (`https://ipapi.co/json/` or `https://ip-api.com/json/`), rejecting unencrypted HTTP for non-local endpoints. |
| **Free-Tier Rate Limits** (45 req/min) | High-traffic Node.js / SSR servers will hit rate-limit errors (HTTP 429). | Implement server-side caching with explicit 24-hour TTL and access controls, keyed by a pseudonymous hash representation of the IP rather than retaining raw IP values in WebStore. |
| **Datacenter IP vs User IP** | Server IP geolocation resolves the physical datacenter location (e.g., AWS / Vercel server region), not the client end-user. | Inspect incoming HTTP request headers in SSR middleware (`X-Forwarded-For`, `CF-IPCountry`, `X-Vercel-IP-Country`) and pass client IP to `serverGeoLocation({ ip: clientIp })`. |
| **Server Offline / Air-Gapped Environments** | External IP fetch fails in restricted server networks. | Gracefully catch fetch errors and fall back to system timezone (`Intl.DateTimeFormat().resolvedOptions().timeZone`) and `getHemisphere()`. |

---

## 4. Proposed `t.geo` Schema & Core Expansion

Extend `Tempo` instance configuration `t.geo` to support a rich, normalized geographic object:

```typescript
export interface TempoGeoConfig {
  latitude: number;
  longitude: number;
  elevation?: number;        // Meters above sea level
  sphere?: 'north' | 'south'; // Inferred or explicit hemisphere
  country?: string;          // ISO 2-letter country code
  city?: string;             // Locality / City name
  timezone?: string;         // IANA timezone identifier
}
```

---

## 5. Phased Roadmap

1. **Phase 1 (Library)**: Add HTTPS endpoint configuration and IP caching to `server/mapper.library.ts`.
2. **Phase 2 (Core Tempo)**: Expand `coerceGeo()` and `t.geo` getter to preserve `elevation`, `country`, and `city`.
3. **Phase 3 (Plugins)**: Integrate `t.geo.elevation` into `SolarTerm` twilight horizon calculations, and `t.geo.country` into regional holiday/fiscal plugins.
