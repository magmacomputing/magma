import { coerceGeo, geoLookup, resolveGeoCoordinates } from '../../../src/common/runtime/mapper.library.js';

describe('common/runtime/mapper.library', () => {
	afterEach(() => {
		vi.unstubAllGlobals();
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

	it('geoLookup dispatches to server environment handler in Node.js', async () => {
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
			const result = await geoLookup();
			expect(result.lat).toBe(-33.8688);
			expect(result.lng).toBe(151.2093);
			expect(result.city).toBe('Sydney');
		} finally {
			vi.unstubAllGlobals();
		}
	});
});
