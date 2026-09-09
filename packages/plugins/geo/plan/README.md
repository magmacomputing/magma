# Tempo Plugin Geo: Gap Analysis & Feature Roadmap

> **Status:** v1.0.0 Foundation Delivered / v1.1.0+ Backlog Planned  
> **Target Release:** `v1.0.0` (Foundation Delivered) & `v1.1.0+` (Feature Enhancements)  
> **Source of Truth:** [`packages/library/src/common/runtime/mapper.library.ts`](../../../library/src/common/runtime/mapper.library.ts)  
> **Platform Drivers:** [`packages/library/src/browser/mapper.library.ts`](../../../library/src/browser/mapper.library.ts), [`packages/library/src/server/mapper.library.ts`](../../../library/src/server/mapper.library.ts)

---

## 1. Executive Summary & Guiding Philosophy

### The Mission: "Humanizing Temporal"
The standard JavaScript `Temporal` API is mathematically rigorous, but as a low-level engine specification, it is intentionally verbose and mechanically clunky. Answering simple human questions—such as *"What time is it where the client is right now?"*, *"Is it daylight at their location?"*, or *"What season is it there?"*—requires stitching together multiple disjoint types, external IP fetches, timezone resolvers, and coordinate conversions.

Tempo's primary mission is to **humanize Temporal**: making date-times intuitive, expressive, and effortless to work with.

### Overarching Architecture: Single Source of Truth & Repeatable Outcomes
Ease-of-use and repeatable outcomes dictate our architecture:
1. **`mapper.library.ts` as the Pure Source of Truth:** All coordinate coercion, format normalization, hemisphere deduction, and validation reside in `@magmacomputing/library`.
2. **Zero-Dependency Universal Behavior:** Sibling plugins (such as `tempo-plugin-celestial` and `tempo-plugin-astro`) and core Tempo consume `mapper.library.ts` directly. A user who passes coordinates via `new Tempo({ geo: { lat: -33.86, lng: 151.2 } })` gets the exact same normalized `GeoConfig` (with inferred `sphere`, 3-decimal alignment, and validation) **whether or not `tempo-plugin-geo` is installed**.
3. **The Role of `tempo-plugin-geo`:** This plugin is the dynamic execution layer—providing ambient storage, network IP resolution, browser hardware GPS querying, distance math, and instance mutation (`t.geoLocate()`).

---

## 2. Gap Analysis & Feature Specifications

### 2.1 Complete Instance Context Synchronization on `t.geoLocate()`
* **Principle:** When a developer explicitly awaits `t.geoLocate()`, the primary intent is to anchor the date-time instance to physical reality.
* **Specification:**
  * `t.geoLocate()` updates `latitude`, `longitude`, `tz`, and `sphere` simultaneously.
  * **`setTimezone` defaults to `true`:** Automatically converts the instance's wall-clock time to the IANA timezone of the resolved coordinates (`clientEvent.tz === 'Australia/Sydney'`). An explicit `{ setTimezone: false }` option allows opting out when callers wish to record coordinates while retaining UTC or original timezone.
  ```typescript
  const event = tempo('2026-09-08T12:00:00Z');
  const clientTime = await event.geoLocate({ ip: req.clientIp });
  // clientTime.tz === 'Australia/Sydney'
  // clientTime.geo.sphere === 'south'
  // clientTime.format('{h12}:{mi} {mer} [{tz}]') -> '10:00 pm [Australia/Sydney]'
  ```

---

### 2.2 Deterministic 3-Decimal Precision Alignment (GPS Noise Protection)
* **Principle:** Keep the interface clean and zero-config.
* **Specification:**
  * Coordinates in `coerceGeo` are deterministically normalized to **3 decimal places** (`~111m` resolution at the equator).
  * No config switches or drift threshold options: 3-decimal alignment eliminates GPS noise, prevents storage cache thrashing, and ensures identical key hashing without exposing configuration bloat to developers.

---

### 2.3 Automatic Hemisphere Inference (`'north' | 'south' | 'equator'`)
* **Principle:** Passing coordinates anywhere in the ecosystem should immediately unlock hemisphere awareness with zero plugin dependencies.
* **Specification in `mapper.library.ts`:**
  * `coerceGeo()` automatically derives `sphere`:
    * $\text{lat} > 0.001^\circ \implies \text{'north'}$
    * $\text{lat} < -0.001^\circ \implies \text{'south'}$
    * $|\text{lat}| \le 0.001^\circ \implies \text{'equator'}$
  * **Cross-Plugin Synergy (Workflow without `tempo-plugin-geo`):**
    What happens if a developer does **not** install `tempo-plugin-geo` and passes `{ lat, lng }` to `tempo-plugin-celestial` or `tempo-plugin-astro`?
    1. **Initialization:** User writes `const t = tempo({ geo: { lat: -33.8688, lng: 151.2093 } })` or passes coordinates to a celestial method.
    2. **Foundational Coercion:** Core Tempo calls `coerceGeo()` in `@magmacomputing/library`.
    3. **Zero-Plugin Deduction:** Coordinates are normalized to 3 decimal places (`-33.869`, `151.209`) and `sphere: 'south'` is derived and frozen onto `t.geo`.
    4. **Downstream Execution:** Sibling plugins (`celestial`, `astro`) read `t.geo.sphere` directly to invert solar curves and season cycles.
    * **Conclusion:** `tempo-plugin-geo` is strictly required only for **dynamic network/hardware queries** (`await t.geoLocate()`, `Tempo.geo.lookup()`, ambient IP stashing, and `Tempo.geo.distance()`). All coordinate math, rounding, and hemisphere awareness are 100% universal and self-contained.

