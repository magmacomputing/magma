# Spatial Geofencing & Bounding Boxes

This guide details spatial boundary containment, circular radius proximity checks, and rectangular bounding box geofencing in `@magmacomputing/tempo-plugin-geo`.

---

## 1. Circular Proximity (`Tempo.geo.isWithin` / `isWithin`)

Determines whether the Great-Circle distance between two coordinates is within a given radius threshold:

$$\text{haversineDistance}(\text{from}, \text{to}) \le \text{maxDistance}$$

### Code Examples

```typescript
import { Tempo } from '@magmacomputing/tempo';
import { GeoPlugin, isWithin } from '@magmacomputing/tempo-plugin-geo';

Tempo.use(GeoPlugin);

const userPos = { lat: 37.7749, lng: -122.4194 }; // San Francisco
const storePos = { lat: 37.7833, lng: -122.4167 }; // SF Downtown Store (~1 km away)
const sanJosePos = { lat: 37.3382, lng: -121.8863 }; // San Jose (~67 km away)

// Check if user is within 5 km of SF store
const isNearby = Tempo.geo.isWithin(userPos, storePos, 5, 'km');
console.log(isNearby); // true

// Check if user is within 10 miles of San Jose
const isSanJoseNearby = Tempo.geo.isWithin(userPos, sanJosePos, 10, 'miles');
console.log(isSanJoseNearby); // false

// Pure function usage
const isClose = isWithin(userPos, storePos, 2000, 'm'); // within 2000 meters
```

---

## 2. Rectangular Bounding Box (`Tempo.geo.inBoundingBox` / `inBoundingBox`)

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
import { GeoPlugin } from '@magmacomputing/tempo-plugin-geo';

Tempo.use(GeoPlugin);

// Greater London bounding box
const londonBox = {
  minLat: 51.28,
  maxLat: 51.69,
  minLng: -0.51,
  maxLng: 0.33
};

const centralLondon = { lat: 51.5074, lng: -0.1278 };
const oxford = { lat: 51.7520, lng: -1.2577 };

console.log(Tempo.geo.inBoundingBox(centralLondon, londonBox)); // true
console.log(Tempo.geo.inBoundingBox(oxford, londonBox));        // false
```

---

## 3. Antimeridian Crossing Resolution ($180^\circ$ Longitude)

Geographic bounding boxes that span across the International Date Line (antimeridian at $\pm 180^\circ$ longitude, such as Fiji, New Zealand, Alaska Aleutian Islands, and Pacific maritime corridors) have $\text{minLng} > \text{maxLng}$ (e.g. from $170^\circ\text{E}$ to $-170^\circ\text{W}$).

`inBoundingBox` handles antimeridian crossing automatically:

- **Standard box ($\text{minLng} \le \text{maxLng}$)**: $\text{minLng} \le \text{lng} \le \text{maxLng}$
- **Antimeridian box ($\text{minLng} > \text{maxLng}$)**: $\text{lng} \ge \text{minLng} \lor \text{lng} \le \text{maxLng}$

```typescript
import { Tempo } from '@magmacomputing/tempo';
import { GeoPlugin } from '@magmacomputing/tempo-plugin-geo';

Tempo.use(GeoPlugin);

// Fiji archipelago bounding box crossing the 180° antimeridian
const fijiBox = {
  minLat: -19.5,
  maxLat: -15.5,
  minLng: 177.0,  // 177° East
  maxLng: -178.0  // 178° West
};

// Points inside the antimeridian box
const pointEast = { lat: -17.8, lng: 179.5 };   // In East longitude
const pointWest = { lat: -17.8, lng: -179.5 };  // In West longitude
const pointOutside = { lat: -17.8, lng: 170.0 };

console.log(Tempo.geo.inBoundingBox(pointEast, fijiBox));    // true
console.log(Tempo.geo.inBoundingBox(pointWest, fijiBox));    // true
console.log(Tempo.geo.inBoundingBox(pointOutside, fijiBox)); // false
```
