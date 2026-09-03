# Architectural Plan: Location-Aware SolarTerm & TidalTerm Enhancements (Celestial v1.0.0 Roadmap)

## Executive Summary

This plan outlines the future location-aware enhancements for `SolarTerm` and `TidalTerm` within `@magmacomputing/tempo-plugin-celestial` as the plugin moves toward its stable **v1.0.0 Gold Release**.

By incorporating full observer coordinates (`lat` / `lng` / `elevation`), `SolarTerm` and `TidalTerm` will transition from basic twilight and global tidal state classifiers into a real-time ephemeris engine for solar positioning, photography lighting, polar day tracking, and local coastal tide predictions.

---

## 1. SolarTerm Location-Aware Enhancements

### A. Real-Time Solar Position & Photometric Hours (`altitude` & `azimuth`)
- **Horizontal Coordinates**:
  - **`altitude`**: Sun elevation angle above (+) or below (-) the local horizon in degrees.
  - **`azimuth`**: Compass bearing in degrees ($0^\circ..360^\circ$).
  - **`zenith`**: Angular distance from overhead zenith ($90^\circ - \text{altitude}$).
- **Photography & Lighting Phases**:
  - **`isGoldenHour`**: `true` when solar altitude is between $-4^\circ$ and $+6^\circ$ (warm, soft sunlight).
  - **`isBlueHour`**: `true` when solar altitude is between $-6^\circ$ and $-4^\circ$ (deep blue twilight sky).
  - **`shadowRatio`**: Object shadow length multiplier ($\cot(\text{altitude})$), indicating how long a vertical object's shadow is relative to its height.

### B. High-Altitude Elevation Correction ($\text{elevation}$)
- **Atmospheric Refraction & Horizon Dip**:
  - Standard sea-level sunrise/sunset occurs when the Sun's center is $-0.833^\circ$ below the horizon.
  - Observer elevation shifts the horizon dip by $\text{dip} \approx 0.0347^\circ \times \sqrt{\text{elevation\_meters}}$.
  - `SolarTerm` uses `elevation` to adjust sunrise, sunset, and twilight timestamps for observers at altitude (mountaintops, aviation, high-rise buildings).

### C. Polar Regions Handling (Midnight Sun & Polar Night)
- **High-Latitude Boundary Conditions ($|\text{lat}| > 66.5^\circ$)**:
  - **`isMidnightSun`**: `true` on dates when the Sun remains continuously above the horizon for 24 hours.
  - **`isPolarNight`**: `true` on dates when the Sun remains continuously below the horizon for 24 hours.
  - `sunrise` and `sunset` evaluate to `undefined` during polar phenomena, while `solar.key` correctly reports continuous `'daylight'` or `'night'`.

---

## 2. TidalTerm Location-Aware Enhancements

### A. Local High & Low Tide Predictions (`nextHighTide`, `nextLowTide`)
- **Lunar Meridian Transit Shift**:
  - While global astronomical tidal classification (`spring`, `neap`, `king`) is coordinate-independent, local high tide occurs near the moment the Moon crosses the observer's local meridian ($\text{longitude}$).
  - Resolves **`nextHighTide`** and **`nextLowTide`** Tempo instances anchored to observer `lat`/`lng`.

### B. Lunitidal Interval & Port Offset Calibration
- **`lunitidalInterval`**:
  - Incorporates the local hydrodynamic phase lag (lunitidal interval in hours/minutes) for coastal ports.
- **Tidal Regime Classification (`diurnal` / `semi-diurnal` / `mixed`)**:
  - Identifies whether the observer's latitude experiences semi-diurnal tides (~2 high/low tides per solar day, typical for Atlantic/Pacific coasts) vs diurnal tides (~1 high/low tide per day, typical for Gulf of Mexico / Southeast Asia).

---

## 3. Proposed API Additions for Celestial v1.0.0

```typescript
// --- SolarTerm Expanded Result ---
export interface LocationAwareSolarResult {
  key: SolarPhaseKey;            // 'daylight', 'civil-twilight', 'night', etc.
  phase: string;                 // 'Daylight', 'Civil Twilight', etc.
  phases: readonly string[];
  
  // Existing Ephemeris Events
  sunrise?: Tempo;
  sunset?: Tempo;
  noon?: Tempo;
  
  // NEW Location-Aware Geometry
  altitude?: number;             // Solar altitude in degrees (-90°..+90°)
  azimuth?: number;              // Compass bearing in degrees (0°..360°)
  shadowRatio?: number;          // Shadow length multiplier
  isGoldenHour?: boolean;        // true during golden hour (-4° to +6°)
  isBlueHour?: boolean;          // true during blue hour (-6° to -4°)
  isMidnightSun?: boolean;       // true during 24h polar daylight
  isPolarNight?: boolean;        // true during 24h polar night
}

// --- TidalTerm Expanded Result ---
export interface LocationAwareTidalResult {
  state: 'spring' | 'neap' | 'normal';
  alignmentDeg: number;
  isSpringTide: boolean;
  isNeapTide: boolean;
  isKingTide: boolean;

  // NEW Location-Aware Coastal Predictions
  nextHighTide?: Tempo;          // Local high tide timestamp
  nextLowTide?: Tempo;           // Local low tide timestamp
  lunitidalIntervalMin?: number; // Port hydrodynamic lag offset
  regime?: 'semi-diurnal' | 'diurnal' | 'mixed';
}
```

---

## 4. Combined Celestial v1.0.0 Release Strategy

All three term plugins within `@magmacomputing/tempo-plugin-celestial` will reach v1.0.0 with full coordinate-awareness:

| Plugin Term | Global Astronomical Capabilities (v0.1.0) | Location-Aware Enhancements (v1.0.0) |
| :--- | :--- | :--- |
| **`SolarTerm`** | Daylight vs Twilight vs Night classification | Real-time solar position (`altitude`, `azimuth`), `isGoldenHour`, `shadowRatio`, polar day handling, elevation dip correction. |
| **`LunarTerm`** | 8 synodic phases, illumination, age, emojis | Topocentric `altitude`/`azimuth`, `isAboveHorizon`, `crescentTiltDeg`, `isSupermoon`, `isMicromoon`, local moonrise/moonset. |
| **`TidalTerm`** | Syzygy/Quadrature spring/neap/king tide classification | Local high/low tide predictions (`nextHighTide`), lunitidal interval offsets, diurnal vs semi-diurnal regime classification. |