---

### 2.4 ISO 8601 Calendar Invariant & Regional Metadata
* **Strict Boundary Rule:**
  * Tempo is strictly opinionated around **ISO 8601** standards (Monday is always day 1, standard ISO week numbering 1–53).
  * `tempo-plugin-geo` will **NEVER** alter Tempo's week alignments, day indexing, or calendar math.
* **Regional Metadata:**
  * Reverse geocoded country codes (`US`, `AU`, `GB`, etc.) are retained purely as informational metadata on `t.geo.country`.
  * Future specialized plugins (e.g. localized holiday engines or regional fiscal calendars) can inspect `t.geo.country` if needed.

---

### 2.5 Great-Circle / Haversine Distance (`Tempo.geo.distance`)
* **Specification:**
  * Provide a zero-dependency Haversine distance calculator:
    ```typescript
    Tempo.geo.distance(t1: Tempo | CoordinateInput, t2: Tempo | CoordinateInput, unit?: 'km' | 'miles' | 'm'): number;
    ```
  * **Use Cases:**
    * **Transit Velocity:** Calculate average travel speed between two timestamped events:
      $$\text{speed} = \frac{\text{Tempo.geo.distance}(t_1, t_2, \text{'km'})}{t_2.\text{diff}(t_1, \text{'hours'})}$$
    * **Impossible Travel Detection:** Flag security anomalies (e.g., login from London at 10:00 and Tokyo at 11:00).
    * **Logistics & Scheduling:** Verify route consistency between deliveries or appointments.

---

### 2.6 Rich Spatial Metadata Retention & Layout Format Tokens
* **Specification:**
  * `GeoConfig` retains metadata returned from IP lookup or Google Maps:
    ```typescript
    export interface GeoConfig {
      latitude: number;
      longitude: number;
      elevation?: number;
      sphere?: 'north' | 'south' | 'equator';
      country?: string;
      city?: string;
      region?: string;
      postalCode?: string;
      timezone?: string;
    }
    ```
  * **Integration with `format()` Tokens:**
    When geo metadata is present on an instance, `t.format()` resolves bracketed dotted tokens:
    ```typescript
    t.format('{geo.city}, {geo.country} · {h12}:{mi} {mer} [{tz}]');
    // "Sydney, Australia · 10:00 pm [Australia/Sydney]"
    ```
  * **Resolution Mechanics & Graceful Fallback:**
    * The format engine checks `token.startsWith('geo.')`:
      * Extract key: `key = token.slice(4)`.
      * Lookup value on instance: `val = t.geo?.[key]`.
      * If resolved and non-empty: replace with `String(val)`.
      * If `t.geo` is absent or `key` is undefined: cleanly replace with `''` (empty string) so formatting does not throw or print `undefined`.
    * **Developer Ergonomics:** Allows building user-facing timestamps, localized event headers, and notifications without manual string stitching.

---

### 2.7 Elevation Integration in Solar & Astro Calculations
* **Specification:**
  * When `elevation` (meters above sea level) is present in `t.geo.elevation`, downstream plugins (`tempo-plugin-celestial`, `tempo-plugin-astro`) incorporate it into apparent sunrise/sunset and solar noon calculations via atmospheric horizon dip:
    $$\Delta\theta \approx 0.0347^\circ \times \sqrt{h_{\text{meters}}}$$
  * High-altitude locations (e.g. Denver at 1,600m) accurately reflect earlier sunrises and later sunsets.

---

### 2.8 Natural Solar Time Offset (`Tempo.geo.solarOffset`)
* **Specification:**
  * Quantifies the physical delta between civil clock time and actual solar noon based on longitude ($\approx 4\text{ minutes per } 1^\circ \text{ offset from standard timezone meridian}$):
    ```typescript
    const minutes = Tempo.geo.solarOffset(coords); // e.g. -38 minutes
    ```
  * **Human Value:** Supports circadian health, natural light tracking, and outdoor activities where solar position matters more than political clock boundaries.

---

## 3. Prioritized Implementation Roadmap

