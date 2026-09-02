import { serverGeoCoords, serverGeoLocation, serverMapHemisphere } from '../../src/server/mapper.library.js';

describe('server/mapper.library', () => {
	it('serverGeoCoords returns user supplied coordinates directly', async () => {
		const coords = await serverGeoCoords({ latitude: -33.8688, longitude: 151.2093 });
		expect(coords).toEqual({ lat: -33.8688, lng: 151.2093 });
	});

	it('serverGeoCoords handles short aliases (lat, lng, lon)', async () => {
		const coords = await serverGeoCoords({ lat: 40.7128, lon: -74.0060 });
		expect(coords).toEqual({ lat: 40.7128, lng: -74.0060 });
	});

	it('serverMapHemisphere calculates hemisphere for coordinates', async () => {
		const sphereSouth = await serverMapHemisphere({ lat: -33.8688, lng: 151.2093 });
		expect(sphereSouth).toBe('south');

		const sphereNorth = await serverMapHemisphere({ lat: 40.7128, lng: -74.0060 });
		expect(sphereNorth).toBe('north');
	});

	it('serverGeoLocation performs fetch and parses response', async () => {
		const mockFetch = vi.fn().mockResolvedValue({
			ok: true,
			json: async () => ({
				status: 'success',
				lat: 51.5074,
				lon: -0.1278,
				country: 'United Kingdom',
				city: 'London',
				timezone: 'Europe/London',
				query: '127.0.0.1',
			}),
		});

		vi.stubGlobal('fetch', mockFetch);

		const geo = await serverGeoLocation();
		expect(geo.status).toBe('success');
		expect(geo.lat).toBe(51.5074);
		expect(geo.lng).toBe(-0.1278);
		expect(geo.country).toBe('United Kingdom');

		vi.unstubAllGlobals();
	});

	it('serverGeoLocation handles fetch error gracefully when catch option is true', async () => {
		const mockFetch = vi.fn().mockRejectedValue(new Error('Network offline'));
		vi.stubGlobal('fetch', mockFetch);

		const geo = await serverGeoLocation({ catch: true });
		expect(geo.status).toBe('fail');
		expect(geo.error).toBe('Network offline');

		vi.unstubAllGlobals();
	});
});
