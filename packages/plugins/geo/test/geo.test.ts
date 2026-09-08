import { Tempo } from '@magmacomputing/tempo';
import {
	GeoPlugin,
	geoLookup,
	resolveGeoCoordinates,
	coerceGeo,
	serverGeoLocation,
	stashGeo,
	clearStashedGeo,
	getStashedGeo,
} from '../src/index.js';

describe('Tempo Plugin: Geo', () => {
	beforeAll(() => {
		Tempo.use(GeoPlugin);
	});

	beforeEach(() => {
		clearStashedGeo();
	});

	afterEach(() => {
		vi.restoreAllMocks();
		clearStashedGeo();
	});

	describe('Pure functional coordinate utilities', () => {
		it('should coerce various coordinate input formats', () => {
			expect(coerceGeo({ lat: -33.8688, lng: 151.2093 })).toEqual({
				latitude: -33.8688,
				longitude: 151.2093,
			});

			expect(coerceGeo({ latitude: 40.7128, longitude: -74.006 })).toEqual({
				latitude: 40.7128,
				longitude: -74.006,
			});

			expect(coerceGeo(undefined)).toBeUndefined();
			expect(coerceGeo(null)).toBeUndefined();
		});

		it('should resolve coordinates directly from Tempo instance config', async () => {
			const t = new Tempo('2026-06-21T12:00:00Z', {
				geo: { lat: 51.5074, lng: -0.1278 },
			});

			const coords = await resolveGeoCoordinates(t);
			expect(coords).toEqual({
				lat: 51.5074,
				lng: -0.1278,
			});
		});

		it('should perform mocked server geolocation via serverGeoLocation', async () => {
			const mockPayload = {
				ip: '8.8.8.8',
				success: true,
				lat: 37.4223,
				lon: -122.0848,
				country: 'United States',
				city: 'Mountain View',
				timezone: 'America/Los_Angeles',
			};

			vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
				new Response(JSON.stringify(mockPayload), { status: 200 })
			);

			const result = await serverGeoLocation();
			expect(result.status).toBe('success');
			expect(result.lat).toBe(37.4223);
			expect(result.lng).toBe(-122.0848);
			expect(result.city).toBe('Mountain View');
		});

		it('should perform mocked geoLookup on server', async () => {
			const mockPayload = {
				ip: '1.1.1.1',
				success: true,
				lat: -33.8688,
				lon: 151.2093,
				country: 'Australia',
				city: 'Sydney',
				timezone: 'Australia/Sydney',
			};

			vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
				new Response(JSON.stringify(mockPayload), { status: 200 })
			);

			const result = await geoLookup();
			expect(result.lat).toBe(-33.8688);
			expect(result.lng).toBe(151.2093);
		});
	});

	describe('Tempo OOP Integration via GeoPlugin', () => {
		it('should attach Tempo.geo namespace with utilities', () => {
			expect(typeof Tempo.geo).toBe('object');
			expect(typeof Tempo.geo.lookup).toBe('function');
			expect(typeof Tempo.geo.resolve).toBe('function');
			expect(typeof Tempo.geo.coerce).toBe('function');
			expect(typeof Tempo.geo.stash).toBe('function');
			expect(typeof Tempo.geo.clear).toBe('function');
			expect(typeof Tempo.geo.get).toBe('function');
			expect(typeof Tempo.geo.server).toBe('function');
			expect(typeof Tempo.geo.browser).toBe('function');
			expect(Tempo.geo.current).toBeUndefined();
		});

		it('should ensure Tempo.geo is a locked-down, frozen, non-writable object', () => {
			expect(Object.isFrozen(Tempo.geo)).toBe(true);
			expect(() => {
				(Tempo as any).geo = {};
			}).toThrow();
			expect(() => {
				(Tempo.geo as any).lookup = () => {};
			}).toThrow();
		});

		it('should allow instance method .geoLookup() to resolve coordinates', async () => {
			const t = new Tempo('2026-01-01', {
				geo: { latitude: 35.6762, longitude: 139.6503 },
			});

			const coords = await t.geoLookup();
			expect(coords).toEqual({
				lat: 35.6762,
				lng: 139.6503,
			});
		});

		it('should allow instance method .geoLocate() to return a new Tempo instance with geo set', async () => {
			const t = new Tempo('2026-01-01');
			expect(t.geo).toBeUndefined();

			const mockPayload = {
				ip: '1.1.1.1',
				success: true,
				lat: 48.8566,
				lon: 2.3522,
			};

			vi.spyOn(globalThis, 'fetch').mockImplementation(
				() => Promise.resolve(new Response(JSON.stringify(mockPayload), { status: 200 }))
			);

			const located = await t.geoLocate();
			expect(located).toBeInstanceOf(Tempo);
			expect(located.geo).toBeDefined();
			expect(located.geo?.latitude).toBe(48.8566);
			expect(located.geo?.longitude).toBe(2.3522);
		});

		it('should preserve existing geo properties (elevation, sphere, custom keys) when calling .geoLocate()', async () => {
			const t = new Tempo('2026-01-01', {
				geo: {
					elevation: 150,
					sphere: 'south',
					city: 'Sydney',
					customKey: 'customValue',
				} as any,
			});

			const mockPayload = {
				ip: '1.1.1.1',
				success: true,
				lat: -33.8688,
				lon: 151.2093,
			};

			vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
				new Response(JSON.stringify(mockPayload), { status: 200 })
			);

			const located = await t.geoLocate();
			expect(located.geo?.latitude).toBe(-33.8688);
			expect(located.geo?.longitude).toBe(151.2093);
			expect((located.geo as any)?.elevation).toBe(150);
			expect((located.geo as any)?.sphere).toBe('south');
			expect((located.geo as any)?.city).toBe('Sydney');
			expect((located.geo as any)?.customKey).toBe('customValue');
		});
	});

	describe('Geo Stashing and Caching with BoundedCache', () => {
		it('should provide stash, clear, get, and current on Tempo.geo', () => {
			expect(typeof Tempo.geo.stash).toBe('function');
			expect(typeof Tempo.geo.clear).toBe('function');
			expect(typeof Tempo.geo.get).toBe('function');
			Tempo.geo.stash({ latitude: -33.8688, longitude: 151.2093, city: 'Sydney' });
			expect(Tempo.geo.current).toEqual({
				latitude: -33.8688,
				longitude: 151.2093,
				city: 'Sydney',
			});
			Tempo.geo.clear();
			expect(Tempo.geo.current).toBeUndefined();
		});

		it('should cache geoLookup results and bypass with { refresh: true }', async () => {
			const mockFetch = vi.spyOn(globalThis, 'fetch').mockImplementation(() =>
				Promise.resolve(
					new Response(
						JSON.stringify({
							ip: '1.2.3.4',
							success: true,
							lat: 34.0522,
							lon: -118.2437,
							city: 'Los Angeles',
							country: 'United States',
						}),
						{ status: 200 }
					)
				)
			);

			const first = await geoLookup();
			expect(first.lat).toBe(34.0522);
			expect(mockFetch).toHaveBeenCalledTimes(1);

			// Second lookup should be served from BoundedCache (zero network calls)
			const cached = await geoLookup();
			expect(cached.lat).toBe(34.0522);
			expect(mockFetch).toHaveBeenCalledTimes(1);

			// Calling with { refresh: true } should bypass cache
			const refreshed = await geoLookup({ refresh: true });
			expect(refreshed.lat).toBe(34.0522);
			expect(mockFetch).toHaveBeenCalledTimes(2);
		});

		it('should allow manual stashGeo and clearStashedGeo with multi-tenant isolation', () => {
			stashGeo({ latitude: 51.5074, longitude: -0.1278, city: 'London' }, undefined, 'tenant-uk');
			stashGeo({ latitude: 48.8566, longitude: 2.3522, city: 'Paris' }, undefined, 'tenant-fr');

			expect(getStashedGeo('tenant-uk')).toEqual({
				latitude: 51.5074,
				longitude: -0.1278,
				city: 'London',
			});
			expect(getStashedGeo('tenant-fr')).toEqual({
				latitude: 48.8566,
				longitude: 2.3522,
				city: 'Paris',
			});

			clearStashedGeo('tenant-uk');
			expect(getStashedGeo('tenant-uk')).toBeUndefined();
			expect(getStashedGeo('tenant-fr')).toBeDefined();
		});

		it('should perform lookup via Tempo.geo.lookup() and update Tempo.geo.current', async () => {
			const mockPayload = {
				ip: '9.9.9.9',
				success: true,
				lat: -37.8136,
				lon: 144.9631,
				city: 'Melbourne',
				country: 'Australia',
			};

			vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
				new Response(JSON.stringify(mockPayload), { status: 200 })
			);

			const result = await Tempo.geo.lookup();
			expect(result.lat).toBe(-37.8136);
			expect(result.lng).toBe(144.9631);
			expect(result.city).toBe('Melbourne');
			expect(Tempo.geo.current?.city).toBe('Melbourne');
		});
	});
});