| Priority | Feature | Status | Target | Scope / Target Package | Description |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **P1** | **`t.geoLocate()` Full Context Sync** | ✅ **Complete** | `v1.0.0` | `tempo-plugin-geo` | Default `setTimezone: true`, Option B reality sync, Option C call-site overrides. |
| **P1** | **Deterministic 3-Decimal Precision** | ✅ **Complete** | `v1.0.0` | `mapper.library` | Standardize lat/lng to 3 decimal places; enforce $\text{lat} \in [-90, 90], \text{lng} \in [-180, 180]$. |
| **P1** | **Hemisphere Inference (`north`/`south`/`equator`)** | ✅ **Complete** | `v1.0.0` | `mapper.library` / `tempo` | Automatic `sphere` deduction in `coerceGeo` and `t.sphere` across all packages. |
| **P2** | **Haversine Distance Utility** | ✅ **Complete** | `v1.0.0` | `tempo-plugin-geo` | `Tempo.geo.distance(t1, t2, unit?)` and `t.geoDistance(other, unit?)` for impossible travel & transit. |
| **P2** | **Rich Metadata Layout Tokens** | ✅ **Complete** | `v1.0.0` | `tempo` / `tempo-plugin-geo` | Dynamic format tokens (`{geo.city}`, `{geo.country}`, `{geo.sphere}`) in `t.format()`. |
| **P3** | **Elevation Horizon Dip** | ✅ **Complete** | `v1.0.0` | `tempo-fns` / `celestial` | Factor `t.geo.elevation` into solar sunrise/sunset times via horizon dip ($\Delta\theta \approx 0.0347^\circ \times \sqrt{h_{\text{meters}}}$). |
| **P3** | **Natural Solar Time Offset** | ✅ **Complete** | `v1.0.0` | `mapper.library` / `tempo-plugin-geo` | `Tempo.geo.solarOffset(coords)` and `t.geoSolarOffset()` calculating solar delta. |

---

## 4. Completed Foundation (Delivered in `v1.0.0`)

- [x] **Deterministic 3-Decimal Precision & Boundary Validation:** Coordinates in `coerceGeo` are validated against physical bounds ($\text{lat} \in [-90, 90]$, $\text{lng} \in [-180, 180]$) and rounded to 3 decimal places ($\approx 111\text{m}$ resolution) with zero configuration flags.
- [x] **Automatic Hemisphere Inference:** `coerceGeo()` and `Tempo.prototype.sphere` automatically derive `'north'`, `'south'`, or `'equator'` (within the $\pm 0.001^\circ$ equatorial band) across all packages without requiring `tempo-plugin-geo`.
- [x] **Instance Full Context Synchronization:** `t.geoLocate()` synchronizes `latitude`, `longitude`, `tz`, and `sphere` simultaneously. Defaults `setTimezone: true` (with `{ setTimezone: false }` opt-out), applies Option B (physical reality updates location while preserving custom non-geographic keys), and respects Option C (authoritative call-site overrides).
- [x] **Great-Circle Haversine Distance Utility:** Pure calculation via `haversineDistance()` and OOP dispatch via `Tempo.geo.distance(t1, t2, unit?)` and `t.geoDistance(other, unit?)`. Supports `'km'`, `'miles'`, and `'m'`. Enables transit velocity and impossible travel anomaly detection.
- [x] **Rich Spatial Metadata Layout Tokens:** Core format engine resolves `{geo.<prop>}` bracketed tokens (e.g. `{geo.city}`, `{geo.country}`, `{geo.sphere}`, `{geo.elevation}`) with full modifier support (e.g. `:upper`, `:title`) and graceful empty-string fallback.
- [x] **Atmospheric Horizon Dip (`elevation`):** Downstream solar calculations in `tempo-fns` and `tempo-plugin-celestial` incorporate `t.geo.elevation` into apparent sunrise, sunset, and daylight duration ($\Delta\theta \approx 0.0347^\circ \times \sqrt{h_{\text{meters}}}$) with unchanged solar noon transit.
- [x] **Natural Solar Time Offset (`solarOffset`):** Computes physical delta between civil clock time and actual solar noon ($\Delta\lambda \times 4\text{ min}$) with support for civil timezones, natural 15-degree solar meridians, units (`'minutes'`, `'seconds'`, `'hours'`), and apparent solar time (Equation of Time). Exposed via `Tempo.geo.solarOffset` and `t.geoSolarOffset()`.
- [x] **Universal Geolocation Caching:** 24-hour TTL caching in `Tempo.geo.lookup()` with `{ refresh: true }` bypass.
- [x] **Scoped Multi-Tenant Isolation:** Standardized on `_magma_geo_` with tenant key isolation (`_magma_geo_:<tenant-id>`).
- [x] **Immutability Hardening:** `Tempo.geo` is recursively frozen via `deepFreeze()`.
- [x] **Clean Non-Polluted Root:** Removed flat root methods in favor of cohesive `Tempo.geo.*`.
