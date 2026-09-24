# Implementation Plan: Geo Plugin Future Roadmap & Cultural Synergy

> **Document Type:** Architectural & Implementation Plan (IP)  
> **Target Scope:** `@magmacomputing/tempo-plugin-geo` (`v1.1.0+`), `@magmacomputing/library`, `@magmacomputing/tempo-plugin-celestial`  
> **Source of Truth:** [`packages/library/src/common/runtime/mapper.library.ts`](../../../library/src/common/runtime/mapper.library.ts)  
> **Companion Plan:** [`packages/plugins/geo/plan/README.md`](./README.md)  

---

## 1. Executive Summary

`tempo-plugin-geo` v1.0.0 established the spatial foundation of the Tempo ecosystem: universal coordinate coercion (`coerceGeo`), deterministic 3-decimal rounding, zero-dependency hemisphere inference (`t.sphere`), full instance context synchronization (`t.geoLocate()`), Great-Circle Haversine distance (`Tempo.geo.distance`), `{geo.*}` layout tokens, elevation horizon dip correction, and natural solar time offset (`solarOffset`).

This implementation plan defines the next evolutionary phase (`v1.1.0` through `v1.3.0`):
1. **Cultural Synergy with `t.intl` (`Intl.LocaleInfo`)**: Leveraging resolved geographic country codes to automatically align `t.intl` regional week boundaries and cultural weekends via opt-in `setLocale`.
2. **Dual-Tier Solar Architecture**: Retaining lightweight geographic solar meridian drift on `Tempo.geo.solarOffset` while expanding `SolarTerm` in `tempo-plugin-celestial` with `solar.noon` and `solar.solarTime`.
3. **Advanced Spatial Analytics**: Introducing transit velocity, impossible travel anomaly detection, compass bearings/midpoints, and lightweight geofencing.

---

## 2. Cultural Synergy: Bridging Geo, Timezone, and `t.intl`

### 2.1 The Architectural Context
When Tempo's initial geo plan was drafted, Tempo strictly enforced ISO 8601 week boundaries across all operations. With the introduction of [`t.intl`](file:///home/michael/Project/magma/packages/tempo/src/tempo.class.ts#L1864) and opt-in `localeInfo: true`, Tempo now supports culturally authentic calendar arithmetic (e.g. Sunday-start in `en-US`/`ja-JP`, Saturday-start and Friday/Saturday weekends in `ar-SA`).

```
[Geographic Coordinates (lat, lng)]
         │
         ▼
[Physical Reality / IANA Timezone (tz)]
         │
         ▼
[Country / Region (geo.country)] ──────► [t.intl / Intl.LocaleInfo]
                                                 │
                                                 ▼
                                     • Cultural First Day (t.intl.firstDay)
                                     • Regional Weekend (t.intl.weekend)
                                     • Hour Cycle (t.intl.hourCycle)
                                     • Writing Direction (t.intl.direction)
```

### 2.2 Format Token Boundaries
* **No Redundant Geo Tokens**: Core Tempo already exposes cultural metadata directly through the `{intl.*}` token family (`{intl.firstDay}`, `{intl.region}`, `{intl.direction}`, `{intl.hourCycle}`, `{intl.weekend}`).
* **Strict Separation of Concerns**:
  * `{geo.*}` tokens focus exclusively on spatial/geographic properties: `{geo.city}`, `{geo.country}`, `{geo.region}`, `{geo.postalCode}`, `{geo.latitude}`, `{geo.longitude}`, `{geo.elevation}`, `{geo.sphere}`.
  * `{intl.*}` tokens focus exclusively on cultural/linguistic properties.

### 2.3 `t.geoLocate()` — Automated Cultural Sync via `LocaleSyncMode`

When an instance is geolocated, reverse geocoding resolves the physical `country` (e.g. `'SA'`, `'US'`, `'JP'`, `'DE'`). 

`geoLocate()` defaults `setLocale: true` (or `'regional'`) to align cultural week boundaries (`t.intl.firstDay`, `t.intl.weekend`) while **preserving the source instance's language preference** via BCP 47 subtag composition:

$$\text{newLocale} = \text{sourceLanguage} + \text{"-"} + \text{geoCountry}$$

