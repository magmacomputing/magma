# Spatial & Geodesy Utilities
This directory contains pure spatial navigation, geodesic distance, velocity, and geolocation utilities built on high-precision spherical trigonometry and WGS-84 reference geometry.

## Exported Functions

### `haversineDistance`
Calculates the Great-Circle surface distance between two geographic coordinates using the Haversine formula.

```typescript
function haversineDistance(
  coord1: CoordinateInput, 
  coord2: CoordinateInput, 
  unit?: DistanceUnit
): number;
```
**Example:**
```typescript
import { haversineDistance } from '@magmacomputing/tempo-fns';

const nyc = { lat: 40.7128, lng: -74.006 };
const london = { lat: 51.5074, lng: -0.1278 };

const km = haversineDistance(nyc, london, 'km'); // ~5570.22 km
const miles = haversineDistance(nyc, london, 'miles'); // ~3461.17 miles
```

### `calculateBearing`
Calculates the initial forward azimuth/bearing (0°–360°) from an origin point toward a destination point.

```typescript
function calculateBearing(
  start: CoordinateInput, 
  end: CoordinateInput, 
  options?: BearingOptions
): number;
```
**Example:**
```typescript
import { calculateBearing } from '@magmacomputing/tempo-fns';

const bearing = calculateBearing({ lat: 0, lng: 0 }, { lat: 0, lng: 10 });
console.log(bearing); // 90 (due East)
```

### `calculateDestination`
Computes the destination coordinate given an initial starting point, bearing/heading, and travel distance (Great-Circle forward projection dead reckoning).

```typescript
function calculateDestination(
  start: CoordinateInput,
  distance: number,
  bearing: number,
  unit: DistanceUnit = 'km'
): { lat: number; lng: number; elevation: number };
```
**Example:**
```typescript
import { calculateDestination } from '@magmacomputing/tempo-fns';

const start = { lat: 0, lng: 0 };
const dest = calculateDestination(start, 111.195, 0, 'km'); // Travel 1° North
console.log(dest.lat); // ~1.0
console.log(dest.lng); // ~0.0
```

### `calculateMidpoint`
Finds the geographic midpoint (halfway coordinate along the Great Circle arc) between two coordinates.

```typescript
function calculateMidpoint(
  coord1: CoordinateInput, 
  coord2: CoordinateInput
): { lat: number; lng: number; elevation: number };
```
**Example:**
```typescript
import { calculateMidpoint } from '@magmacomputing/tempo-fns';

const mid = calculateMidpoint({ lat: 0, lng: 0 }, { lat: 0, lng: 90 });
console.log(mid.lng); // 45
```

### `calculateVelocity`
Calculates speed and velocity vectors between two timestamped spatial points.

```typescript
function calculateVelocity(
  from: CoordinateInput | any,
  to: CoordinateInput | any,
  options?: VelocityOptions | DistanceUnit
): number;
```
**Example:**
```typescript
import { calculateVelocity } from '@magmacomputing/tempo-fns';

const speed = calculateVelocity(
  { lat: 40.7128, lng: -74.006, timestamp: 1700000000000 },
  { lat: 42.3601, lng: -71.0589, timestamp: 1700007200000 },
  { unit: 'km', timeUnit: 'hh' }
);
console.log(`${speed} km/h`);
```

### `closestCoordinate`
Identifies the geographically nearest coordinate from an array of target points relative to a reference coordinate.

```typescript
function closestCoordinate(
  origin: CoordinateInput,
  candidates: readonly CoordinateInput[],
  unit: DistanceUnit = 'km'
): ClosestCoordinateResult | undefined;
```
**Example:**
```typescript
import { closestCoordinate } from '@magmacomputing/tempo-fns';

const origin = { lat: 40.7128, lng: -74.006 }; // NYC
const candidates = [
  { lat: 51.5074, lng: -0.1278 }, // London
  { lat: 38.9072, lng: -77.0369 }, // Washington DC
  { lat: 34.0522, lng: -118.2437 } // Los Angeles
];

const nearest = closestCoordinate(origin, candidates);
console.log(nearest?.index); // 1 (Washington DC)
```

### `isImpossibleTravel`
Security and fraud detection utility that flags physically impossible travel between consecutive user events based on a maximum realistic speed threshold (default: 900 km/h for commercial aviation).

```typescript
function isImpossibleTravel(
  event1: CoordinateInput & { time: Date | number | string },
  event2: CoordinateInput & { time: Date | number | string },
  options?: ImpossibleTravelOptions
): boolean;
```
**Example:**
```typescript
import { isImpossibleTravel } from '@magmacomputing/tempo-fns';

const loginNYC = { lat: 40.7128, lng: -74.006, time: '2026-10-01T12:00:00Z' };
const loginTokyo = { lat: 35.6762, lng: 139.6503, time: '2026-10-01T13:00:00Z' };

if (isImpossibleTravel(loginNYC, loginTokyo)) {
  console.warn('Suspicious activity: Impossible travel detected!');
}
```

### `isWithin` & `inBoundingBox`
Geofencing utilities to determine if a point is within a circular radius or rectangular geographic bounding box.

```typescript
function isWithin(point: CoordinateInput, center: CoordinateInput, radius: number, unit?: DistanceUnit): boolean;
function inBoundingBox(point: CoordinateInput, box: BoundingBox): boolean;
```

### `solarOffset`
Calculates true local solar time difference (in minutes or hours) relative to UTC or standard timezone meridian based on longitude ($4\text{ min per }1^\circ\text{ longitude}$).

```typescript
function solarOffset(lng: number, options?: SolarOffsetOptions): number;
```

### `resolveCulturalLocale`
Resolves cultural locale defaults, preferred weekend schedules, and first-day-of-week rules based on country codes or geographic coordinates.

```typescript
function resolveCulturalLocale(countryOrLocale: string): { locale: string; firstDayOfWeek: number; weekendDays: number[] };
```
