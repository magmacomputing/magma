# @magmacomputing/tempo-plugin-spatial

> Community plugin for GIS spatial geometry, Great-Circle navigation, transit velocity, and impossible travel anomaly detection for [Tempo](https://tempo.magmacomputing.com).

## Installation

```bash
npm install @magmacomputing/tempo-plugin-spatial
```

## Quick Start

### 1. Register Plugin

```typescript
import { Tempo } from '@magmacomputing/tempo';
import { SpatialPlugin } from '@magmacomputing/tempo-plugin-spatial';

Tempo.use(SpatialPlugin);
```

Or with side-effect auto-installation:

```typescript
import '@magmacomputing/tempo-plugin-spatial/install';
```

### 2. Static Namespace (`Tempo.spatial.*`)

```typescript
import { Tempo } from '@magmacomputing/tempo';

const sydney = { lat: -33.8688, lng: 151.2093 };
const melbourne = { lat: -37.8136, lng: 144.9631 };

// Great-Circle Distance (Haversine formula)
const distKm = Tempo.spatial.distance(sydney, melbourne, 'km'); // 713.435 km

// Compass Bearing
const bearing = Tempo.spatial.bearing(sydney, melbourne); // 230.2° (SW)

// Geographic Midpoint
const mid = Tempo.spatial.midpoint(sydney, melbourne);
// { latitude: -35.856, longitude: 148.012, sphere: 'south' }

// Radial Proximity Geofencing
const nearby = Tempo.spatial.isWithin(sydney, melbourne, 800, 'km'); // true

// Bounding Box Containment (with Antimeridian wrap support)
const inside = Tempo.spatial.inBoundingBox(sydney, {
  minLat: -40,
  maxLat: -30,
  minLng: 140,
  maxLng: 160,
}); // true
```

### 3. Transit Velocity & Impossible Travel Anomaly Detection

```typescript
const login1 = new Tempo('2026-06-21T10:00:00Z', {
  geo: { lat: 51.5074, lng: -0.1278 }, // London
});

const login2 = new Tempo('2026-06-21T11:00:00Z', {
  geo: { lat: 40.7128, lng: -74.0060 }, // New York (1 hour later)
});

// Travel speed calculation
const speed = Tempo.spatial.velocity(login1, login2); // 5570.22 km/h

// Impossible travel anomaly detection against commercial aviation threshold (default: 900 km/h)
const isAnomalous = Tempo.spatial.isImpossibleTravel(login1, login2); // true
```

### 4. Fluent OOP Instance Methods

```typescript
const t1 = new Tempo('2026-06-21T12:00:00Z', {
  geo: { lat: -33.8688, lng: 151.2093 },
});

const dist = t1.spatialDistance({ lat: -37.8136, lng: 144.9631 });
const bearing = t1.spatialBearing({ lat: -37.8136, lng: 144.9631 });
const isClose = t1.isWithin({ lat: -33.87, lng: 151.21 }, 5, 'km');
```

## License

MIT © Magma Computing Solutions
