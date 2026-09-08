# Tempo Plugin Geo: Gap Analysis & Feature Roadmap

> **Status:** Planning / Future Backlog  
> **Target Release:** `v1.0.0` (Pre-publish review) & `v1.1.0+`  
> **Related Source:** [`packages/library/src/browser/mapper.library.ts`](file:///home/michael/Project/magma/packages/library/src/browser/mapper.library.ts), [`packages/library/src/server/mapper.library.ts`](file:///home/michael/Project/magma/packages/library/src/server/mapper.library.ts)

---

## 1. Executive Summary & Guiding Philosophy

### The Mission: "Humanizing Temporal"
The standard JavaScript `Temporal` API is mathematically rigorous, but it is notoriously low-level and clumsy. Answering simple human questions—such as *"What time is it where the client is right now?"*, *"Is it daylight or business hours at their location?"*, or *"What season is it there?"*—requires stitching together multiple disjoint APIs, external IP fetches, timezone resolvers, and coordinate conversions.

Tempo's primary mission is to **humanize Temporal**: making date-times intuitive, expressive, and effortless to work with. 

Geolocation is fundamental to this mission. **Time and space are inseparable**: civil time only has meaning relative to a physical location on Earth. By anchoring Tempo's deterministic, immutable API to spatial awareness—**while strictly adhering to ISO 8601 standards**—`tempo-plugin-geo` elevates Tempo from an abstract clock calculator into a deeply context-aware temporal tool.

---

## 2. Gap Analysis & Humanizing Opportunities

### 2.1 Auto-Syncing Instance Timezone (`t.tz`) via Resolved Geolocation
* **Current State in `mapper.library.ts`:**
  * Server IP queries (`https://ipwho.is/`) return IANA timezone identifiers (e.g. `"timezone": "America/New_York"` or `"timezone": "Australia/Sydney"`).
  * Google Maps Geocoder responses can be coupled with Google TimeZone API or reverse lookup tables.
* **Current State in `tempo-plugin-geo`:**
  * `t.geoLocate()` only assigns `this.config.geo = { latitude, longitude }`.
  * The instance timezone (`this.tz`) remains unchanged (typically the ambient system local timezone or UTC).
* **Opportunity & Value:**
  * Allow `t.geoLocate({ setTimezone: true })` (or configurable default).
  * When geolocating across timezones or client IPs, the instance's wall-clock time automatically aligns to the local civil time of that geographic coordinate:
    ```ts
    const event = tempo('2026-09-08T12:00:00Z');
    const clientEvent = await event.geoLocate({ ip: req.clientIp, setTimezone: true });
    // clientEvent.tz === 'Australia/Sydney'
    // clientEvent.format('h:mm a z') -> '10:00 pm AEST'
    ```

---

### 2.2 Stationary Drift Filtering & GPS Noise Protection
* **Current State in `browser/mapper.library.ts`:**
  * Implements coordinate delta testing before refreshing or invalidating cached geocoder results:
    ```ts
    const prevLat = coords?.latitude?.toFixed(3);
    const prevLng = coords?.longitude?.toFixed(3);
    const test1 = value.coords.latitude.toFixed(3) !== prevLat;
    const test2 = value.coords.longitude.toFixed(3) !== prevLng;
    const test3 = prevTime < (instant().epochMilliseconds - 3_600_000); // 1 hour TTL
    ```
* **Current State in `tempo-plugin-geo`:**
  * Coordinates are cached and looked up as exact floating-point numbers.
  * In mobile/browser environments, raw GPS jitter in the 4th–6th decimal places (~10m to 10cm) creates arbitrary cache misses.
* **Opportunity & Value:**
  * Introduce stationary drift suppression in `Tempo.geo.coerce` and cache key generation.
  * Rounding to 3 decimal places (~111 meters at equator) or providing a configurable threshold (`driftToleranceMeters: 100`) prevents cache thrashing, rate-limit exhaustion, and unnecessary battery drain.

---

### 2.3 Hemisphere Awareness & Astronomical Seasons
* **Current State in `browser/mapper.library.ts`:**
  * `mapHemisphere(coords)` returns `'north' | 'south' | null`.
  * Evaluates `lat >= 0 ? 'north' : 'south'`, falling back to `getHemisphere()` based on timezone offset.
* **Current State in `tempo-plugin-geo`:**
  * Latitude is stored, but no hemisphere helpers or properties exist on `Tempo` or `Tempo.geo`.
* **Opportunity & Value:**
  * Seasons are flipped between Northern and Southern hemispheres:
    * Solstices & Equinoxes: June is Summer Solstice in the North, Winter Solstice in the South.
    * Meteorological & Astronomical Quarters: Q1 is Winter in North, Summer in South.
  * Direct synergy with sibling plugins:
    * `tempo-plugin-astro`: Zodiac signs, solar declination, equinox offsets.
    * `tempo-plugin-celestial`: Sunrise, sunset, twilight calculations (which are inverted by hemisphere).
  * **Proposed API:**
    ```ts
    Tempo.geo.hemisphere(coords: CoordinateInput): 'north' | 'south' | 'equator' | null;
    tempoInstance.hemisphere; // getter -> 'north' | 'south'
    ```

---

### 2.4 Explicit Anti-Goal: Strict ISO 8601 Week Invariant (Out of Scope)
* **Architectural Invariant:**
  * Tempo is intentionally and strictly opinionated: it is architected directly around **ISO 8601** standards (Monday is day 1, standard ISO week numbering 1–53).
* **Boundary Rule for `tempo-plugin-geo`:**
  * While reverse geocoding provides country codes (`US`, `AU`, `GB`, `AE`), **`tempo-plugin-geo` must NEVER alter Tempo's week alignments, day indexing, or calendar math.**
  * Altering week starts (e.g. attempting Sunday-start or Saturday-start weeks) compromises Tempo's deterministic ISO-8601 contract and creates conflicting calendar state across instances.
* **Acceptable Scope (Informational Only):**
  * Country codes should remain purely informational metadata (e.g. `t.geo.countryCode`), enabling external consumer logic (such as looking up regional public holiday sets or fiscal quarter offsets) without modifying Tempo's internal calendar rules.

---

### 2.5 Great-Circle / Haversine Distance & Transit Duration
* **Current State in `mapper.library.ts`:**
  * Raw coordinates are retrieved, but distance math is not provided.
* **Opportunity & Value:**
  * A lightweight, zero-dependency Haversine formula calculation directly within `Tempo.geo`:
    ```ts
    Tempo.geo.distance(t1: Tempo | CoordinateInput, t2: Tempo | CoordinateInput, opts?: { unit?: 'km' | 'mi' | 'nm' }): number;
    ```
  * **Applications for Date-Time Workflows:**
    * **Transit Velocity:** Calculate average travel speed between two timestamped events:
      $$\text{speed} = \frac{\text{Tempo.geo.distance}(t_1, t_2)}{\text{t2.diff}(t1, 'hours')}$$
    * **Impossible Travel Detection:** Flag security anomalies (e.g., login from London at 10:00 and Tokyo at 11:00).
    * **Flight / Travel Time Validation:** Validate schedule consistency across time zones and physical locations.

---

### 2.6 Rich Spatial Metadata Retention on `Tempo` Instances
* **Current State in `browser/mapper.library.ts` & `server/mapper.library.ts`:**
  * Server responses include `country`, `city`, `timezone`, `query` (IP).
  * Google Maps responses include `formatted_address`, `locality`, `administrative_area_level_1`, `postal_code`.
* **Current State in `tempo-plugin-geo`:**
  * `t.geo` is strictly `{ latitude: number, longitude: number }`.
* **Opportunity & Value:**
  * Extend `GeoConfig` to preserve rich metadata when available:
    ```ts
    export interface GeoConfig {
      latitude: number;
      longitude: number;
      elevation?: number;
      sphere?: 'north' | 'south';
      country?: string;
      countryCode?: string;
      city?: string;
      region?: string;
      postalCode?: string;
      timezone?: string;
      formattedAddress?: string;
    }
    ```
  * Enables format tokens and metadata logging:
    ```ts
    t.format('[Event at] {city}, {country} ({lat}, {lng})');
    ```

---

### 2.7 Elevation & Solar Horizon Adjustments
* **Current State in `browser/mapper.library.ts`:**
  * Google Maps Geocoding and Elevation APIs supply elevation in meters.
* **Opportunity & Value:**
  * Elevation alters apparent sunrise, sunset, and solar noon times due to horizon dip:
    $$\Delta\theta \approx 0.0347^\circ \times \sqrt{h_{\text{meters}}}$$
  * Locations at significant altitude (e.g., Denver at 1,600m, Mexico City at 2,240m) see sunrises several minutes earlier and sunsets several minutes later than sea level.
  * Preserving `elevation` in `t.geo.elevation` allows downstream plugins (`tempo-plugin-astro`, `tempo-plugin-celestial`) to produce high-precision solar calculations.

---

### 2.8 Unified Browser-Server Storage & Stash Semantics
* **Current State:**
  * Browser uses `WebStore('local')` with key `_magma_geo_`.
  * Server uses `BoundedCache` with key `_magma_geo_:<key>` or `_magma_geo_:<ip>`.
* **Opportunity & Value:**
  * Standardize storage abstraction so that cache keys, TTL expiration (24h default), and multi-tenant partitioning operate identically across Node.js, Deno, Bun, and browser environments.

### 2.9 Human-Centric "Business Hours" Checker (`t.isBusinessHours()`)
* **The "Humanizing" Need:**
  * Distributed teams and automated workflows constantly ask: *"Can I notify this user right now, or is it 3:00 AM there?"* / *"Is the client in their local business hours?"*
  * Raw Temporal requires manual zone conversions, extracting `dayOfWeek`, checking bounds, and formatting.
* **ISO 8601 Compliant Design:**
  * Default definition strictly adheres to ISO 8601: **Monday through Friday (days 1–5)**, 09:00 to 17:00 local time.
  * Simple, expressive API:
    ```ts
    const clientNow = await tempo().geoLocate({ ip: req.clientIp });
    if (clientNow.isBusinessHours()) {
      // Send real-time notification
    }
    ```

---

### 2.10 Natural Solar Time vs. Civil Clock Time (`Tempo.geo.solarOffset`)
* **The "Humanizing" Need:**
  * Civil timezones are political artifacts. In many regions, the clock reads 12:00 PM, but the sun is nowhere near its zenith (e.g. western Spain, western China, or borders of time zones where solar noon differs by 1–2 hours from clock noon).
  * For humans tracking circadian health, natural light exposure, or outdoor activities, understanding natural solar time humanizes the relationship between the clock and nature.
* **ISO 8601 Compliant Design:**
  * Does not alter ISO timestamps or civil date math.
  * Calculates solar time offset based on longitude ($\approx 4\text{ minutes per } 1^\circ \text{ offset from standard meridian}$):
    ```ts
    const offsetMinutes = Tempo.geo.solarOffset(coords); // e.g. -42 minutes
    ```

---

## 3. Prioritized Implementation Roadmap

| Priority | Feature | Effort | Target | Humanizing Impact | Description |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **P1** | **Timezone Auto-Sync** (`setTimezone: true`) | Low | `v1.0.0` / `v1.0.1` | **High** | Syncs `t.tz` to local civil time at resolved location. |
| **P1** | **Stationary Drift Filtering** | Low | `v1.0.0` / `v1.0.1` | Medium | Prevents GPS noise cache thrashing (`toFixed(3)`). |
| **P2** | **Hemisphere Awareness** (`Tempo.geo.hemisphere`) | Low | `v1.1.0` | **High** | Flipped seasonal awareness (`t.season`) for southern hemisphere humans. |
| **P2** | **Rich Metadata Preservation** | Medium | `v1.1.0` | **High** | Retains `city`, `country`, `formattedAddress` for template formatting. |
| **P3** | **Business Hours Helper** (`t.isBusinessHours()`) | Low | `v1.1.0` | **High** | Instant check if local time is 9–5 Mon–Fri (ISO 8601). |
| **P3** | **Haversine Distance Utility** | Low | `v1.1.0` | Medium | `Tempo.geo.distance(t1, t2)` for transit speed and impossible travel. |
| **P4** | **Elevation Horizon Correction** | Medium | `v1.2.0` | Medium | Horizon dip correction for high-precision sunrise/sunset. |
| **P4** | **Natural Solar Offset** | Low | `v1.2.0` | Medium | Quantifies delta between civil clock time and actual solar zenith. |

---

## 4. Architectural Invariants & Non-Goals

1. **Strict ISO 8601 Week Invariant:** Tempo is strictly opinionated. Monday is ALWAYS day 1, and ISO week numbering rules are absolute. `tempo-plugin-geo` must never modify, reconfigure, or override week start or weekend alignments.
2. **Immutable Tempo Attachment:** As established in `packages/plugins/.setup/community-plugin-template.md`, the `Tempo.geo` namespace must remain locked-down (`deepFreeze()` via `@magmacomputing/tempo/plugin/sdk` + `writable: false`, `configurable: false`), and all instance methods (`geoLocate`) must return new Tempo instances.
3. **Partitioned Isolation:** All stashing and caching must preserve multi-tenant cache keys (`_magma_geo_:<key>`).
