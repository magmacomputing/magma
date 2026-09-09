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
	haversineDistance,
	solarOffset,
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
		it('should coerce various coordinate input formats with 3-decimal precision and sphere inference', () => {
			expect(coerceGeo({ lat: -33.8688, lng: 151.2093 })).toEqual({
				latitude: -33.869,
				longitude: 151.209,
				sphere: 'south',
			});

			expect(coerceGeo({ latitude: 40.7128, longitude: -74.006 })).toEqual({
				latitude: 40.713,
				longitude: -74.006,
				sphere: 'north',
			});

			// Equator boundary band
			expect(coerceGeo({ lat: 0.0005, lng: 100 })).toEqual({
				latitude: 0.001,
				longitude: 100,
				sphere: 'equator',
			});

			expect(coerceGeo(undefined)).toBeUndefined();
			expect(coerceGeo(null)).toBeUndefined();
		});

		it('should resolve coordinates directly from Tempo instance config', async () => {
			const t = new Tempo('2026-06-21T12:00:00Z', {
				geo: { lat: 51.5074, lng: -0.1278 },
			});

			const coords = await resolveGeoCoordinates(t);
			expect(coords).toMatchObject({
				lat: 51.507,
				lng: -0.128,
				sphere: 'north',
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

		it('should perform mocked geoLookup on server with 3-decimal rounding', async () => {
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
			expect(result.lat).toBe(-33.869);
			expect(result.lng).toBe(151.209);
			expect(result.sphere).toBe('south');
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
			expect(coords).toMatchObject({
				lat: 35.676,
				lng: 139.65,
				sphere: 'north',
			});
		});

		it('should allow instance method .geoLocate() to return a new Tempo instance with full context sync', async () => {
			const t = new Tempo('2026-01-01T12:00:00Z');
			expect(t.geo).toBeUndefined();

			const mockPayload = {
				ip: '1.1.1.1',
				success: true,
				lat: 48.8566,
				lon: 2.3522,
				city: 'Paris',
				country: 'France',
				timezone: 'Europe/Paris',
			};

			vi.spyOn(globalThis, 'fetch').mockImplementation(
				() => Promise.resolve(new Response(JSON.stringify(mockPayload), { status: 200 }))
			);

			const located = await t.geoLocate();
			expect(located).toBeInstanceOf(Tempo);
			expect(located.geo).toBeDefined();
			expect(located.geo?.latitude).toBe(48.857);
			expect(located.geo?.longitude).toBe(2.352);
			expect(located.geo?.city).toBe('Paris');
			expect(located.geo?.country).toBe('France');
			expect(located.geo?.sphere).toBe('north');
			expect(located.tz).toBe('Europe/Paris');
			expect(located.sphere).toBe('north');
		});

		it('should preserve custom non-geo keys while physical reality (Option B) updates location', async () => {
			const t = new Tempo('2026-01-01', {
				geo: {
					elevation: 150,
					city: 'OldCity',
					customKey: 'customValue',
					venue: 'Harbour',
				} as any,
			});

			const mockPayload = {
				ip: '1.1.1.1',
				success: true,
				lat: -33.8688,
				lon: 151.2093,
				city: 'Sydney',
				country: 'Australia',
				timezone: 'Australia/Sydney',
			};

			vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
				new Response(JSON.stringify(mockPayload), { status: 200 })
			);

			const located = await t.geoLocate();
			expect(located.geo?.latitude).toBe(-33.869);
			expect(located.geo?.longitude).toBe(151.209);
			expect((located.geo as any)?.elevation).toBe(150);
			expect(located.geo?.city).toBe('Sydney'); // Option B: fresh city overwrites OldCity
			expect(located.geo?.country).toBe('Australia');
			expect(located.geo?.sphere).toBe('south');
			expect((located.geo as any)?.customKey).toBe('customValue'); // Custom non-geo keys preserved
			expect((located.geo as any)?.venue).toBe('Harbour');
			expect(located.tz).toBe('Australia/Sydney');
		});

		it('should allow call-site overrides (Option C) to win over network reality', async () => {
			const t = new Tempo('2026-01-01T12:00:00Z');

			const mockPayload = {
				ip: '8.8.8.8',
				success: true,
				lat: 37.4223,
				lon: -122.0848,
				city: 'Mountain View',
				country: 'United States',
				timezone: 'America/Los_Angeles',
			};

			vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
				new Response(JSON.stringify(mockPayload), { status: 200 })
			);

			// Call-site override: specify custom country and city
			const located = await t.geoLocate({ country: 'GB', city: 'London' });
			expect(located.geo?.country).toBe('GB'); // Option C wins
			expect(located.geo?.city).toBe('London'); // Option C wins
			expect(located.geo?.latitude).toBe(37.422);
			expect(located.geo?.longitude).toBe(-122.085);
		});

		it('should support setTimezone: false opt-out to retain original timezone', async () => {
			const t = new Tempo('2026-01-01T12:00:00Z', { timeZone: 'UTC' });

			const mockPayload = {
				ip: '1.1.1.1',
				success: true,
				lat: 35.6762,
				lon: 139.6503,
				city: 'Tokyo',
				country: 'Japan',
				timezone: 'Asia/Tokyo',
			};

			vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
				new Response(JSON.stringify(mockPayload), { status: 200 })
			);

			const located = await t.geoLocate({ setTimezone: false });
			expect(located.tz).toBe('UTC'); // Original tz preserved
			expect(located.geo?.latitude).toBe(35.676);
			expect(located.geo?.city).toBe('Tokyo');
			expect(located.geo?.timezone).toBe('Asia/Tokyo');
		});
	});

	describe('Geo Stashing and Caching with BoundedCache', () => {
		it('should provide stash, clear, get, and current on Tempo.geo', () => {
			expect(typeof Tempo.geo.stash).toBe('function');
			expect(typeof Tempo.geo.clear).toBe('function');
			expect(typeof Tempo.geo.get).toBe('function');
			Tempo.geo.stash({ latitude: -33.8688, longitude: 151.2093, city: 'Sydney' });
			expect(Tempo.geo.current).toEqual({
				latitude: -33.869,
				longitude: 151.209,
				sphere: 'south',
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
			expect(first.lat).toBe(34.052);
			expect(mockFetch).toHaveBeenCalledTimes(1);

			// Second lookup should be served from BoundedCache (zero network calls)
			const cached = await geoLookup();
			expect(cached.lat).toBe(34.052);
			expect(mockFetch).toHaveBeenCalledTimes(1);

			// Calling with { refresh: true } should bypass cache
			const refreshed = await geoLookup({ refresh: true });
			expect(refreshed.lat).toBe(34.052);
			expect(mockFetch).toHaveBeenCalledTimes(2);
		});

		it('should allow manual stashGeo and clearStashedGeo with multi-tenant isolation', () => {
			stashGeo({ latitude: 51.5074, longitude: -0.1278, city: 'London' }, undefined, 'tenant-uk');
			stashGeo({ latitude: 48.8566, longitude: 2.3522, city: 'Paris' }, undefined, 'tenant-fr');

			expect(getStashedGeo('tenant-uk')).toEqual({
				latitude: 51.507,
				longitude: -0.128,
				sphere: 'north',
				city: 'London',
			});
			expect(getStashedGeo('tenant-fr')).toEqual({
				latitude: 48.857,
				longitude: 2.352,
				sphere: 'north',
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
			expect(result.lat).toBe(-37.814);
			expect(result.lng).toBe(144.963);
			expect(result.city).toBe('Melbourne');
			expect(Tempo.geo.current?.city).toBe('Melbourne');
		});
	});

	describe('Great-Circle Distance & Layout Formatting', () => {
		const sydney = new Tempo('2026-10-24T10:00:00', {
			timeZone: 'Australia/Sydney',
			geo: {
				latitude: -33.8688,
				longitude: 151.2093,
				city: 'sydney',
				country: 'au',
				sphere: 'south',
				elevation: 42,
				timezone: 'Australia/Sydney',
			},
		});

		const melbourne = new Tempo('2026-10-24T12:00:00', {
			timeZone: 'Australia/Melbourne',
			geo: {
				latitude: -37.8136,
				longitude: 144.9631,
				city: 'melbourne',
				country: 'au',
				sphere: 'south',
				timezone: 'Australia/Melbourne',
			},
		});

		it('should calculate distance via pure haversineDistance function', () => {
			const dist = haversineDistance(sydney, melbourne, 'km');
			expect(dist).toBe(713.426);
		});

		it('should calculate distance via Tempo.geo.distance static method', () => {
			const km = Tempo.geo.distance(sydney, melbourne, 'km');
			expect(km).toBe(713.426);

			const miles = Tempo.geo.distance(sydney, melbourne, 'miles');
			expect(miles).toBe(443.303);

			const meters = Tempo.geo.distance(sydney, melbourne, 'm');
			expect(meters).toBe(713426);
		});

		it('should calculate distance via instance method t.geoDistance()', () => {
			const km = sydney.geoDistance(melbourne, 'km');
			expect(km).toBe(713.426);

			const miles = sydney.geoDistance(melbourne, 'miles');
			expect(miles).toBe(443.303);
		});

		it('should detect velocity / impossible travel between timestamped instances', () => {
			const km = sydney.geoDistance(melbourne, 'km');
			const hours = sydney.until(melbourne, 'hours');
			expect(hours).toBe(2);

			const speedKmH = km / hours;
			expect(speedKmH).toBeCloseTo(356.713, 2);
		});

		it('should format geographic layout tokens with modifiers and fallback on geo-enabled instances', () => {
			const formatted = sydney.format('{geo.city:title}, {geo.country:upper} ({geo.sphere}) @ {h12}:{mi} {mer}');
			expect(formatted).toBe('Sydney, AU (south) @ 10:00 am');

			// Missing custom token cleanly returns empty string
			expect(sydney.format('{geo.venue}')).toBe('');
		});

		it('should calculate natural solar time offset via Tempo.geo.solarOffset and t.geoSolarOffset()', () => {
			// Sydney on October 24 observes AEDT (UTC+11, meridian 165°) -> (151.209 - 165) * 4 = -55.16 min
			const dstOffset = sydney.geoSolarOffset();
			expect(dstOffset).toBe(-55.16);

			// Sydney on standard time June 21 observes AEST (UTC+10, meridian 150°) -> (151.209 - 150) * 4 = +4.84 min
			const staticOffset = Tempo.geo.solarOffset(sydney, { date: '2026-06-21T12:00:00Z' });
			expect(staticOffset).toBe(4.84);

			const instanceOffset = sydney.geoSolarOffset({ date: '2026-06-21T12:00:00Z' });
			expect(instanceOffset).toBe(4.84);

			// Unit conversions on standard time
			expect(sydney.geoSolarOffset({ date: '2026-06-21T12:00:00Z', unit: 'seconds' })).toBe(290.16);
			expect(sydney.geoSolarOffset({ date: '2026-06-21T12:00:00Z', unit: 'hours', precision: 3 })).toBe(0.081);

			// Apparent solar time on June 21 (incorporating Equation of Time: ~ -1.33 min)
			const apparent = sydney.geoSolarOffset({ date: '2026-06-21T12:00:00Z', apparent: true });
			expect(typeof apparent).toBe('number');
			expect(apparent).toBe(3.51);
		});
	});
});
