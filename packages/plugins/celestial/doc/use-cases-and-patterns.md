<div class="plugin-eyebrow">
  <a href="./index.html">← @magmacomputing/tempo-plugin-celestial</a>
</div>

<br>

# Production Use Cases & Architectural Patterns

Civil clock time is an artificial human construct based on standardized 15° meridian bands. Physical systems on Earth—such as photovoltaic solar generators, agricultural crop lighting, maritime coastal navigation, and astronomical observations—are governed strictly by planetary physics:
1. **Solar Position**: True apparent solar noon, solar azimuth, elevation angles, and twilight boundaries.
2. **Lunar Mechanics**: Illumination fractions, moonrise/moonset events, topocentric distance, and supermoons.
3. **Gravitational Tides**: Semi-diurnal high/low water, spring/neap tide cycles, and perigean king tides.

The `@magmacomputing/tempo-plugin-celestial` plugin provides 100% offline, zero-network mathematical ephemeris calculations directly integrated with Tempo instances.

---

## 1. Photovoltaic (PV) Solar Inverter & Battery Storage Orchestration

In industrial microgrids and commercial battery energy storage systems (BESS), fixed-angle and single-axis solar arrays produce power as a function of the sun's altitude angle above the physical horizon.

Rather than relying on static clock intervals (e.g. 12:00 PM), control systems query true solar elevation and apparent solar noon to dynamically switch inverter modes between grid-export, self-consumption, and battery absorption:

```typescript
import { Tempo } from '@magmacomputing/tempo';
import { CelestialPlugin } from '@magmacomputing/tempo-plugin-celestial';

Tempo.use(CelestialPlugin);

export function evaluateInverterMode(
  currentTime: string,
  facilityCoordinates: { latitude: number; longitude: number }
): { mode: 'PEAK_EXPORT' | 'CHARGING' | 'STANDBY'; solarElevationDeg: number } {
  const t = new Tempo(currentTime, { geo: facilityCoordinates });
  const solar = t.term.solar;
  const altitude = solar.altitude ?? 0;

  // Peak irradiance window: solar altitude > 45°
  if (altitude > 45) {
    return { mode: 'PEAK_EXPORT', solarElevationDeg: Math.round(altitude) };
  }

  // Active generating daylight: solar altitude > 10°
  if (altitude > 10) {
    return { mode: 'CHARGING', solarElevationDeg: Math.round(altitude) };
  }

  // Low sun or night: standby mode
  return { mode: 'STANDBY', solarElevationDeg: Math.round(altitude) };
}
```

---

## 2. Smart Agriculture & Greenhouse Supplemental Lighting

Commercial greenhouse automation systems target a precise **Daily Light Integral (DLI)**—the total volume of photosynthetically active radiation (PAR) received by crops each day. Supplemental LED grow lights should only illuminate when natural daylight dips below target thresholds or during specific twilight windows.

Using `t.term.solar`, environmental control engines automatically schedule lighting around exact civil twilight and golden hour boundaries:

```typescript
import { Tempo } from '@magmacomputing/tempo';
import { CelestialPlugin } from '@magmacomputing/tempo-plugin-celestial';

Tempo.use(CelestialPlugin);

export function getGreenhouseLightingPlan(
  farmLat: number,
  farmLng: number,
  targetDate: string
) {
  const noon = new Tempo(`${targetDate} 12:00:00`, {
    geo: { latitude: farmLat, longitude: farmLng }
  });

  const solar = noon.term.solar;

  return {
    date: targetDate,
    totalDaylightHours: ((solar.daylightDurationMs ?? 0) / 3_600_000).toFixed(1),
    morningLightsOff: solar.civil.sunrise?.format('{hh}:{mi}'),
    eveningLightsOn: solar.goldenHour?.start?.format('{hh}:{mi}') ?? solar.sunset?.format('{hh}:{mi}'),
    nightModeAt: solar.civil.sunset?.format('{hh}:{mi}')
  };
}
```

---

## 3. Maritime Shipping & Coastal Keel Clearance Windows

