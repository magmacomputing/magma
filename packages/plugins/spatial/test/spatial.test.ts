import { Tempo } from '@magmacomputing/tempo';
import { isFunction, isObject } from '@magmacomputing/library';
import {
	SpatialPlugin,
	haversineDistance,
	calculateBearing,
	calculateMidpoint,
	calculateVelocity,
	isImpossibleTravel,
	isWithin,
	inBoundingBox,
	solarOffset,
	resolveCulturalLocale,
} from '../src/index.js';

describe('Tempo Plugin: Spatial', () => {
	beforeAll(() => {
		Tempo.use(SpatialPlugin);
	});

	describe('Static Tempo.spatial Namespace', () => {
		it('should attach deep-frozen Tempo.spatial namespace', () => {
			expect(isObject(Tempo.spatial)).toBe(true);
			expect(Object.isFrozen(Tempo.spatial)).toBe(true);

			expect(isFunction(Tempo.spatial.distance)).toBe(true);
			expect(isFunction(Tempo.spatial.bearing)).toBe(true);
			expect(isFunction(Tempo.spatial.midpoint)).toBe(true);
			expect(isFunction(Tempo.spatial.velocity)).toBe(true);
			expect(isFunction(Tempo.spatial.isImpossibleTravel)).toBe(true);
			expect(isFunction(Tempo.spatial.isWithin)).toBe(true);
			expect(isFunction(Tempo.spatial.inBoundingBox)).toBe(true);
			expect(isFunction(Tempo.spatial.solarOffset)).toBe(true);

			expect(() => {
				(Tempo as any).spatial = {};
			}).toThrow();

			expect(() => {
				(Tempo.spatial as any).distance = () => 0;
			}).toThrow();
		});

		it('should compute Great-Circle distance via Tempo.spatial.distance', () => {
			const sf = { lat: 37.7749, lng: -122.4194 };
			const nyc = { lat: 40.7128, lng: -74.006 };

			const km = Tempo.spatial.distance(sf, nyc);
			expect(km).toBeCloseTo(4129, -1);

			const miles = Tempo.spatial.distance(sf, nyc, 'miles');
			expect(miles).toBeCloseTo(2565.7, 0);

			const meters = Tempo.spatial.distance(sf, nyc, 'm');
			expect(meters).toBeCloseTo(4129051, -2);
		});

		it('should compute initial compass bearing via Tempo.spatial.bearing', () => {
			const london = { lat: 51.5074, lng: -0.1278 };
			const paris = { lat: 48.8566, lng: 2.3522 };

			const bearing = Tempo.spatial.bearing(london, paris);
			expect(bearing).toBeGreaterThanOrEqual(148);
			expect(bearing).toBeLessThanOrEqual(150);
		});

		it('should compute geographic midpoint via Tempo.spatial.midpoint', () => {
			const sydney = { lat: -33.8688, lng: 151.2093 };
			const melbourne = { lat: -37.8136, lng: 144.9631 };

			const mid = Tempo.spatial.midpoint(sydney, melbourne);
			expect(mid).toBeDefined();
			expect(mid?.latitude).toBeLessThan(0);
			expect(mid?.longitude).toBeGreaterThan(140);
			expect(mid?.sphere).toBe('south');
		});

		it('should compute travel velocity via Tempo.spatial.velocity', () => {
			const t1 = new Tempo('2026-06-01T10:00:00Z', { geo: { lat: 51.5074, lng: -0.1278 } });
			const t2 = new Tempo('2026-06-01T11:00:00Z', { geo: { lat: 48.8566, lng: 2.3522 } });

			const speedKmH = Tempo.spatial.velocity(t1, t2, { unit: 'km' });
			expect(speedKmH).toBeGreaterThan(300);
			expect(speedKmH).toBeLessThan(400);

			const speedMph = Tempo.spatial.velocity(t1, t2, { unit: 'miles' });
			expect(speedMph).toBeGreaterThan(200);
			expect(speedMph).toBeLessThan(250);
		});

		it('should detect impossible travel anomalies via Tempo.spatial.isImpossibleTravel', () => {
			const tLondon = new Tempo('2026-06-01T10:00:00Z', { geo: { lat: 51.5074, lng: -0.1278 } });
			const tTokyo10m = new Tempo('2026-06-01T10:10:00Z', { geo: { lat: 35.6762, lng: 139.6503 } });
			const tParis2h = new Tempo('2026-06-01T12:00:00Z', { geo: { lat: 48.8566, lng: 2.3522 } });

			// London -> Tokyo in 10 minutes = Impossible travel
			expect(Tempo.spatial.isImpossibleTravel(tLondon, tTokyo10m)).toBe(true);

			// London -> Paris in 2 hours = Plausible travel
			expect(Tempo.spatial.isImpossibleTravel(tLondon, tParis2h)).toBe(false);
		});

		it('should evaluate proximity via Tempo.spatial.isWithin', () => {
			const sf = { lat: 37.7749, lng: -122.4194 };
			const oakland = { lat: 37.8044, lng: -122.2712 };
			const tokyo = { lat: 35.6762, lng: 139.6503 };

			expect(Tempo.spatial.isWithin(sf, oakland, 25, 'km')).toBe(true);
			expect(Tempo.spatial.isWithin(sf, tokyo, 100, 'km')).toBe(false);
		});

		it('should evaluate bounding box inclusion via Tempo.spatial.inBoundingBox', () => {
			const bbox = { minLat: 37.0, maxLat: 38.0, minLng: -123.0, maxLng: -122.0 };
			const inside = { lat: 37.7749, lng: -122.4194 };
			const outside = { lat: 40.7128, lng: -74.006 };

			expect(Tempo.spatial.inBoundingBox(inside, bbox)).toBe(true);
			expect(Tempo.spatial.inBoundingBox(outside, bbox)).toBe(false);
		});

		it('should compute solar noon offset via Tempo.spatial.solarOffset', () => {
			const coords = { lat: 48.8584, lng: 2.2945, timezone: 'Europe/Paris' };
			const offsetMinutes = Tempo.spatial.solarOffset(coords, { unit: 'mi', date: '2026-01-01T12:00:00Z' });
			// Paris at longitude ~2.29° with UTC+1 standard time: offset is approx (2.29 - 15) * 4 = -50.82 min
			expect(offsetMinutes).toBeCloseTo(-50.82, 0);

			const offsetHours = Tempo.spatial.solarOffset(coords, { unit: 'hh', date: '2026-01-01T12:00:00Z' });
			expect(offsetHours).toBeCloseTo(-0.85, 1);
		});
	});

	describe('Functional Exports Re-exported from Module', () => {
		it('should export all pure GIS functions directly from module root', () => {
			expect(isFunction(haversineDistance)).toBe(true);
			expect(isFunction(calculateBearing)).toBe(true);
			expect(isFunction(calculateMidpoint)).toBe(true);
			expect(isFunction(calculateVelocity)).toBe(true);
			expect(isFunction(isImpossibleTravel)).toBe(true);
			expect(isFunction(isWithin)).toBe(true);
			expect(isFunction(inBoundingBox)).toBe(true);
			expect(isFunction(solarOffset)).toBe(true);
			expect(isFunction(resolveCulturalLocale)).toBe(true);
		});

		it('should resolve cultural locale via resolveCulturalLocale', () => {
			expect(resolveCulturalLocale('en-US', 'AU')).toBe('en-AU');
			expect(resolveCulturalLocale('en-US', 'FR', 'native')).toBe('fr-FR');
			expect(resolveCulturalLocale('en-US', 'JP', 'native')).toBe('ja-JP');
			expect(resolveCulturalLocale('en-US', 'UNKNOWN_COUNTRY' as any)).toBeUndefined();
		});
	});

	describe('Fluent OOP Instance Methods on Tempo.prototype', () => {
		const sf = new Tempo('2026-06-01T12:00:00Z', {
			geo: { latitude: 37.7749, longitude: -122.4194 },
		});
		const nyc = new Tempo('2026-06-01T18:00:00Z', {
			geo: { latitude: 40.7128, longitude: -74.006 },
		});

		it('should calculate distance from instance via t.spatialDistance()', () => {
			const km = sf.spatialDistance(nyc);
			expect(km).toBeCloseTo(4129, -1);

			const miles = sf.spatialDistance(nyc, 'miles');
			expect(miles).toBeCloseTo(2565.7, 0);
		});

		it('should compute bearing from instance via t.spatialBearing()', () => {
			const bearing = sf.spatialBearing(nyc);
			expect(bearing).toBeGreaterThan(60);
			expect(bearing).toBeLessThan(75);
		});

		it('should calculate velocity between instances via t.spatialVelocity()', () => {
			// SF to NYC in 6 hours (~4129 km / 6h = ~688 km/h)
			const speed = sf.spatialVelocity(nyc, { unit: 'km' });
			expect(speed).toBeCloseTo(688, -1);
		});

		it('should calculate solar offset for instance via t.spatialSolarOffset()', () => {
			const offsetMinutes = sf.spatialSolarOffset({ unit: 'mi', timeZone: 'UTC' });
			// -122.4194° * 4 min/deg = ~ -489.68 minutes
			expect(Number.isFinite(offsetMinutes)).toBe(true);
			expect(offsetMinutes).toBeCloseTo(-489.68, 0);
		});

		it('should evaluate proximity from instance via t.isWithin()', () => {
			const oakland = { latitude: 37.8044, longitude: -122.2712 };
			expect(sf.isWithin(oakland, 30, 'km')).toBe(true);
			expect(sf.isWithin(nyc, 100, 'km')).toBe(false);
		});

		it('should evaluate bounding box inclusion from instance via t.inBoundingBox()', () => {
			const bbox = { minLat: 36, maxLat: 39, minLng: -124, maxLng: -121 };
			expect(sf.inBoundingBox(bbox)).toBe(true);

			const outsideBbox = { minLat: 10, maxLat: 20, minLng: 10, maxLng: 20 };
			expect(sf.inBoundingBox(outsideBbox)).toBe(false);
		});
	});

	describe('Auto-Install Entry Point and Edge Cases', () => {
		it('should handle invalid coordinate inputs gracefully across methods', () => {
			const invalid = new Tempo('2026-01-01');

			expect(Number.isNaN(Tempo.spatial.distance(null, null))).toBe(true);
			expect(Number.isNaN(Tempo.spatial.bearing(null, null))).toBe(true);
			expect(Number.isNaN(Tempo.spatial.velocity(null, null))).toBe(true);
			expect(Number.isNaN(Tempo.spatial.solarOffset(null))).toBe(true);
			expect(Tempo.spatial.isWithin(null, null, 10)).toBe(false);
			expect(Tempo.spatial.inBoundingBox(null, { minLat: 0, maxLat: 10, minLng: 0, maxLng: 10 })).toBe(false);

			expect(Number.isNaN(invalid.spatialDistance({ lat: 10, lng: 10 }))).toBe(true);
			expect(Number.isNaN(invalid.spatialBearing({ lat: 10, lng: 10 }))).toBe(true);
			expect(Number.isNaN(invalid.spatialVelocity({ lat: 10, lng: 10 }))).toBe(true);
			expect(Number.isNaN(invalid.spatialSolarOffset())).toBe(true);
			expect(invalid.isWithin({ lat: 10, lng: 10 }, 10)).toBe(false);
			expect(invalid.inBoundingBox({ minLat: 0, maxLat: 10, minLng: 0, maxLng: 10 })).toBe(false);
		});
	});
});
