# Architectural Plan: Universal Geolocation & Mapper Library Capabilities in Tempo

## Executive Summary

This plan outlines the architectural expansion of Tempo's geographic configuration (`t.geo`) leveraging `@magmacomputing/library`'s dual browser (`browser/mapper.library.ts`) and server (`server/mapper.library.ts`) mapping engines, as well as the `@magmacomputing/tempo-plugin-geo` ecosystem plugin.

### Status Overview
- **Core `GeoConfig` Schema & `t.geo` Instance Getter**: **`Completed`**
- **Deterministic 3-Decimal Precision & Coordinate Normalization**: **`Completed`**
- **Automated Hemisphere Inference (`t.sphere`)**: **`Completed`**
- **Observer Elevation & Solar Horizon Dip Correction (`elevation`)**: **`Completed`**
- **Server HTTPS IP Geolocation (`serverGeoLocation`)**: **`Completed`**
- **Universal Geolocation Dispatcher & 24h Storage Caching (`geoLookup`)**: **`Completed`**
- **Structured Address & Locality Context (`country`, `city`)**: **`Completed`**
- **Local Coastal Tide Predictions (`nextHighTide`, `nextLowTide`)**: `Outstanding`
- **Regional Holiday Plugin Integration (`t.geo.country`)**: `Outstanding`

---

## 1. TidalTerm & Geographic Coordinates (`lat` / `lng`)

### Current State — **`Completed`**
`TidalTerm` and `getTidalState()` calculate **global astronomical equilibrium tides**:
- **Phase Resolution** — **`Completed`**: Determines `spring`, `neap`, and `normal` tide states based on solar-lunar ecliptic longitude alignment ($\Delta \lambda$).
- **Perigee Factor** — **`Completed`**: Identifies `king` tides based on anomalistic lunar perigee proximity.
- **Coordinates Requirement**: **None.** Global astronomical phase classification is deterministic and coordinate-independent.

### Benefits of Geographic Coordinates for Tidal Mechanics — `Outstanding`
While phase classification is global, **local high-water and low-water timing** at a specific coastal location is strongly location-dependent:
1. **Lunar Meridian Transit Offset**: High tide timing shifts by ~4 minutes per degree of geographic longitude ($\lambda$) as the Moon transits the observer's local meridian.
2. **Local Lunitidal Interval**: Ocean basin hydrodynamics cause a localized delay (lunitidal interval) between lunar meridian transit and peak high water.
3. **Future Extension**: Incorporating `lat`/`lng` into `TidalTerm` will allow resolving local high-tide and low-tide timestamps (`t.term.tides.nextHighTide`, `t.term.tides.nextLowTide`) anchored to the user's specific coastal coordinates.

---

## 2. Browser Mapper Integration (`browser/mapper.library.ts`)

### Key Capabilities & Benefits for Tempo

#### A. Structured Address Components (`mapAddress`) — **`Completed`**
`mapAddress()` reverse-geocodes coordinates via Google Maps API into normalized components:
- **`country` (ISO Code, e.g., `'US'`, `'AU'`, `'JP'`)**:
  - **Holiday & Regional Plugins**: Enables automatic country-level bank holiday resolution (`tempo-plugin-holidays`).
  - **Calendar Defaults**: In fns and plugins, `country` dictates locale conventions such as first-day-of-week (`Sunday` in US/JP vs `Monday` in EU/AU) and fiscal year start months.
- **`locality` / `city`**:
  - Provides rich human-readable location context on `t.geo.city` for UI badges, logs, and schedule metadata.

#### B. Automated Hemisphere Inference (`mapHemisphere` & `coerceGeo`) — **`Completed`**
- **Benefit**: Evaluates Google Maps geocoding or falls back to `getHemisphere()` (timezone offset heuristic) and `resolveSphere()` within $\pm 0.001^\circ$ equatorial band.
- **Tempo Impact**: Automatically populates `t.sphere` (`'north'` vs `'south'`) when explicit `sphere` configuration is omitted, seamlessly driving `AstroTerm`, `LunarTerm`, and `TidalTerm` hemisphere adjustments across all packages.

