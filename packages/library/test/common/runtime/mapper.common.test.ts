import { coerceGeo, geoLookup, resolveGeoCoordinates, getStashedGeo, stashGeo, clearStashedGeo } from '../../../src/common/runtime/mapper.library.js';
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
		expect(coords).toEqual({ lat: -33.8688, lng: 151.2093 });
	});

	it('resolveGeoCoordinates extracts coordinates from config sub-object', async () => {
		const coords = await resolveGeoCoordinates({ config: { lat: 40.7128, lng: -74.0060 } });
		expect(coords).toEqual({ lat: 40.7128, lng: -74.0060 });
	});

	it('coerceGeo excludes dangerous prototype keys (__proto__, constructor, prototype)', () => {
		const dangerous = JSON.parse('{"city":"Sydney","__proto__":{"polluted":"yes"},"constructor":{"polluted":"yes"},"prototype":{"polluted":"yes"}}');
		const result = coerceGeo(dangerous);
		expect(result?.city).toBe('Sydney');
		expect(Object.prototype.hasOwnProperty.call(result ?? {}, '__proto__')).toBe(false);
		expect((result as any)?.polluted).toBeUndefined();
		expect(({} as any).polluted).toBeUndefined();
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
			expect(coords).toEqual({ lat: -33.8688, lng: 151.2093 });
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
			expect(result.lat).toBe(-33.8688);
			expect(result.lng).toBe(151.2093);
			expect(result.city).toBe('Sydney');
			expect(mockFetch).toHaveBeenCalledTimes(1);

			// Second call returns cached coordinates without hitting fetch
			const cached = await geoLookup();
			expect(cached.lat).toBe(-33.8688);
			expect(cached.city).toBe('Sydney');
			expect(cached.status).toBe('cached');
			expect(mockFetch).toHaveBeenCalledTimes(1);

			// refresh: true forces a fresh network call
			const refreshed = await geoLookup({ refresh: true });
			expect(refreshed.lat).toBe(-33.8688);
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
		setStorage('_map_', {
			geolocation: { coords: { latitude: -33.8688, longitude: 151.2093 } },
			city: 'Sydney',
		});

		const stashed = getStashedGeo();
		expect(stashed).toBeDefined();
		expect(stashed?.latitude).toBe(-33.8688);
		expect(stashed?.longitude).toBe(151.2093);
		expect(stashed?.city).toBe('Sydney');
	});

	it('getStashedGeo in Node.js discovers coordinates set as JSON string in setStorage', () => {
		setStorage('_map_', '{"latitude": 37.7749, "longitude": -122.4194, "city": "San Francisco"}');

		const stashed = getStashedGeo();
		expect(stashed).toBeDefined();
		expect(stashed?.latitude).toBe(37.7749);
		expect(stashed?.longitude).toBe(-122.4194);
		expect(stashed?.city).toBe('San Francisco');
	});

	it('getStashedGeo in Node.js supports comma-separated string coordinates in storage', () => {
		setStorage('_map_', '51.5074, -0.1278');

		const stashed = getStashedGeo();
		expect(stashed).toBeDefined();
		expect(stashed?.latitude).toBe(51.5074);
		expect(stashed?.longitude).toBe(-0.1278);
	});
});
