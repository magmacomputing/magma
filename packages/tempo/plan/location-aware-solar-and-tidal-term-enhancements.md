# Architectural Plan: Location-Aware SolarTerm & TidalTerm Enhancements (Celestial v1.0.0 Roadmap)

## Executive Summary

This plan outlines the architectural enhancements for `SolarTerm` and `TidalTerm` within `@magmacomputing/tempo-plugin-celestial` as the plugin moves toward its stable **v1.0.0 Gold Release**.

While twilight classification, solar horizon events, elevation dip correction, and astronomical tidal states are already fully implemented, future enhancements incorporate real-time solar positioning, photographic lighting phases, polar day handling, and local coastal tide predictions.

### Status Overview
- **Solar Twilight & Daylight States (`daylight`, twilights, `night`)**: **`Completed`**
- **Solar Horizon Events (`sunrise`, `sunset`, `noon`)**: **`Completed`**
- **Atmospheric Elevation Dip Correction (`elevation`)**: **`Completed`**
- **Twilight Bands (`civil`, `nautical`, `astronomical`)**: **`Completed`**
- **Real-Time Solar Coordinates (`altitude`, `azimuth`, `zenith`)**: `Outstanding`
- **Photometric Lighting Phases (`isGoldenHour`, `isBlueHour`, `shadowRatio`)**: `Outstanding`
- **Polar Day/Night Flags (`isMidnightSun`, `isPolarNight`)**: `Outstanding`
- **Astronomical Tidal Classification (`spring`, `neap`, `king`, `perigeeFactor`)**: **`Completed`**
- **Local Coastal Predictions (`nextHighTide`, `nextLowTide`)**: `Outstanding`
- **Lunitidal Port Calibration & Tidal Regime (`regime`)**: `Outstanding`

---

## 1. SolarTerm Location-Aware Capabilities

### A. Real-Time Solar Position & Photometric Hours — `Outstanding`
- **Horizontal Coordinates**:
  - **`altitude`**: Sun elevation angle above (+) or below (-) the local horizon in degrees.
  - **`azimuth`**: Compass bearing in degrees ($0^\circ..360^\circ$).
  - **`zenith`**: Angular distance from overhead zenith ($90^\circ - \text{altitude}$).
- **Photography & Lighting Phases**:
  - **`isGoldenHour`**: `true` when solar altitude is between $-4^\circ$ and $+6^\circ$ (warm, soft sunlight).
  - **`isBlueHour`**: `true` when solar altitude is between $-6^\circ$ and $-4^\circ$ (deep blue twilight sky).
  - **`shadowRatio`**: Object shadow length multiplier ($\cot(\text{altitude})$), indicating how long a vertical object's shadow is relative to its height.

### B. High-Altitude Elevation Correction ($\text{elevation}$) — **`Completed`**
- **Atmospheric Refraction & Horizon Dip**:
  - Standard sea-level sunrise/sunset occurs when the Sun's center is $-0.833^\circ$ below the horizon.
  - Observer elevation shifts the horizon dip by $\text{dip} \approx 0.0347^\circ \times \sqrt{\text{elevation\_meters}}$.
  - **Implemented**: `getSunriseSunset` in `@magmacomputing/tempo-fns` computes atmospheric horizon dip and adjusts `sunrise`, `sunset`, and twilight timestamps whenever `geo.elevation` is provided.

### C. Polar Regions Handling (Midnight Sun & Polar Night) — `Outstanding`
- **High-Latitude Boundary Conditions ($|\text{lat}| > 66.5^\circ$)**:
  - **`isMidnightSun`**: `true` on dates when the Sun remains continuously above the horizon for 24 hours.
  - **`isPolarNight`**: `true` on dates when the Sun remains continuously below the horizon for 24 hours.
  - `sunrise` and `sunset` evaluate to `undefined` during polar phenomena, while `solar.key` correctly reports continuous `'daylight'` or `'night'`.

---

## 2. TidalTerm Location-Aware Capabilities

### A. Astronomical Tidal Classification — **`Completed`**
- **Syzygy, Quadrature & Perigee Classification**:
  - **Implemented**: `getTidalState` in `@magmacomputing/tempo-fns` resolves `state` (`'spring' | 'neap' | 'normal'`), `alignmentDeg`, `isSpringTide`, `isNeapTide`, `isKingTide`, `perigeeFactor`, and `lunarTideMinute`.

### B. Local Coastal Predictions (`nextHighTide`, `nextLowTide`) — `Outstanding`
- **Lunar Meridian Transit Shift**:
  - While global astronomical tidal classification (`spring`, `neap`, `king`) is coordinate-independent, local high tide occurs near the moment the Moon crosses the observer's local meridian ($\text{longitude}$).
  - Resolves **`nextHighTide`** and **`nextLowTide`** Tempo instances anchored to observer `lat`/`lng`.

