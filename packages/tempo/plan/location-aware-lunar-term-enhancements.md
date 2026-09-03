# Architectural Plan: Location-Aware LunarTerm Enhancements

## Executive Summary

This plan outlines the future architectural expansion of `LunarTerm` (`@magmacomputing/tempo-plugin-celestial`) to leverage observer geographic coordinates (`lat` / `lng` / `elevation`).

While synodic lunar phases (`new-moon`, `full-moon`, etc.) are global solar-lunar ecliptic alignment events, observer geographic coordinates enable real-time topocentric ephemeris calculations, local horizon tracking, moon position angles, and supermoon/eclipse visibility.

---

## 1. Capabilities Enabled by `lat` / `lng` Coordinates

### A. Local Horizon & Real-Time Ephemeris (`altitude` & `azimuth`)
- **Topocentric Position**: Computes the Moon's real-time horizontal coordinates relative to the observer's local horizon:
  - **`altitude`**: Altitude angle above (+) or below (-) the horizon in degrees.
  - **`azimuth`**: Compass bearing in degrees ($0^\circ..360^\circ$, North = $0^\circ$, East = $90^\circ$).
  - **`isAboveHorizon`**: Boolean flag indicating if the Moon is currently visible in the local sky.
- **Local Meridian Transit (`lunar.transit`)**:
  - Computes the exact timestamp when the Moon reaches its highest point in the local sky (upper culm / local lunar noon), as well as nadir transit (lower culm / underfoot).

### B. Crescent Tilt & Position Angle of Bright Limb ($\chi$)
- **Visual Crescent Orientation**:
  - The apparent tilt angle of the Moon's illuminated crescent relative to the zenith depends on observer latitude and local hour angle.
  - In tropical and equatorial latitudes ($|\text{lat}| < 23.5^\circ$), the crescent moon appears "lying on its back" (the *Wet Moon* or *Cheshire Cat Moon*).
  - Resolves **`positionAngle`** ($\chi$) in degrees, allowing UI components or mobile apps to render pixel-accurate, geographically tilted moon crescent SVGs/emojis.

### C. Topocentric Parallax & Supermoon / MicroMoon Identification
- **Lunar Distance & Parallax**:
  - Geocentric lunar distance varies between ~356,400 km (perigee) and ~406,700 km (apogee). Topocentric parallax shifts apparent position up to $1^\circ$ based on observer `lat`/`lng`.
- **Supermoon & MicroMoon Metadata**:
  - **`isSupermoon`**: Evaluates to `true` when a Full Moon or New Moon occurs within 90% of its closest orbital approach to Earth (Perigee).
  - **`isMicromoon`**: Evaluates to `true` when a Full Moon or New Moon occurs near furthest orbital distance (Apogee).
  - **`angularDiameterArcmin`**: Apparent visual size of the lunar disk in arcminutes (~29.3' to 34.1').

### D. Local Solar & Lunar Eclipse Visibility Metadata
- **Global vs Local Eclipse**:
  - While lunar eclipses are globally visible anywhere the Moon is above the horizon, **solar eclipses** are hyper-dependent on exact observer `lat`/`lng`.
- **Properties**:
  - **`eclipse`**: Detects active or upcoming eclipses (`'total-lunar'`, `'partial-lunar'`, `'penumbral-lunar'`, `'total-solar'`, `'annular-solar'`, `'partial-solar'`).
  - **`obscuration`**: Fraction of the lunar or solar disk obscured for the observer's coordinates ($0.0..1.0$).

---

## 2. Proposed `LunarTerm` API Extension

```typescript
export interface LocationAwareLunarResult {
  // Existing Global Synodic Properties
  key: LunarPhaseKey;               // 'full-moon', 'waxing-crescent', etc.
  phase: string;                    // 'Full Moon', 'Waxing Crescent', etc.
  index: number;                    // 1..8 step index
  illumination: number;             // 0.0 .. 1.0 fraction
  ageDays: number;                  // 0.0 .. 29.53 synodic days
  isWaxing: boolean;
  emoji?: string;                   // Hemisphere-aware emoji

  // Existing Location-Aware Event Boundaries
  moonrise?: Tempo;                 // Local moonrise timestamp
  moonset?: Tempo;                  // Local moonset timestamp

  // --- NEW Location-Aware Ephemeris Properties ---
  transit?: Tempo;                  // Local meridian transit (highest altitude)
  altitude?: number;                // Degrees above (+) / below (-) horizon
  azimuth?: number;                 // True North compass bearing (0..360°)
  isAboveHorizon?: boolean;         // true if altitude > 0°
  
  // Visual Limb Tilt & Parallax
  crescentTiltDeg?: number;         // Position angle of bright limb (0..360°)
  distanceKm?: number;              // Observer distance to Moon in km
  angularDiameterArcmin?: number;   // Apparent disk diameter in arcminutes
  isSupermoon?: boolean;            // true if Full/New Moon near perigee
  isMicromoon?: boolean;            // true if Full/New Moon near apogee
}
```

---

## 3. Implementation Plan & Milestones

1. **Milestone 1 (`tempo-fns`)**:
   - Implement `getLunarPosition(date, lat, lng)` in `@magmacomputing/tempo-fns/celestial` calculating topocentric altitude, azimuth, and transit.
   - Implement `getLunarDistanceAndParallax(date, lat, lng)` returning distance in km and supermoon / micromoon flags.
2. **Milestone 2 (`tempo-plugin-celestial`)**:
   - Update `LunarTerm` resolve handler to attach `altitude`, `azimuth`, `isAboveHorizon`, `transit`, `crescentTiltDeg`, `isSupermoon`, and `isMicromoon` when `geo` (`latitude` & `longitude`) is present on the `Tempo` instance.
3. **Milestone 3 (Tests & Documentation)**:
   - Add unit tests verifying topocentric altitude/azimuth across northern, equatorial, and southern hemisphere coordinates.
   - Add documentation and VitePress live code examples.
