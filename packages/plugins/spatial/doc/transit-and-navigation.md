<div class="plugin-eyebrow">
  <a href="./index.html">← @magmacomputing/tempo-plugin-spatial</a>
</div>

<br>

# Transit Velocity, Impossible Travel & Navigation

This guide covers Great-Circle spatial calculations, forward compass bearings, geographic midpoints, transit velocity modeling, and impossible travel anomaly detection in `@magmacomputing/tempo-plugin-spatial`.

---

## 1. Great-Circle Distance (`haversineDistance` / `Tempo.spatial.distance`)

Calculates the shortest surface distance approximation on a spherical Earth between two geographic coordinates using the Great-Circle Haversine formula (with spherical radius R = 6,371 km / 3,959 miles / 6,371,000 meters).

### Supported Distance Units
- `'km'` (default): Kilometers
- `'miles'`: Statute Miles
- `'m'`: Meters

### Code Examples

```typescript
import { Tempo } from '@magmacomputing/tempo';
import { SpatialPlugin, haversineDistance } from '@magmacomputing/tempo-plugin-spatial';

Tempo.use(SpatialPlugin);

const sydney = { lat: -33.8688, lng: 151.2093 };
const melbourne = { lat: -37.8136, lng: 144.9631 };

// Static namespace call
const distKm = Tempo.spatial.distance(sydney, melbourne, 'km'); // ~713.4 km
const distMiles = Tempo.spatial.distance(sydney, melbourne, 'miles'); // ~443.3 miles

// Fluent instance method
const tSydney = new Tempo({ geo: sydney });
console.log(tSydney.spatialDistance(melbourne)); // ~713.4 km

// Tree-shakeable pure function
const distM = haversineDistance(sydney, melbourne, 'm'); // ~713,400 m
```

---

## 2. Compass Bearing (`Tempo.spatial.bearing` / `calculateBearing`)

Computes the initial forward azimuth bearing along the Great-Circle path from an origin point to a destination point.

- **Range**: Normalized to 0° <= heading < 360° (0° = North, 90° = East, 180° = South, 270° = West).

```typescript
import { Tempo } from '@magmacomputing/tempo';
import { SpatialPlugin } from '@magmacomputing/tempo-plugin-spatial';

Tempo.use(SpatialPlugin);

const london = { lat: 51.5074, lng: -0.1278 };
const paris = { lat: 48.8566, lng: 2.3522 };

// Initial compass bearing from London to Paris
const heading = Tempo.spatial.bearing(london, paris); // ~148.5° (South-Southeast)

// Fluent instance method
const tLondon = new Tempo({ geo: london });
console.log(tLondon.spatialBearing(paris)); // ~148.5°
```

---

## 3. Geographic Midpoint (`Tempo.spatial.midpoint` / `calculateMidpoint`)

Calculates the exact spherical midpoint along the Great-Circle path connecting two coordinate points:

```typescript
import { Tempo } from '@magmacomputing/tempo';
import { SpatialPlugin } from '@magmacomputing/tempo-plugin-spatial';

Tempo.use(SpatialPlugin);

const tokyo = { lat: 35.6762, lng: 139.6503 };
const sanFrancisco = { lat: 37.7749, lng: -122.4194 };

const mid = Tempo.spatial.midpoint(tokyo, sanFrancisco);
console.log(mid);
// { latitude: 44.47..., longitude: -170.83..., sphere: 'north' }
```

---

## 4. Transit Velocity & Speed Modeling (`Tempo.spatial.velocity`)

Computes the average physical speed of travel required to transition between two timestamped geographic instances:

```
Velocity = Haversine Distance(A, B) / Δ Time
```

```typescript
import { Tempo } from '@magmacomputing/tempo';
import { SpatialPlugin } from '@magmacomputing/tempo-plugin-spatial';

Tempo.use(SpatialPlugin);

const dep = new Tempo('2026-06-21T08:00:00Z', {
  geo: { lat: 51.5074, lng: -0.1278 } // London (Depart 08:00 UTC)
});

const arr = new Tempo('2026-06-21T10:15:00Z', {
  geo: { lat: 48.8566, lng: 2.3522 } // Paris (Arrive 10:15 UTC = 2.25 hours)
});

// Speed in km/h (default)
const speedKmH = Tempo.spatial.velocity(dep, arr); // ~152.8 km/h (Eurostar train speed)

// Speed in mph
const speedMph = Tempo.spatial.velocity(dep, arr, { unit: 'miles' }); // ~95.0 mph

// Fluent instance method
console.log(dep.spatialVelocity(arr)); // ~152.8 km/h
```

---

## 5. Impossible Travel Anomaly Detection (`Tempo.spatial.isImpossibleTravel`)

A vital security primitive for detecting anomalous authentication events (e.g. impossible concurrent logins from geographically distant locations):

```typescript
import { Tempo } from '@magmacomputing/tempo';
import { SpatialPlugin } from '@magmacomputing/tempo-plugin-spatial';

Tempo.use(SpatialPlugin);

const userAuth1 = new Tempo('2026-06-21T12:00:00Z', {
  geo: { lat: 40.7128, lng: -74.0060 } // New York
});

const userAuth2 = new Tempo('2026-06-21T12:45:00Z', {
  geo: { lat: 37.7749, lng: -122.4194 } // San Francisco (45 mins later)
});

// Checks if travel exceeds physical feasibility (default: 900 km/h commercial jet speed)
const isFraud = Tempo.spatial.isImpossibleTravel(userAuth1, userAuth2);
console.log(isFraud); // true (NY to SF in 45m requires ~5500 km/h)

// Custom threshold (e.g., ground vehicle threshold: 130 km/h)
const isCarTravelImpossible = Tempo.spatial.isImpossibleTravel(userAuth1, userAuth2, {
  maxSpeed: 130
});
console.log(isCarTravelImpossible); // true
```
