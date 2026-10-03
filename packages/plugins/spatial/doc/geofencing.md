<div class="plugin-eyebrow">
  <a href="./index.html">← @magmacomputing/tempo-plugin-spatial</a>
</div>

<br>

# Spatial Geofencing & Bounding Boxes

This guide details spatial boundary containment, circular radius proximity checks, and rectangular bounding box geofencing in `@magmacomputing/tempo-plugin-spatial`.

---

## 1. Circular Proximity (`Tempo.spatial.isWithin` / `isWithin` / `t.isWithin`)

Determines whether the Great-Circle distance between two coordinates is within a given radius threshold:

```
haversineDistance(from, to) <= maxDistance
```

### Code Examples

```typescript
import { Tempo } from '@magmacomputing/tempo';
import { SpatialPlugin, isWithin } from '@magmacomputing/tempo-plugin-spatial';

Tempo.use(SpatialPlugin);

const userPos = { lat: 37.7749, lng: -122.4194 }; // San Francisco
const storePos = { lat: 37.7833, lng: -122.4167 }; // SF Downtown Store (~1 km away)
const sanJosePos = { lat: 37.3382, lng: -121.8863 }; // San Jose (~67 km away)

// Check if user is within 5 km of SF store
const isNearby = Tempo.spatial.isWithin(userPos, storePos, 5, 'km');
console.log(isNearby); // true

// Check if user is within 10 miles of San Jose
const isSanJoseNearby = Tempo.spatial.isWithin(userPos, sanJosePos, 10, 'miles');
console.log(isSanJoseNearby); // false

// Fluent instance method
const tUser = new Tempo({ geo: userPos });
console.log(tUser.isWithin(storePos, 5, 'km')); // true

// Pure function usage
const isClose = isWithin(userPos, storePos, 2000, 'm'); // within 2000 meters
```

---

## 2. Rectangular Bounding Box (`Tempo.spatial.inBoundingBox` / `inBoundingBox` / `t.inBoundingBox`)

Checks whether a coordinate point falls inside a geographic bounding box defined by latitude and longitude bounds:

```typescript
interface BoundingBox {
  minLat: number; // Southern latitude boundary (-90..90)
  maxLat: number; // Northern latitude boundary (-90..90)
  minLng: number; // Western longitude boundary (-180..180)
  maxLng: number; // Eastern longitude boundary (-180..180)
}
```

### Standard Geographic Bounding Box

```typescript
import { Tempo } from '@magmacomputing/tempo';
import { SpatialPlugin } from '@magmacomputing/tempo-plugin-spatial';

Tempo.use(SpatialPlugin);

const californiaBBox = {
  minLat: 32.5,
  maxLat: 42.0,
  minLng: -124.5,
  maxLng: -114.1,
};

const sf = { lat: 37.7749, lng: -122.4194 };
const ny = { lat: 40.7128, lng: -74.0060 };

console.log(Tempo.spatial.inBoundingBox(sf, californiaBBox)); // true
console.log(Tempo.spatial.inBoundingBox(ny, californiaBBox)); // false

// Fluent instance method
const tSF = new Tempo({ geo: sf });
console.log(tSF.inBoundingBox(californiaBBox)); // true
```

### Antimeridian Crossing Support

Bounding boxes that cross the 180° Antimeridian (e.g. spanning from eastern Russia across the Pacific to Alaska, where `minLng > maxLng`) are automatically handled correctly:

```typescript
const pacificBBox = {
  minLat: -20,
  maxLat: 20,
  minLng: 170, // 170° East
  maxLng: -170, // 170° West (crosses 180° meridian)
};

const fiji = { lat: -17.7134, lng: 178.0650 }; // In bounding box
console.log(Tempo.spatial.inBoundingBox(fiji, pacificBBox)); // true
```
