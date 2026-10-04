<div class="plugin-eyebrow">
  <a href="./index.html">← @magmacomputing/tempo-plugin-spatial</a>
</div>

<br>

# Production Use Cases & Architectural Patterns

Real-world applications frequently handle events anchored in both time and space:
1. **Security & Zero-Trust**: Detecting impossible travel across concurrent user sessions.
2. **Fleet Logistics**: Triggering automated depot dispatch when vehicles enter circular geofences or service bounding boxes.
3. **Route Planning & Aviation**: Computing Great-Circle nautical distances, initial forward azimuth bearings, and route midpoints.
4. **Natural Solar Alignment**: Reconciling civil timezone offsets with true physical solar time.

The `@magmacomputing/tempo-plugin-spatial` plugin provides GIS geometry, spherical trigonometry, and velocity analysis directly on `Tempo.spatial`.

---

## 1. Zero-Trust Security: Impossible Travel Anomaly Detection

In identity providers, IAM systems, and banking portals, detecting stolen session tokens or credential stuffing is critical. If a user authenticates in New York and makes an API call from London 30 minutes later, physical travel between those coordinates is impossible without exceeding commercial aviation speeds.

`Tempo.spatial.isImpossibleTravel` calculates Great-Circle distance over elapsed time, flagging speed anomalies exceeding commercial flight thresholds (default: 900 km/h):

```typescript
import '@magmacomputing/tempo-plugin-spatial/install';
import { Tempo } from '@magmacomputing/tempo';

interface UserLoginEvent {
  userId: string;
  timestampIso: string;
  ipLatitude: number;
  ipLongitude: number;
}

export function evaluateLoginRisk(
  lastLogin: UserLoginEvent,
  currentLogin: UserLoginEvent
): { isAnomalous: boolean; calculatedSpeedKmH: number } {
  // 1. Initialize Tempo instances with geographic metadata
  const origin = new Tempo(lastLogin.timestampIso, {
    geo: { latitude: lastLogin.ipLatitude, longitude: lastLogin.ipLongitude }
  });

  const destination = new Tempo(currentLogin.timestampIso, {
    geo: { latitude: currentLogin.ipLatitude, longitude: currentLogin.ipLongitude }
  });

  // 2. Compute effective travel velocity
  const speed = Tempo.spatial.velocity(origin, destination, { unit: 'km', timeUnit: 'hh' });

  // 3. Evaluate commercial flight feasibility threshold (900 km/h)
  const isAnomalous = Tempo.spatial.isImpossibleTravel(origin, destination, {
    maxCommercialSpeedKmH: 900
  });

  return {
    isAnomalous,
    calculatedSpeedKmH: Math.round(speed)
  };
}

// Example: User signs in from NYC, then 30 mins later from London
const check = evaluateLoginRisk(
  { userId: 'usr_123', timestampIso: '2026-06-01 10:00:00', ipLatitude: 40.7128, ipLongitude: -74.006 },
  { userId: 'usr_123', timestampIso: '2026-06-01 10:30:00', ipLatitude: 51.5074, ipLongitude: -0.1278 }
);

console.log(check.isAnomalous);        // true (Requires step-up MFA or token revocation)
console.log(check.calculatedSpeedKmH); // 11140 km/h
```

---

## 2. Fleet Geofencing: Depot Arrival & Service Zone Boundaries

Delivery platforms and transport dispatchers trigger real-time workflow events when couriers enter delivery zones or arrive at a loading dock:

- **Circular Proximity (`isWithin`)**: Detects arrival within a specific radius (e.g. 500 meters of a warehouse).
- **Rectangular Bounding Box (`inBoundingBox`)**: Enforces regional operational boundaries.

```typescript
import '@magmacomputing/tempo-plugin-spatial/install';
import { Tempo } from '@magmacomputing/tempo';

const depot = { lat: -33.8688, lng: 151.2093 }; // Sydney Central Depot

// Regional delivery service boundary
const metroBoundingBox = {
  minLat: -33.95,
  maxLat: -33.75,
  minLng: 151.10,
  maxLng: 151.30
};

export function processCourierTelemetry(courierLocation: { lat: number; lng: number }) {
  // Check if courier is within 500m of depot loading bay
  const isAtDepot = Tempo.spatial.isWithin(courierLocation, depot, 500, 'm');

  // Verify courier is operating within licensed metropolitan zone
  const isInsideZone = Tempo.spatial.inBoundingBox(courierLocation, metroBoundingBox);

  return {
    isAtDepot,
    isInsideZone
  };
}
```

---

## 3. Flight Route Planning: Great-Circle Distance & Forward Azimuth

Air navigation uses Great-Circle geodesic routes to minimize fuel consumption. `Tempo.spatial.distance`, `bearing`, and `midpoint` calculate the shortest curvature path, the initial compass heading, and the midpoint coordinates:

```typescript
import '@magmacomputing/tempo-plugin-spatial/install';
import { Tempo } from '@magmacomputing/tempo';

const jfkAirport = { lat: 40.6413, lng: -73.7781 };
const lhrAirport = { lat: 51.4700, lng: -0.4543 };

export function planFlightSector(origin: typeof jfkAirport, destination: typeof lhrAirport) {
  const distanceKm = Tempo.spatial.distance(origin, destination, 'km');
  const initialBearingDeg = Tempo.spatial.bearing(origin, destination);
  const midpoint = Tempo.spatial.midpoint(origin, destination);

  return {
    distanceKm: Math.round(distanceKm),
    initialBearingDeg: Math.round(initialBearingDeg),
    midpointCoord: {
      latitude: Number(midpoint.latitude.toFixed(3)),
      longitude: Number(midpoint.longitude.toFixed(3)),
      hemisphere: midpoint.sphere
    }
  };
}

const flightPlan = planFlightSector(jfkAirport, lhrAirport);
console.log(flightPlan.distanceKm);        // 5540 km
console.log(flightPlan.initialBearingDeg); // 51°
console.log(flightPlan.midpointCoord);     // { latitude: 52.217, longitude: -41.303, hemisphere: 'north' }
```

---

## 4. Physical Solar Noon vs. Civil Timezone Offset

Standard civil timezones group large geographic expanses into unified offsets. In regions on the western edge of wide time zones (such as Spain, which operates on Central European Time `UTC+1` / `UTC+2` despite geographically aligning with `UTC+0`), civil clock noon occurs nearly two hours before the sun reaches its zenith.

`Tempo.spatial.solarOffset` calculates this delta for energy modeling and circadian scheduling:

```typescript
import '@magmacomputing/tempo-plugin-spatial/install';
import { Tempo } from '@magmacomputing/tempo';

// Paris, France on the Summer Solstice
const t = new Tempo('2026-06-21 12:00:00', {
  geo: { latitude: 48.8584, longitude: 2.2945 },
  timeZone: 'Europe/Paris'
});

// Calculate solar delta in minutes
const deltaMinutes = Tempo.spatial.solarOffset(t, { unit: 'minutes' });

// In CEST (UTC+2), civil noon is ~110 minutes ahead of true solar noon
console.log(deltaMinutes); // -110.82 minutes
```
