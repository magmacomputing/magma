import {
	coerceGeo,
	geoLookup,
	resolveGeoCoordinates,
	getStashedGeo,
	stashGeo,
	clearStashedGeo,
	haversineDistance,
	solarOffset,
	calculateBearing,
	calculateMidpoint,
	calculateVelocity,
	isImpossibleTravel,
} from '../../../src/common/runtime/mapper.library.js';
import { setStorage, clearStorage } from '#library/storage.library.js';

describe('common/runtime/mapper.library', () => {
	beforeEach(() => {
		clearStorage();
	});

	afterEach(() => {
		vi.unstubAllGlobals();
		clearStorage();
	});

	it('resolveGeoCoordinates extracts coordinates synchronously if present', async () => {
		const coords = await resolveGeoCoordinates({ latitude: -33.8688, longitude: 151.2093 });
		expect(coords).toMatchObject({ lat: -33.869, lng: 151.209, sphere: 'south' });
	});

	it('resolveGeoCoordinates extracts coordinates from config sub-object', async () => {
		const coords = await resolveGeoCoordinates({ config: { lat: 40.7128, lng: -74.0060 } });
		expect(coords).toMatchObject({ lat: 40.713, lng: -74.006, sphere: 'north' });
	});

	it('enforces coordinate boundary validation in coerceGeo', () => {
		// Valid boundary edges
		expect(coerceGeo({ lat: 90, lng: 180 })).toMatchObject({ latitude: 90, longitude: 180 });
		expect(coerceGeo({ lat: -90, lng: -180 })).toMatchObject({ latitude: -90, longitude: -180 });

		// Out of bounds latitude (> 90 or < -90) is excluded
		expect(coerceGeo({ lat: 90.001, lng: 0 })?.latitude).toBeUndefined();
		expect(coerceGeo({ lat: -90.001, lng: 0 })?.latitude).toBeUndefined();
		expect(coerceGeo({ lat: 100 })).toBeUndefined();

		// Out of bounds longitude (> 180 or < -180) is excluded
		expect(coerceGeo({ lat: 0, lng: 180.001 })?.longitude).toBeUndefined();
		expect(coerceGeo({ lat: 0, lng: -180.001 })?.longitude).toBeUndefined();
		expect(coerceGeo({ lng: -200 })).toBeUndefined();
	});

	it('infers hemisphere (north | south | equator) with 3-decimal precision', () => {
		// North (> 0.001)
		expect(coerceGeo({ lat: 0.002, lng: 10 })?.sphere).toBe('north');
		expect(coerceGeo({ lat: 45.0, lng: 10 })?.sphere).toBe('north');

		// South (< -0.001)
		expect(coerceGeo({ lat: -0.002, lng: 10 })?.sphere).toBe('south');
		expect(coerceGeo({ lat: -33.869, lng: 151.209 })?.sphere).toBe('south');

		// Equator (abs(lat) <= 0.001)
		expect(coerceGeo({ lat: 0, lng: 10 })?.sphere).toBe('equator');
		expect(coerceGeo({ lat: 0.001, lng: 10 })?.sphere).toBe('equator');
		expect(coerceGeo({ lat: -0.001, lng: 10 })?.sphere).toBe('equator');
		expect(coerceGeo({ lat: 0.0005, lng: 10 })?.sphere).toBe('equator');

		// Explicit sphere override wins
		expect(coerceGeo({ lat: 45, lng: 10, sphere: 'south' })?.sphere).toBe('south');
		expect(coerceGeo({ lat: -45, lng: 10, sphere: 'equator' })?.sphere).toBe('equator');
	});

	it('coerceGeo excludes dangerous prototype keys (__proto__, constructor, prototype)', () => {
		const dangerous = JSON.parse('{"city":"Sydney","__proto__":{"polluted":"yes"},"constructor":{"polluted":"yes"},"prototype":{"polluted":"yes"}}');
		const result = coerceGeo(dangerous);
		expect(result?.city).toBe('Sydney');
		expect(Object.prototype.hasOwnProperty.call(result ?? {}, '__proto__')).toBe(false);
		expect((result as any)?.polluted).toBeUndefined();
		expect(({} as any).polluted).toBeUndefined();
	});

	it('coerceGeo only copies custom non-geo keys when an explicit geo object is provided', () => {
		const directWithCustom = { latitude: 10, longitude: 20, venue: 'HQ', locale: 'en' };
		const coercedDirect = coerceGeo(directWithCustom);
		expect(coercedDirect?.latitude).toBe(10);
		expect(coercedDirect?.longitude).toBe(20);
		expect((coercedDirect as any)?.venue).toBeUndefined();
		expect((coercedDirect as any)?.locale).toBeUndefined();

		const explicitWithCustom = { geo: { latitude: 10, longitude: 20, venue: 'HQ' } };
		const coercedExplicit = coerceGeo(explicitWithCustom);
		expect(coercedExplicit?.latitude).toBe(10);
		expect(coercedExplicit?.longitude).toBe(20);
		expect((coercedExplicit as any)?.venue).toBe('HQ');
	});

	it('coerceGeo rejects comma-delimited strings with empty or whitespace-only coordinate segments', () => {
		expect(coerceGeo(',')).toBeUndefined();
		expect(coerceGeo('   ,   ')).toBeUndefined();
		expect(coerceGeo('10,')).toBeUndefined();
		expect(coerceGeo(',20')).toBeUndefined();
		expect(coerceGeo('10, 20')).toEqual({ latitude: 10, longitude: 20, sphere: 'north' });
	});

	it('resolveGeoCoordinates bypasses stashed coordinates when refresh is true', async () => {
		const mockFetch = vi.fn().mockResolvedValue({
			ok: true,
			json: async () => ({
				status: 'success',
				lat: 40.7128,
				lon: -74.0060,
				city: 'New York',
			}),
		});
		vi.stubGlobal('fetch', mockFetch);

		stashGeo({ latitude: -33.8688, longitude: 151.2093, city: 'Sydney' });

		try {
			// Normal call returns stashed coordinates
			const cached = await resolveGeoCoordinates();
			expect(cached?.city).toBe('Sydney');
			expect(mockFetch).not.toHaveBeenCalled();

			// Refresh call bypasses stashed coordinates and invokes geoLookup
			const refreshed = await resolveGeoCoordinates(undefined, { refresh: true });
			expect(refreshed?.city).toBe('New York');
			expect(refreshed?.lat).toBe(40.713);
			expect(mockFetch).toHaveBeenCalledTimes(1);
		} finally {
			vi.unstubAllGlobals();
		}
	});

	it('resolveGeoCoordinates falls back to getStashedGeo when input only has metadata without coordinates', async () => {
		const fetchSpy = vi.fn();
		vi.stubGlobal('fetch', fetchSpy);
		vi.stubGlobal('window', { document: {} });
		vi.stubGlobal('localStorage', {
			getItem: vi.fn().mockReturnValue(JSON.stringify({
				geolocation: { coords: { latitude: -33.8688, longitude: 151.2093 } },
			})),
		});

		try {
			const coords = await resolveGeoCoordinates({ city: 'Sydney', elevation: 150 });
			expect(coords).toMatchObject({ lat: -33.869, lng: 151.209, sphere: 'south' });
			expect(fetchSpy).not.toHaveBeenCalled();
		} finally {
			vi.unstubAllGlobals();
		}
	});

	it('geoLookup dispatches to server environment handler in Node.js and caches with 24h TTL', async () => {
		const mockFetch = vi.fn().mockResolvedValue({
			ok: true,
			json: async () => ({
				status: 'success',
				lat: -33.8688,
				lon: 151.2093,
				city: 'Sydney',
			}),
		});

		vi.stubGlobal('fetch', mockFetch);

		try {
			// First call queries the network and stashes coordinates
			const result = await geoLookup();
			expect(result.lat).toBe(-33.869);
			expect(result.lng).toBe(151.209);
			expect(result.city).toBe('Sydney');
			expect(result.sphere).toBe('south');
			expect(mockFetch).toHaveBeenCalledTimes(1);

			// Second call returns cached coordinates without hitting fetch
			const cached = await geoLookup();
			expect(cached.lat).toBe(-33.869);
			expect(cached.city).toBe('Sydney');
			expect(cached.status).toBe('cached');
			expect(mockFetch).toHaveBeenCalledTimes(1);

			// refresh: true forces a fresh network call
			const refreshed = await geoLookup({ refresh: true });
			expect(refreshed.lat).toBe(-33.869);
			expect(mockFetch).toHaveBeenCalledTimes(2);
		} finally {
			vi.unstubAllGlobals();
		}
	});

	it('supports multi-tenant key partitioning so tenants do not trample each other', async () => {
		stashGeo({ latitude: 51.5074, longitude: -0.1278, city: 'London' }, 86400000, { key: 'tenant-uk' });
		stashGeo({ latitude: 35.6762, longitude: 139.6503, city: 'Tokyo' }, 86400000, { key: 'tenant-jp' });

		const uk = getStashedGeo({ key: 'tenant-uk' });
		const jp = getStashedGeo({ key: 'tenant-jp' });
		const ambient = getStashedGeo();

		expect(uk?.city).toBe('London');
		expect(jp?.city).toBe('Tokyo');
		expect(ambient).toBeUndefined(); // Ambient server default remains untouched

		// Clear only tenant-uk
		clearStashedGeo({ key: 'tenant-uk' });
		expect(getStashedGeo({ key: 'tenant-uk' })).toBeUndefined();
		expect(getStashedGeo({ key: 'tenant-jp' })?.city).toBe('Tokyo');
	});

	it('getStashedGeo in Node.js returns undefined by default without storage configuration', () => {
		expect(getStashedGeo()).toBeUndefined();
	});

	it('getStashedGeo in Node.js discovers coordinates set explicitly via setStorage', () => {
		setStorage('_magma_geo_', {
			geolocation: { coords: { latitude: -33.8688, longitude: 151.2093 } },
			city: 'Sydney',
		});

		const stashed = getStashedGeo();
		expect(stashed).toBeDefined();
		expect(stashed?.latitude).toBe(-33.869);
		expect(stashed?.longitude).toBe(151.209);
		expect(stashed?.city).toBe('Sydney');
	});

	it('getStashedGeo in Node.js discovers coordinates set as JSON string in setStorage', () => {
		setStorage('_magma_geo_', '{"latitude": 37.7749, "longitude": -122.4194, "city": "San Francisco"}');

		const stashed = getStashedGeo();
		expect(stashed).toBeDefined();
		expect(stashed?.latitude).toBe(37.775);
		expect(stashed?.longitude).toBe(-122.419);
		expect(stashed?.city).toBe('San Francisco');
	});

	it('getStashedGeo in Node.js supports comma-separated string coordinates in storage', () => {
		setStorage('_magma_geo_', '51.5074, -0.1278');

		const stashed = getStashedGeo();
		expect(stashed).toBeDefined();
		expect(stashed?.latitude).toBe(51.507);
		expect(stashed?.longitude).toBe(-0.128);
	});

	it('getStashedGeo does not read legacy _map_ storage key', () => {
		setStorage('_map_', { latitude: 40.7128, longitude: -74.006, city: 'New York' });

		const stashed = getStashedGeo();
		expect(stashed).toBeUndefined();
	});

	it('getStashedGeo removes and ignores expired entries with _expires timestamp', async () => {
		// Stash entry with 30ms TTL
		stashGeo({ latitude: 10, longitude: 20, city: 'ExpiringCity' }, 30, { key: 'short' });

		expect(getStashedGeo({ key: 'short' })?.city).toBe('ExpiringCity');

		// Wait past 30ms TTL
		await new Promise(resolve => setTimeout(resolve, 45));

		expect(getStashedGeo({ key: 'short' })).toBeUndefined();
	});

	it('geoLookup with explicit ip queries provider with ip in path', async () => {
		const mockFetch = vi.fn().mockResolvedValue({
			ok: true,
			json: async () => ({
				status: 'success',
				lat: 37.751,
				lon: -122.522,
				country: 'United States',
				city: 'San Francisco',
				query: '8.8.8.8',
			}),
		});

		vi.stubGlobal('fetch', mockFetch);

		const result = await geoLookup({ ip: '8.8.8.8', refresh: true });
		expect(mockFetch).toHaveBeenCalledWith(
			'https://ipwho.is/8.8.8.8',
			expect.anything()
		);
		expect(result.query).toBe('8.8.8.8');
		expect(result.city).toBe('San Francisco');

		vi.unstubAllGlobals();
	});

	describe('haversineDistance', () => {
		const sydney = { latitude: -33.8688, longitude: 151.2093 };
		const melbourne = { lat: -37.8136, lng: 144.9631 };

		it('calculates great-circle distance between two cities in kilometers', () => {
			const dist = haversineDistance(sydney, melbourne);
			// Sydney to Melbourne is approximately 713.4 km
			expect(dist).toBeGreaterThan(710);
			expect(dist).toBeLessThan(720);
			expect(dist).toBe(713.426);
		});

		it('calculates great-circle distance in miles', () => {
			const distMiles = haversineDistance(sydney, melbourne, 'miles');
			expect(distMiles).toBeGreaterThan(440);
			expect(distMiles).toBeLessThan(450);
			expect(distMiles).toBe(443.303);
		});

		it('calculates great-circle distance in meters with integer rounding', () => {
			const distMeters = haversineDistance(sydney, melbourne, 'm');
			expect(Number.isInteger(distMeters)).toBe(true);
			expect(distMeters).toBe(713426);
		});

		it('returns 0 for identical points', () => {
			expect(haversineDistance(sydney, sydney)).toBe(0);
			expect(haversineDistance(sydney, sydney, 'miles')).toBe(0);
			expect(haversineDistance(sydney, sydney, 'm')).toBe(0);
		});

		it('accepts various coordinate input formats including tuples, strings, and geo containers', () => {
			const tupleCoords = [-33.8688, 151.2093];
			const container = { geo: { lat: -37.8136, lng: 144.9631 } };
			const dist = haversineDistance(tupleCoords, container);
			expect(dist).toBe(713.426);

			const strCoords = '-33.8688, 151.2093';
			expect(haversineDistance(strCoords, container)).toBe(713.426);
		});

		it('returns NaN for missing or invalid coordinates', () => {
			expect(haversineDistance(null, sydney)).toBeNaN();
			expect(haversineDistance(sydney, undefined)).toBeNaN();
			expect(haversineDistance({ lat: 100, lng: 50 }, sydney)).toBeNaN(); // out-of-bounds lat
			expect(haversineDistance({}, {})).toBeNaN();
		});
	});

	describe('solarOffset', () => {
		it('calculates natural solar time offset for civil timezone in minutes', () => {
			// Sydney on standard time (lng 151.209, AEST UTC+10, meridian 150°) -> (151.209 - 150) * 4 = +4.84 min
			const sydney = { lat: -33.8688, lng: 151.2093, timezone: 'Australia/Sydney' };
			expect(solarOffset(sydney, { date: '2026-06-21T12:00:00Z' })).toBe(4.84);

			// Denver on standard time (lng -104.99, MST UTC-7, meridian -105°) -> (-104.99 - -105) * 4 = +0.04 min
			const denver = { lat: 39.7392, lng: -104.9903, timezone: 'America/Denver' };
			expect(solarOffset(denver, { date: '2026-01-15T12:00:00Z' })).toBe(0.04);
		});

		it('supports unit conversion to seconds and hours with configurable precision', () => {
			const sydney = { lat: -33.8688, lng: 151.2093, timezone: 'Australia/Sydney' };
			expect(solarOffset(sydney, { date: '2026-06-21T12:00:00Z', unit: 'seconds' })).toBe(290.16);
			expect(solarOffset(sydney, { date: '2026-06-21T12:00:00Z', unit: 'hours', precision: 3 })).toBe(0.081);
		});

		it('handles plain GMT and UTC timezones correctly', () => {
			expect(solarOffset({ lat: 51.5, lng: 0, timezone: 'UTC' })).toBe(0);
			expect(solarOffset({ lat: 51.5, lng: 0, timezone: 'GMT' })).toBe(0);
		});

		it('returns NaN immediately when date input is invalid or non-finite', () => {
			expect(solarOffset({ lat: 51.5, lng: 0, timezone: 'UTC' }, { date: 'invalid-date-string' })).toBeNaN();
			expect(solarOffset({ lat: 51.5, lng: 0, timezone: 'UTC' }, { date: NaN as any })).toBeNaN();
		});

		it('falls back to natural 15-degree solar timezone meridian when no timezone is supplied', () => {
			// lng 151.209 -> nearest meridian 150° -> +4.84 min
			expect(solarOffset({ lat: -33.8688, lng: 151.2093 })).toBe(4.84);

			// lng 7° -> nearest meridian 0° -> 7 * 4 = 28 min
			expect(solarOffset({ lat: 51.5, lng: 7 })).toBe(28);
		});

		it('calculates apparent solar time offset incorporating Equation of Time', () => {
			const sydney = { lat: -33.8688, lng: 151.2093, timezone: 'Australia/Sydney' };
			const mean = solarOffset(sydney, { date: '2026-06-21T12:00:00Z' });
			const apparent = solarOffset(sydney, { date: '2026-06-21T12:00:00Z', apparent: true });

			expect(typeof apparent).toBe('number');
			expect(apparent).not.toBe(mean);
			expect(apparent).toBe(3.51);
		});

		it('returns NaN for invalid or unresolvable coordinates', () => {
			expect(solarOffset(null)).toBeNaN();
			expect(solarOffset(undefined)).toBeNaN();
			expect(solarOffset({})).toBeNaN();
			expect(solarOffset({ lat: 100, lng: 50 })).toBeNaN();
		});
	});

	describe('calculateBearing (Compass Azimuth)', () => {
		it('calculates initial forward compass bearing in degrees (0° to 360°)', () => {
			const sydney = { lat: -33.8688, lng: 151.2093 };
			const melbourne = { lat: -37.8136, lng: 144.9631 };

			// Sydney to Melbourne great-circle initial azimuth is approx 230.3° (South-West)
			const bearing = calculateBearing(sydney, melbourne);
			expect(bearing).toBe(230.3);

			// Due North (bearing = 0°)
			expect(calculateBearing({ lat: 0, lng: 0 }, { lat: 10, lng: 0 })).toBe(0);

			// Due East (bearing = 90°)
			expect(calculateBearing({ lat: 0, lng: 0 }, { lat: 0, lng: 10 })).toBe(90);

			// Due South (bearing = 180°)
			expect(calculateBearing({ lat: 10, lng: 0 }, { lat: 0, lng: 0 })).toBe(180);

			// Due West (bearing = 270°)
			expect(calculateBearing({ lat: 0, lng: 10 }, { lat: 0, lng: 0 })).toBe(270);
		});

		it('respects custom precision option for bearing', () => {
			const london = { lat: 51.5074, lng: -0.1278 };
			const tokyo = { lat: 35.6762, lng: 139.6503 };

			expect(calculateBearing(london, tokyo, { precision: 3 })).toBe(31.727);
		});

		it('returns NaN for invalid coordinate inputs in calculateBearing', () => {
			expect(calculateBearing(null, { lat: 10, lng: 20 })).toBeNaN();
			expect(calculateBearing({ lat: 10, lng: 20 }, undefined)).toBeNaN();
			expect(calculateBearing({ lat: 100, lng: 20 }, { lat: 10, lng: 20 })).toBeNaN();
		});
	});

	describe('calculateMidpoint (Great-Circle Midpoint)', () => {
		it('calculates geographic midpoint between two coordinates with inferred hemisphere', () => {
			const sydney = { lat: -33.8688, lng: 151.2093 };
			const melbourne = { lat: -37.8136, lng: 144.9631 };

			const mid = calculateMidpoint(sydney, melbourne);
			expect(mid).toBeDefined();
			expect(mid?.latitude).toBe(-35.882);
			expect(mid?.longitude).toBe(148.164);
			expect(mid?.sphere).toBe('south');
		});

		it('correctly calculates midpoint across the equator', () => {
			const northPt = { lat: 10, lng: 0 };
			const southPt = { lat: -10, lng: 0 };

			const mid = calculateMidpoint(northPt, southPt);
			expect(mid).toEqual({
				latitude: 0,
				longitude: 0,
				sphere: 'equator',
			});
		});

		it('returns undefined for invalid coordinates in calculateMidpoint', () => {
			expect(calculateMidpoint(null, { lat: 0, lng: 0 })).toBeUndefined();
			expect(calculateMidpoint({ lat: 0, lng: 0 }, undefined)).toBeUndefined();
			expect(calculateMidpoint({ lat: 100, lng: 0 }, { lat: 0, lng: 0 })).toBeUndefined();
		});
	});

	describe('calculateVelocity & isImpossibleTravel (Security & Transit)', () => {
		it('calculates speed between two timestamped geographic instances in km/h, mph, and m/s', () => {
			const t1 = { lat: 51.5074, lng: -0.1278, epoch: { ms: 1700000000000 } }; // London
			const t2 = { lat: 48.8566, lng: 2.3522, epoch: { ms: 1700000000000 + 7200000 } }; // Paris (2 hours later)

			// Distance London -> Paris is approx 343.486 km. Over 2 hours = 171.74 km/h
			const speedKmh = calculateVelocity(t1, t2, 'km');
			expect(speedKmh).toBe(171.74);

			const speedMph = calculateVelocity(t1, t2, { unit: 'miles' });
			expect(speedMph).toBe(106.71);

			const speedMs = calculateVelocity(t1, t2, { unit: 'm', timeUnit: 's' });
			expect(speedMs).toBe(47.71);
		});

		it('returns 0 when distance is 0 at same timestamp, and Infinity when distance > 0 at same timestamp', () => {
			const p1 = { lat: 10, lng: 10, epoch: { ms: 1000 } };
			const p2 = { lat: 10, lng: 10, epoch: { ms: 1000 } };
			const p3 = { lat: 20, lng: 20, epoch: { ms: 1000 } };

			expect(calculateVelocity(p1, p2)).toBe(0);
			expect(calculateVelocity(p1, p3)).toBe(Infinity);
		});

		it('detects impossible travel anomalies based on commercial speed thresholds', () => {
			const loginLondon = { lat: 51.5074, lng: -0.1278, epoch: { ms: 1700000000000 } };
			const loginTokyo = { lat: 35.6762, lng: 139.6503, epoch: { ms: 1700000000000 + 3600000 } }; // Tokyo 1 hour later

			// Distance is ~9558 km in 1 hour (9558 km/h) -> Far exceeds 900 km/h commercial jet speed
			expect(isImpossibleTravel(loginLondon, loginTokyo)).toBe(true);

			// Normal flight time (14 hours later) -> ~682 km/h -> Feasible
			const feasibleLoginTokyo = { lat: 35.6762, lng: 139.6503, epoch: { ms: 1700000000000 + 14 * 3600000 } };
			expect(isImpossibleTravel(loginLondon, feasibleLoginTokyo)).toBe(false);
		});

		it('returns false for impossible travel when coordinates or timestamps are invalid', () => {
			expect(isImpossibleTravel(null, { lat: 10, lng: 10 })).toBe(false);
			expect(isImpossibleTravel({ lat: 10, lng: 10 }, { lat: 20, lng: 20 })).toBe(false);
		});
	});
});

