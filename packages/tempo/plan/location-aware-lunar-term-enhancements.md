# Architectural Plan: Location-Aware LunarTerm Enhancements

## Executive Summary

This plan outlines the architectural expansion of `LunarTerm` (`@magmacomputing/tempo-plugin-celestial`) to leverage observer geographic coordinates (`lat` / `lng` / `elevation`).

While synodic lunar phases (`new-moon`, `full-moon`, etc.) and horizon rise/set events are already fully supported, future enhancements leverage observer coordinates for real-time topocentric ephemeris calculations, meridian transits, crescent position angles, and supermoon/eclipse visibility.

### Status Overview
- **Synodic Lunar Phases & Illumination**: **`Completed`**
- **Hemisphere-Aware Lunar Emojis**: **`Completed`**
- **Local Horizon Boundaries (`moonrise`, `moonset`)**: **`Completed`**
- **Topocentric Ephemeris (`altitude`, `azimuth`, `isAboveHorizon`)**: **`Completed`**
- **Local Meridian Transit (`transit`)**: **`Completed`**
- **Crescent Tilt & Bright Limb Angle (`crescentTiltDeg`)**: **`Completed`**
- **Topocentric Parallax & Supermoon/MicroMoon**: **`Completed`**
- **Local Eclipse Obscuration**: `Outstanding`

---

## 1. Capabilities Enabled by `lat` / `lng` Coordinates

### A. Local Horizon & Real-Time Ephemeris
- **Local Horizon Rise/Set Events** — **`Completed`**:
  - **`moonrise`**: Local moonrise timestamp anchored to observer `lat`/`lng` via `getMoonriseMoonset`.
  - **`moonset`**: Local moonset timestamp anchored to observer `lat`/`lng` via `getMoonriseMoonset`.
- **Topocentric Real-Time Position** — **`Completed`**:
  - **`altitude`**: Altitude angle above (+) or below (-) the horizon in degrees.
  - **`azimuth`**: Compass bearing in degrees ($0^\circ..360^\circ$, North = $0^\circ$, East = $90^\circ$).
  - **`isAboveHorizon`**: Boolean flag indicating if the Moon is currently visible in the local sky.
- **Local Meridian Transit (`lunar.transit`)** — **`Completed`**:
  - Computes the exact timestamp when the Moon reaches its highest point in the local sky (upper culm / local lunar noon), as well as nadir transit (lower culm / underfoot).

### B. Crescent Tilt & Position Angle of Bright Limb ($\chi$) — **`Completed`**
- **Visual Crescent Orientation**:
  - The apparent tilt angle of the Moon's illuminated crescent relative to the zenith depends on observer latitude and local hour angle.
  - In tropical and equatorial latitudes ($|\text{lat}| < 23.5^\circ$), the crescent moon appears "lying on its back" (the *Wet Moon* or *Cheshire Cat Moon*).
  - Resolves **`positionAngle`** ($\chi$) in degrees, allowing UI components or mobile apps to render pixel-accurate, geographically tilted moon crescent SVGs/emojis.

### C. Topocentric Parallax & Supermoon / MicroMoon Identification — **`Completed`**
- **Lunar Distance & Parallax**:
  - Geocentric lunar distance varies between ~356,400 km (perigee) and ~406,700 km (apogee). Topocentric parallax shifts apparent position up to $1^\circ$ based on observer `lat`/`lng`.
- **Supermoon & MicroMoon Metadata**:
  - **`isSupermoon`**: Evaluates to `true` when a Full Moon or New Moon occurs within 90% of its closest orbital approach to Earth (Perigee).
  - **`isMicromoon`**: Evaluates to `true` when a Full Moon or New Moon occurs near furthest orbital distance (Apogee).
  - **`angularDiameterArcmin`**: Apparent visual size of the lunar disk in arcminutes (~29.3' to 34.1').

### D. Local Solar & Lunar Eclipse Visibility Metadata — `Outstanding`
- **Global vs Local Eclipse**:
  - While lunar eclipses are globally visible anywhere the Moon is above the horizon, **solar eclipses** are hyper-dependent on exact observer `lat`/`lng`.
- **Properties**:
  - **`eclipse`**: Detects active or upcoming eclipses (`'total-lunar'`, `'partial-lunar'`, `'penumbral-lunar'`, `'total-solar'`, `'annular-solar'`, `'partial-solar'`).
  - **`obscuration`**: Fraction of the lunar or solar disk obscured for the observer's coordinates ($0.0..1.0$).