Deep-draft container ships and bulk cargo vessels entering shallow ports, river estuaries, or tidal locks must plan arrival times around **High Water (HW)** to ensure safe Under-Keel Clearance (UKC).

`t.term.tides` resolves tidal states, spring/neap alignment, and predicted high-tide windows from observer coordinates and port lunitidal intervals:

```typescript
import { Tempo } from '@magmacomputing/tempo';
import { CelestialPlugin } from '@magmacomputing/tempo-plugin-celestial';

Tempo.use(CelestialPlugin);

export function checkPortKeelClearance(
  estimatedArrival: string,
  port: { latitude: number; longitude: number; lunitidalIntervalMin: number; name: string }
) {
  const arrival = new Tempo(estimatedArrival, { geo: port });
  const tides = arrival.term.tides;

  return {
    port: port.name,
    arrivalIso: arrival.format('{yyyy}-{mm}-{dd} {hh}:{mi}'),
    tideState: tides.state,              // 'high' | 'low' | 'flood' | 'ebb' | 'normal'
    isSpringTide: tides.isSpringTide,    // Maximum tidal amplitude
    isKingTide: tides.isKingTide,        // Perigean syzygy high water
    nextHighTide: tides.nextHighTide?.format('{yyyy}-{mm}-{dd} {hh}:{mi}')
  };
}

// Example: Vessel arriving near Hamburg Port (Elbe estuary)
const transit = checkPortKeelClearance('2026-09-15 14:00:00', {
  name: 'Port of Hamburg',
  latitude: 53.5511,
  longitude: 9.9937,
  lunitidalIntervalMin: 320
});

console.log(transit.nextHighTide); // '2026-09-15 17:26'
```

---

## 4. Drone Surveying & Architectural Golden Hour Scheduling

Aerial drone photogrammetry and architectural cinematography require planning flights during either the **Golden Hour** (soft, warm shadows when solar altitude is between -4° and 6°) or the **Blue Hour** (deep diffused blue hues during nautical twilight).

Rather than querying external weather websites, video production applications can calculate these windows for any GPS coordinate across the globe:

```typescript
import { Tempo } from '@magmacomputing/tempo';
import { CelestialPlugin } from '@magmacomputing/tempo-plugin-celestial';

Tempo.use(CelestialPlugin);

export function isOptimalShootingCondition(
  timestamp: string,
  latitude: number,
  longitude: number
): { isGoldenHour: boolean; isBlueHour: boolean; sunAltitude: number } {
  const flightTime = new Tempo(timestamp, { geo: { latitude, longitude } });
  const solar = flightTime.term.solar;

  return {
    isGoldenHour: solar.isGoldenHour ?? false,
    isBlueHour: solar.isBlueHour ?? false,
    sunAltitude: Math.round(solar.altitude ?? 0)
  };
}
```

---

## 5. Wildlife Tracking & Nocturnal Ecological Monitoring

Marine biologists and ecological field teams studying nocturnal wildlife behavior (such as sea turtle nesting, coral spawning, or bat emergence) schedule observation shifts based on the lunar cycle and moonlight illumination levels.

Using `t.term.lunar`, research software calculates illumination fractions, lunar phases, and moonrise/moonset without needing an internet connection:

```typescript
import { Tempo } from '@magmacomputing/tempo';
import { CelestialPlugin } from '@magmacomputing/tempo-plugin-celestial';

Tempo.use(CelestialPlugin);

export function getNightSurveyContext(dateIso: string, lat: number, lng: number) {
  const surveyTime = new Tempo(`${dateIso} 22:00:00`, {
    geo: { latitude: lat, longitude: lng }
  });

  const lunar = surveyTime.term.lunar;

  return {
    date: dateIso,
    moonPhase: lunar.phase,                             // e.g. 'First Quarter'
    illuminationPct: Math.round(lunar.illumination * 100), // e.g. 34%
    isWaxing: lunar.isWaxing,
    isSupermoon: lunar.isSupermoon ?? false,
    moonrise: lunar.moonrise?.format('{hh}:{mi}') ?? 'None'
  };
}
```
