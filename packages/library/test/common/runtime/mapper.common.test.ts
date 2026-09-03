import { geoLookup, resolveGeoCoordinates } from '../../../src/common/runtime/mapper.library.js';

describe('common/runtime/mapper.library', () => {
	it('resolveGeoCoordinates extracts coordinates synchronously if present', async () => {
		const coords = await resolveGeoCoordinates({ latitude: -33.8688, longitude: 151.2093 });
		expect(coords).toEqual({ lat: -33.8688, lng: 151.2093 });
	});

	it('resolveGeoCoordinates extracts coordinates from config sub-object', async () => {
		const coords = await resolveGeoCoordinates({ config: { lat: 40.7128, lng: -74.0060 } });
		expect(coords).toEqual({ lat: 40.7128, lng: -74.0060 });
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

		const result = await geoLookup();
		expect(result.lat).toBe(-33.8688);
		expect(result.lng).toBe(151.2093);
		expect(result.city).toBe('Sydney');

		vi.unstubAllGlobals();
	});
});