### C. Lunitidal Interval & Port Offset Calibration — `Outstanding`
- **`lunitidalInterval`**:
  - Incorporates the local hydrodynamic phase lag (lunitidal interval in hours/minutes) for coastal ports.
- **Tidal Regime Classification (`diurnal` / `semi-diurnal` / `mixed`)**:
  - Identifies whether the observer's latitude experiences semi-diurnal tides (~2 high/low tides per solar day, typical for Atlantic/Pacific coasts) vs diurnal tides (~1 high/low tide per day, typical for Gulf of Mexico / Southeast Asia).

---

## 3. Celestial v1.0.0 API Specification

```typescript
// --- SolarTerm Expanded Result ---
export interface LocationAwareSolarResult {
  // --- Ephemeris & Twilight States [COMPLETED] ---
  key: SolarPhaseState;          // 'daylight', 'civil-twilight', 'night', etc. [COMPLETED]
  phase: SolarPhaseName;         // 'Daylight', 'Civil Twilight', etc. [COMPLETED]
  phases: readonly string[];     // [COMPLETED]
  sunrise?: Tempo;               // Local sunrise [COMPLETED]
  sunset?: Tempo;                // Local sunset [COMPLETED]
  noon?: Tempo;                  // Local solar noon [COMPLETED]
  elevation?: number;            // Observer elevation in meters [COMPLETED]
  daylightDurationMs?: number;   // Total ms of daylight [COMPLETED]
  isDaylight?: boolean;          // true if currently daylight [COMPLETED]
  civil: { sunrise: Tempo; sunset: Tempo };        // [COMPLETED]
  nautical: { sunrise: Tempo; sunset: Tempo };     // [COMPLETED]
  astronomical: { sunrise: Tempo; sunset: Tempo }; // [COMPLETED]
  
  // --- Real-Time Solar Geometry [OUTSTANDING] ---
  altitude?: number;             // Solar altitude in degrees (-90°..+90°)
  azimuth?: number;              // Compass bearing in degrees (0°..360°)
  zenith?: number;               // Angular distance from overhead zenith (90° - altitude)
  shadowRatio?: number;          // Shadow length multiplier
  isGoldenHour?: boolean;        // true during golden hour (-4° to +6°)
  isBlueHour?: boolean;          // true during blue hour (-6° to -4°)
  isMidnightSun?: boolean;       // true during 24h polar daylight
  isPolarNight?: boolean;        // true during 24h polar night
}

// --- TidalTerm Expanded Result ---
export interface LocationAwareTidalResult {
  // --- Astronomical Tidal Classification [COMPLETED] ---
  key: TidalState;               // 'spring' | 'neap' | 'normal' [COMPLETED]
  state: TidalState;             // [COMPLETED]
  alignmentDeg: number;          // Solar-lunar alignment in degrees [COMPLETED]
  isSpringTide: boolean;         // [COMPLETED]
  isNeapTide: boolean;           // [COMPLETED]
  isKingTide: boolean;           // true if spring tide + perigee [COMPLETED]
  perigeeFactor: number;         // 0.0 .. 1.0 perigee proximity [COMPLETED]
  lunarTideMinute: number;       // Minute in current 745.2m lunar tidal cycle [COMPLETED]
  states: readonly TidalState[]; // [COMPLETED]

  // --- Location-Aware Coastal Predictions [OUTSTANDING] ---
  nextHighTide?: Tempo;          // Local high tide timestamp
  nextLowTide?: Tempo;           // Local low tide timestamp
  lunitidalIntervalMin?: number; // Port hydrodynamic lag offset
  regime?: 'semi-diurnal' | 'diurnal' | 'mixed';
}
```

---

## 4. Combined Celestial Release Roadmap

All three term plugins within `@magmacomputing/tempo-plugin-celestial` will reach v1.0.0 with full coordinate-awareness:

| Plugin Term | Core Astronomical Capabilities (v0.1.0) | Location-Aware Enhancements (v1.0.0 Roadmap) |
| :--- | :--- | :--- |
| **`SolarTerm`** | **`Completed`**: Twilight states (`civil`, `nautical`, `astronomical`), `sunrise`, `sunset`, `noon`, and `elevation` horizon dip. | `Outstanding`: Real-time solar position (`altitude`, `azimuth`, `zenith`), `isGoldenHour`, `shadowRatio`, and polar day flags. |
| **`LunarTerm`** | **`Completed`**: 8 synodic phases, illumination, age, hemisphere emojis, and local `moonrise`/`moonset`. | `Outstanding`: Topocentric `altitude`/`azimuth`, `isAboveHorizon`, `transit`, `crescentTiltDeg`, `isSupermoon`, `isMicromoon`. |
| **`TidalTerm`** | **`Completed`**: Syzygy/Quadrature spring/neap/king tide classification, perigee factor, lunar tidal cycle minute. | `Outstanding`: Local coastal predictions (`nextHighTide`, `nextLowTide`), lunitidal interval offsets, diurnal vs semi-diurnal regime. |
