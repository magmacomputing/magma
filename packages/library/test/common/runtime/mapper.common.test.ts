import {
	coerceGeo,
	geoLookup,
	resolveGeoCoordinates,
	getStashedGeo,
	stashGeo,
	clearStashedGeo,
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
	});

	it('coerceGeo rejects whitespace-only coordinate strings and non-finite values', () => {
		expect(coerceGeo('   ,   ')).toBeUndefined();
		expect(coerceGeo(['   ', '   '])).toBeUndefined();
		expect(coerceGeo({ lat: '   ', lng: '   ' })).toBeUndefined();
		expect(coerceGeo({ lat: Infinity })).toBeUndefined();
		expect(coerceGeo({ lng: NaN })).toBeUndefined();
		expect(coerceGeo({ lat: '40.7128', lng: '-74.0060' })).toMatchObject({
			latitude: 40.713,
			longitude: -74.006,
		});
	});
});