#### Type Definition:
```typescript
/**
 * Mode for synchronizing locale during geolocation.
 * - `'regional'` / `true` (Default): Adapts regional cultural calendar (week start, weekend) 
 *   while preserving the source instance's language (e.g. 'en-US' + 'SA' ➜ 'en-SA').
 * - `'native'` / `'full'`: Fully localizes both language and region to the native primary locale (e.g. 'ar-SA').
 * - `'none'` / `false`: Disables locale synchronization; leaves instance locale untouched.
 * - Custom BCP 47 string (e.g. `'fr-CH'`, `'en-GB'`): Sets the instance locale directly to the specified tag.
 */
export type LocaleSyncMode =
  | boolean
  | 'regional' | 'region'
  | 'native'   | 'full'
  | 'none'     | 'off'
  | (string & {});
```

#### Supported Options for `setLocale`:
* **`true` / `'regional'` / `'region'` (Default)**: Preserves source language but adapts region to geolocated country (e.g., `en-US` ➜ `en-SA`, `fr-FR` ➜ `fr-JP`). English/French text rendering is retained, while local business week boundaries and weekend definitions adapt to the real-world destination.
* **`'native'` / `'full'`**: Fully converts both language and region to the primary native locale of the country (e.g., `en-US` ➜ `ar-SA` or `ja-JP`).
* **`false` / `'none'` / `'off'`**: Leaves the instance's existing `locale` completely untouched.
* **Custom BCP 47 String (e.g., `'fr-CH'`, `'es-US'`)**: Directly assigns a custom validated BCP 47 tag. Perfect for multilingual territories (e.g. French-speaking user in Switzerland).

```typescript
// 1. Initialized with English language preference
const event = new Tempo('2026-09-25T10:00:00Z', { locale: 'en-US' });

// 2. Default (Regional Adaptation): Preserves language, updates Saudi calendar
const loc = await event.geoLocate({ ip: '82.165.197.1' }); // Saudi Arabia IP
// loc.tz === 'Asia/Riyadh'
// loc.geo.country === 'SA'
// loc.locale === 'en-SA'
// loc.intl.firstDay === 6 (Saturday start)
// loc.intl.weekend === [5, 6] (Friday & Saturday)
// loc.format('{mon:locale}') === 'September' (English text preserved!)

// 3. Full Native conversion (if complete linguistic localization is desired)
const nativeLoc = await event.geoLocate({ ip: '82.165.197.1', setLocale: 'native' });
// nativeLoc.locale === 'ar-SA'
// nativeLoc.format('{mon:locale}') === 'سبتمبر'

// 4. Custom BCP-47 Tag (e.g. French in Switzerland or Spanish in Saudi Arabia)
const customLoc = await event.geoLocate({ ip: '82.165.197.1', setLocale: 'es-SA' });
// customLoc.locale === 'es-SA'
// customLoc.format('{mon:locale}') === 'septiembre'

// 5. Opt-out (leaves locale tag unmodified)
const untouchedLoc = await event.geoLocate({ ip: '82.165.197.1', setLocale: false });
// untouchedLoc.locale === 'en-US'
// untouchedLoc.intl.weekend === [6, 7]
```

### 2.4 Defensive Edge-Case Country Resolution

When reverse geocoding cannot resolve a single distinct country (e.g. international waters, Antarctica `AQ`, disputed territories, or local/private IPs):

1. **Non-Destructive Invariance**: If `country` is undefined, empty, or unresolvable, `geoLocate()` preserves the instance's existing `locale` without throwing.
2. **Array Normalization**: If a geocoder returns an array (e.g., `['IN', 'PK']`), the first valid ISO 3166-1 alpha-2 code is evaluated.
3. **`Intl.Locale` Validation Probe**: Before assigning a synthesized tag (`${lang}-${country}`), it is validated against `new Intl.Locale(tag)`. If `RangeError` is thrown, it safely falls back to the source locale.

---

## 3. Solar Calculations: Geographic vs. Celestial Architecture

### 3.1 Architectural Separation
A key design question is whether solar offset belongs in `geo` or `SolarTerm`. The answer is a **dual-tier hybrid exposure**:

| Dimension | `Tempo.geo.solarOffset` (`tempo-plugin-geo`) | `SolarTerm` (`tempo-plugin-celestial`) |
| :--- | :--- | :--- |
| **Concept** | **Natural Solar Time Offset** (Longitudinal Delta) | **Apparent Solar Trajectory & Celestial Phases** |
| **Physics** | $\Delta \lambda \times 4\text{ min/deg}$ from timezone meridian ($\pm \text{EoT}$) | Exact solar altitude, azimuth, zenith, twilight, and transit |
| **Runtime Cost** | $O(1)$ analytical geometry, zero dependencies | Keplerian orbital ephemeris & trigonometric modeling |
| **Use Cases** | Circadian light tracking, timezone meridian drift | Twilight tracking, golden hour photography, solar noon |
| **Target API** | `Tempo.geo.solarOffset(coords)` & `t.geoSolarOffset()` | `t.term.solar.noon` & `t.term.solar.solarTime` |