#### C. Observer Elevation / Altitude (`coords.altitude` -> `elevation`) — **`Completed`**
- **Benefit**: `navigator.geolocation` captures `coords.altitude` (meters above sea level), and `coerceGeo` normalizes `elevation`.
- **Tempo Impact**: Observer elevation shifts apparent horizon dip ($\text{dip} \approx 0.0347^\circ \times \sqrt{\text{elevation\_meters}}$). Passing `elevation` to `SolarTerm` refines sub-minute sunrise/sunset and twilight event timestamps for mountain/aviation applications.

---

## 3. Server-Side Mapper Strategy & Workarounds (`server/mapper.library.ts`)

### Current State — **`Completed`**
`serverGeoLocation()` executes HTTPS IP-geolocation queries by default (rejecting plain HTTP URLs for non-local endpoints), resolving `{ lat, lng, latitude, longitude, country, city, timezone }`.

### Challenges & Implemented Strategies for Server/SSR Environments

| Challenge | Impact | Implemented Strategy | Status |
| :--- | :--- | :--- | :--- |
| **Unencrypted HTTP Endpoint** | Modern HTTPS servers or Cloudflare Workers reject mixed unencrypted `http://` calls. | Defaulted to secure HTTPS endpoint (`https://ipwho.is`), rejecting unencrypted HTTP for non-local endpoints. | **`Completed`** |
| **Free-Tier Rate Limits** (45 req/min) | High-traffic Node.js / SSR servers will hit rate-limit errors (HTTP 429). | Implemented universal caching in `geoLookup()` / `stashGeo()` with 24-hour TTL, isolated by tenant keys in `_magma_geo_`. | **`Completed`** |
| **Datacenter IP vs User IP** | Server IP geolocation resolves the physical datacenter location, not the client end-user. | Supports `{ ip: clientIp }` option and custom endpoints with `{ip}` placeholders to pass forwarded client IPs. | **`Completed`** |
| **Server Offline / Restricted Environments** | External IP fetch fails in restricted server networks. | Gracefully catches fetch errors with `catch: true` by default and falls back to system timezone and `getHemisphere()`. | **`Completed`** |

---

## 4. `t.geo` Schema & Core Integration — **`Completed`**

`Tempo` instance configuration `t.geo` supports a rich, normalized geographic object matching `GeoConfig` from `@magmacomputing/library`:

```typescript
export interface GeoConfig {
  readonly latitude?: number | undefined;   // Latitude in degrees (-90..90) [COMPLETED]
  readonly longitude?: number | undefined;  // Longitude in degrees (-180..180) [COMPLETED]
  readonly elevation?: number | undefined;  // Meters above sea level [COMPLETED]
  readonly sphere?: GeoSphere | undefined;  // 'north' | 'south' | 'equator' [COMPLETED]
  readonly country?: string | undefined;    // ISO country code [COMPLETED]
  readonly city?: string | undefined;       // Locality / City name [COMPLETED]
  readonly timezone?: string | undefined;   // IANA timezone identifier [COMPLETED]
}
```

---

## 5. Phased Roadmap

1. **Phase 1 (Library)** — **`Completed`**:
   - Added secure HTTPS endpoint (`https://ipwho.is`) and `{ip}` placeholder support in `server/mapper.library.ts`.
   - Added 24-hour TTL caching and multi-tenant key isolation in `geoLookup()` and `stashGeo()`.
2. **Phase 2 (Core Tempo)** — **`Completed`**:
   - Implemented `coerceGeo()` in `@magmacomputing/library` normalizing 3-decimal precision coordinates, hemisphere inference, `elevation`, `country`, `city`, and `timezone`.
   - Exposed `get geo(): Readonly<t.GeoConfig> | undefined` and `get sphere(): t.COMPASS | undefined` on `Tempo` instances.
3. **Phase 3 (Plugins)**:
   - **`Completed`**: Integrated `t.geo.elevation` into `SolarTerm` (`@magmacomputing/tempo-plugin-celestial`) for atmospheric horizon dip adjustment in sunrise, sunset, and twilight.
   - **`Completed`**: Packaged full browser & IP geolocation, great-circle distance (`haversineDistance`), and natural solar time offset (`solarOffset`) into `@magmacomputing/tempo-plugin-geo`.
   - `Outstanding`: Integrate `t.geo.country` into dedicated regional bank holiday and fiscal calendar plugins.