---

## 2. `LunarTerm` API Specification

```typescript
export interface LocationAwareLunarResult {
  // --- Global Synodic Properties [COMPLETED] ---
  key: LunarPhaseKey;               // 'full-moon', 'waxing-crescent', etc. [COMPLETED]
  phase: string;                    // 'Full Moon', 'Waxing Crescent', etc. [COMPLETED]
  index: number;                    // 1..8 step index [COMPLETED]
  illumination: number;             // 0.0 .. 1.0 fraction [COMPLETED]
  ageDays: number;                  // 0.0 .. 29.53 synodic days [COMPLETED]
  isWaxing: boolean;                // true if waxing [COMPLETED]
  emoji?: string;                   // Hemisphere-aware emoji [COMPLETED]

  // --- Location-Aware Horizon Boundaries [COMPLETED] ---
  moonrise?: Tempo;                 // Local moonrise timestamp [COMPLETED]
  moonset?: Tempo;                  // Local moonset timestamp [COMPLETED]

  // --- Real-Time Ephemeris Properties [COMPLETED] ---
  transit?: Tempo;                  // Local meridian transit (highest altitude) [COMPLETED]
  altitude?: number;                // Degrees above (+) / below (-) horizon [COMPLETED]
  azimuth?: number;                 // True North compass bearing (0..360°) [COMPLETED]
  isAboveHorizon?: boolean;         // true if altitude > 0° [COMPLETED]
  
  // --- Visual Limb Tilt & Parallax [COMPLETED] ---
  crescentTiltDeg?: number;         // Position angle of bright limb (0..360°) [COMPLETED]
  distanceKm?: number;              // Observer distance to Moon in km [COMPLETED]
  angularDiameterArcmin?: number;   // Apparent disk diameter in arcminutes [COMPLETED]
  isSupermoon?: boolean;            // true if Full/New Moon near perigee [COMPLETED]
  isMicromoon?: boolean;            // true if Full/New Moon near apogee [COMPLETED]
}
```

---

## 3. Implementation Plan & Milestones

1. **Milestone 0 (Synodic Phases & Horizon Boundaries)** — **`Completed`**:
   - Implemented `getLunarPhase` and `getLunarPhaseRange` in `@magmacomputing/tempo-fns`.
   - Implemented `getMoonriseMoonset(date, lat, lng)` in `@magmacomputing/tempo-fns`.
   - Integrated `LunarTerm` in `@magmacomputing/tempo-plugin-celestial` mapping `t.term.moon` and `t.term.lunar` with `moonrise` and `moonset` event timestamps.
   - Hemisphere-aware lunar emoji selection based on observer `sphere` / `lat`.

2. **Milestone 1 (`tempo-fns` Ephemeris Math)** — **`Completed`**:
   - Implemented `getLunarPosition(date, lat, lng)` in `@magmacomputing/tempo-fns` calculating topocentric altitude, azimuth, visibility, and RA/Dec.
   - Implemented `getLunarTransit(date, lat, lng)` in `@magmacomputing/tempo-fns` calculating upper meridian culmination.
   - Implemented `getLunarDistance(date)` in `@magmacomputing/tempo-fns` calculating topocentric distance in km, angular diameter in arcmin, perigee factor, and supermoon/micromoon flags.
   - Implemented `getCrescentTilt(date, lat, lng)` in `@magmacomputing/tempo-fns` calculating bright limb position angle and crescent tilt relative to local zenith.

3. **Milestone 2 (`tempo-plugin-celestial` Resolution)** — **`Completed`**:
   - Updated `LunarTerm` resolve handler to attach `altitude`, `azimuth`, `isAboveHorizon`, `transit`, `crescentTiltDeg`, `distanceKm`, `angularDiameterArcmin`, `isSupermoon`, and `isMicromoon` when `geo` (`latitude` & `longitude`) is present on the `Tempo` instance.
   - Maintained `null` fallback on geo-dependent properties when `geo` coordinates are absent or invalid.

4. **Milestone 3 (Tests & Documentation)** — `Outstanding`:
   - Add unit tests verifying topocentric altitude/azimuth across northern, equatorial, and southern hemisphere coordinates.
   - Add documentation and VitePress live code examples.

