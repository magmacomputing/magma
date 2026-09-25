# Transit Velocity, Impossible Travel & Navigation

This guide covers Great-Circle spatial calculations, forward compass bearings, geographic midpoints, transit velocity modeling, and impossible travel anomaly detection in `@magmacomputing/tempo-plugin-geo`.

---

## 1. Great-Circle Distance (`haversineDistance` / `Tempo.geo.distance`)

Calculates the shortest surface distance over the Earth ellipsoid between two geographic coordinates using the Great-Circle Haversine formula (with spherical radius $R = 6,371\text{ km}$ / $3,959\text{ miles}$ / $6,371,000\text{ meters}$).

### Supported Distance Units
- `'km'` (default): Kilometers
- `'miles'` or `'mi'`: Statute Miles
- `'m'` or `'meters'`: Meters

### Code Examples

```typescript
import { Tempo } from '@magmacomputing/tempo';
import { GeoPlugin, haversineDistance } from '@magmacomputing/tempo-plugin-geo';

Tempo.use(GeoPlugin);

const sydney = { lat: -33.8688, lng: 151.2093 };
const melbourne = { lat: -37.8136, lng: 144.9631 };

// Static namespace call
const distKm = Tempo.geo.distance(sydney, melbourne, 'km'); // ~713.4 km
const distMiles = Tempo.geo.distance(sydney, melbourne, 'miles'); // ~443.3 miles

// Fluent instance method
const tSydney = new Tempo({ geo: sydney });
console.log(tSydney.geoDistance(melbourne)); // ~713.4 km

// Tree-shakeable pure function
const distM = haversineDistance(sydney, melbourne, 'm'); // ~713,400 m
```

---

## 2. Compass Bearing (`Tempo.geo.bearing` / `calculateBearing`)

Computes the initial forward azimuth bearing along the Great-Circle path from an origin point to a destination point.

- **Range**: Normalized to $0^\circ \le \theta < 360^\circ$ ($0^\circ = \text{North}$, $90^\circ = \text{East}$, $180^\circ = \text{South}$, $270^\circ = \text{West}$).

```typescript
import { Tempo } from '@magmacomputing/tempo';
import { GeoPlugin } from '@magmacomputing/tempo-plugin-geo';

Tempo.use(GeoPlugin);

const london = { lat: 51.5074, lng: -0.1278 };
const paris = { lat: 48.8566, lng: 2.3522 };

// Initial compass bearing from London to Paris
const heading = Tempo.geo.bearing(london, paris); // ~148.5° (South-Southeast)

// Via instance method
const tLondon = new Tempo({ geo: london });
console.log(tLondon.geoBearing(paris)); // ~148.5°
```

---

## 3. Geographic Midpoint (`Tempo.geo.midpoint` / `calculateMidpoint`)

Calculates the exact geographic half-way point along the Great-Circle arc connecting two coordinates. This accounts for spherical Earth curvature rather than linear planar averaging.

```typescript
import { Tempo } from '@magmacomputing/tempo';
import { GeoPlugin } from '@magmacomputing/tempo-plugin-geo';

Tempo.use(GeoPlugin);

const newYork = { lat: 40.7128, lng: -74.006 };
const london = { lat: 51.5074, lng: -0.1278 };

const mid = Tempo.geo.midpoint(newYork, london);
// { latitude: 52.22, longitude: -41.48 } (mid-Atlantic route)

// Via instance method
const tNY = new Tempo({ geo: newYork });
const midPoint = tNY.geoMidpoint(london);
```

---

## 4. Transit Velocity (`Tempo.geo.velocity` / `calculateVelocity`)

Calculates the physical speed required to travel between two timestamped geographic instances:

$$\text{Velocity} = \frac{\text{Great-Circle Distance}}{\Delta t}$$

### Configuration Options
- **`unit`**: Distance unit (`'km'`, `'miles'`, `'m'`; default: `'km'`).
- **`timeUnit`**: Time unit divisor (`'hh'` for hours, `'ss'` for seconds, `'mi'` for minutes; default: `'hh'`).

```typescript
import { Tempo } from '@magmacomputing/tempo';
import { GeoPlugin } from '@magmacomputing/tempo-plugin-geo';

Tempo.use(GeoPlugin);

const departure = new Tempo('2026-06-21T08:00:00Z', { geo: { lat: 51.5074, lng: -0.1278 } }); // London
const arrival = new Tempo('2026-06-21T15:30:00Z', { geo: { lat: 40.7128, lng: -74.006 } });   // New York

// Speed in km/h over 7.5 hours
const speedKmh = Tempo.geo.velocity(departure, arrival, { unit: 'km', timeUnit: 'hh' });
console.log(speedKmh); // ~742.7 km/h (typical commercial jetliner speed)

// Speed in mph
const speedMph = Tempo.geo.velocity(departure, arrival, { unit: 'miles', timeUnit: 'hh' });
console.log(speedMph); // ~461.5 mph
```

---

## 5. Impossible Travel Anomaly Detection (`Tempo.geo.isImpossibleTravel`)

A core security primitive used to detect impossible physical travel between authentication events or user check-ins. If the calculated speed exceeds commercial flight feasibility (default: $> 900\text{ km/h}$ / $560\text{ mph}$ / $250\text{ m/s}$), the travel is flagged as anomalous.

### Handling Simultaneous / Concurrent Logins ($\Delta t = 0$)
When concurrent logins occur simultaneously from distant locations ($\Delta t = 0$), the calculated velocity is `Infinity`. `isImpossibleTravel` evaluates `velocity > threshold` directly, properly flagging concurrent logins across distant locations as impossible travel anomalies.

```typescript
import { Tempo } from '@magmacomputing/tempo';
import { GeoPlugin, isImpossibleTravel } from '@magmacomputing/tempo-plugin-geo';

Tempo.use(GeoPlugin);

const loginLondon = new Tempo('2026-06-21T12:00:00Z', { geo: { lat: 51.5074, lng: -0.1278 } });
const loginTokyo = new Tempo('2026-06-21T13:00:00Z', { geo: { lat: 35.6762, lng: 139.6503 } }); // 1 hour later

// Detect impossible physical transit (9,560 km in 1 hour => ~9,560 km/h)
const isAnomaly = Tempo.geo.isImpossibleTravel(loginLondon, loginTokyo);
console.log(isAnomaly); // true!

// Custom threshold (e.g. supersonic Concorde or custom limits)
const isCustomAnomaly = Tempo.geo.isImpossibleTravel(loginLondon, loginTokyo, {
  maxSpeed: 2000,
  unit: 'km'
});
console.log(isCustomAnomaly); // true

// Simultaneous logins from different cities (Infinity speed)
const simultaneousLondon = new Tempo('2026-06-21T12:00:00Z', { geo: { lat: 51.5074, lng: -0.1278 } });
const simultaneousTokyo = new Tempo('2026-06-21T12:00:00Z', { geo: { lat: 35.6762, lng: 139.6503 } });
console.log(Tempo.geo.isImpossibleTravel(simultaneousLondon, simultaneousTokyo)); // true
```