### 3.2 Additions to `SolarTerm` (Celestial Plugin)
To complete the celestial feature set, `SolarTerm` will incorporate:
* **`t.term.solar.noon`**: Returns a `Tempo` instance representing exact apparent solar noon (meridian transit) for the date and location.
* **`t.term.solar.solarTime`**: Returns the current local apparent solar time as a `Tempo` instance or localized `{ hours, minutes, seconds }` structure.

---

## 4. Prioritized Feature Roadmap (`v1.1.0` – `v1.3.0`)

### 4.1 Phase 1 (Target: `v1.1.0`) — Security, Transit & Navigation

#### A. Transit Velocity & Impossible Travel Anomaly Detection
* **Functionality**: Calculates speed between two timestamped geographic instances and evaluates physical travel feasibility:
  ```typescript
  // Velocity in km/h, mph, or m/s
  const speedKmh = Tempo.geo.velocity(loginLondon, loginTokyo, 'km'); // e.g. 9500 km/h

  // Instance method
  const velocity = loginTokyo.geoVelocity(loginLondon, 'km');

  // Security anomaly check
  const isAnomaly = Tempo.geo.isImpossibleTravel(loginLondon, loginTokyo, {
    maxCommercialSpeedKmH: 900 // Flags supersonic/impossible travel
  }); // true
  ```

#### B. Great-Circle Compass Bearing & Geographic Midpoint
* **Functionality**: Computes initial forward azimuth bearing and spatial midpoint:
  ```typescript
  // Initial compass bearing (0°–360°)
  const heading = Tempo.geo.bearing(sydney, melbourne); // 215.4° (SW)

  // Geographic midpoint between two coordinate anchors
  const midway = Tempo.geo.midpoint(sydney, melbourne);
  // { latitude: -35.864, longitude: 147.852, sphere: 'south' }
  ```

---

### 4.2 Phase 2 (Target: `v1.2.0`) — Cultural Sync & Spatial Boundaries

#### A. Automated Cultural Sync (`setLocale: true`)
* Automatically maps geolocated ISO country code to primary BCP 47 locale in `t.geoLocate()`, unlocking `t.intl.firstDay` and `t.intl.weekend` without manual configuration.

#### B. Proximity & Geofencing Queries
* **Functionality**: Fast spatial checks for radius, bounding box, and polygon inclusion:
  ```typescript
  // Radial proximity check
  const inDeliveryZone = Tempo.geo.isWithin(customerLocation, warehouseLocation, 25, 'km'); // boolean

  // Bounding box check
  const inMetro = Tempo.geo.inBoundingBox(location, {
    minLat: -34.1, maxLat: -33.5, minLng: 150.5, maxLng: 151.4
  });
  ```

---

### 4.3 Phase 3 (Target: `v1.3.0`) — Pluggable Geocoding Provider Gateway

#### A. Standardized Provider Adapter Interface
* **Functionality**: Extensible interface allowing custom geocoding and reverse geocoding providers (OpenStreetMap Nominatim, Mapbox, Google Maps, or internal corporate proxies) with automatic rate limiting and fallback:
  ```typescript
  Tempo.geo.setProvider(new NominatimGeoProvider({ userAgent: 'MyTempoApp/1.0' }));
  ```

---

## 5. Summary Matrix & Package Allocation

| Feature | Release | Package | Status |
| :--- | :--- | :--- | :--- |
| **Velocity & Impossible Travel** | `v1.1.0` | `mapper.library` / `tempo-plugin-geo` | 📝 Planned |
| **Bearing & Midpoint Calculation** | `v1.1.0` | `mapper.library` / `tempo-plugin-geo` | 📝 Planned |
| **`SolarTerm.noon` & `SolarTerm.solarTime`** | `v1.1.0` | `tempo-plugin-celestial` | 📝 Planned |
| **Cultural Sync (`setLocale: true`)** | `v1.2.0` | `tempo-plugin-geo` | 📝 Planned |
| **Proximity & Bounding Box Geofencing** | `v1.2.0` | `mapper.library` / `tempo-plugin-geo` | 📝 Planned |
| **Pluggable Geocoding Provider Gateway** | `v1.3.0` | `tempo-plugin-geo` | 📝 Planned |
