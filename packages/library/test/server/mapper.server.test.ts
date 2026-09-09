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

	it('serverGeoLocation queries provider URL with explicit IP path when ip option is supplied', async () => {
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

		const geo = await serverGeoLocation({ ip: '8.8.8.8' });
		expect(mockFetch).toHaveBeenCalledWith(
			'https://ipwho.is/8.8.8.8',
			expect.anything()
		);
		expect(geo.status).toBe('success');
		expect(geo.query).toBe('8.8.8.8');
		expect(geo.city).toBe('San Francisco');

		vi.unstubAllGlobals();
	});

	it('serverGeoLocation replaces {ip} in custom endpoint URL', async () => {
		const mockFetch = vi.fn().mockResolvedValue({
			ok: true,
			json: async () => ({
				status: 'success',
				lat: 34.0522,
				lon: -118.2437,
				country: 'United States',
				city: 'Los Angeles',
				query: '1.1.1.1',
			}),
		});

		vi.stubGlobal('fetch', mockFetch);

		const geo = await serverGeoLocation({ endpoint: 'https://custom.geo.api/v1/{ip}/json', ip: '1.1.1.1' });
		expect(mockFetch).toHaveBeenCalledWith(
			'https://custom.geo.api/v1/1.1.1.1/json',
			expect.anything()
		);
		expect(geo.status).toBe('success');

		vi.unstubAllGlobals();
	});

	it('serverGeoLocation fails fast when custom endpoint lacks {ip} placeholder and ip is provided', async () => {
		const geo = await serverGeoLocation({ endpoint: 'https://custom.geo.api/lookup', ip: '1.1.1.1' });
		expect(geo.status).toBe('fail');
		expect(geo.error).toContain("Custom endpoint must include an '{ip}' placeholder");

		await expect(
			serverGeoLocation({ endpoint: 'https://custom.geo.api/lookup', ip: '1.1.1.1', catch: false })
		).rejects.toThrow("Custom endpoint must include an '{ip}' placeholder");
	});
});

