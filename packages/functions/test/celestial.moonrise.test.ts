import { getMoonriseMoonset } from '../src/index.js';

describe('getMoonriseMoonset', () => {
	it('calculates valid moonrise and moonset timestamps for Sydney', () => {
		// Sep 2, 2026 in Sydney
		const res = getMoonriseMoonset('2026-09-02T12:00:00Z', -33.8688, 151.2093);
		expect(res.latitude).toBe(-33.8688);
		expect(res.longitude).toBe(151.2093);
		expect(typeof res.moonriseMs === 'number' || res.moonriseMs === undefined).toBe(true);
		expect(typeof res.moonsetMs === 'number' || res.moonsetMs === undefined).toBe(true);

		if (res.moonriseMs) {
			const d = new Date(res.moonriseMs);
			expect(d.getFullYear()).toBe(2026);
		}
	});

	it('handles default coordinates (0, 0)', () => {
		const res = getMoonriseMoonset('2026-06-21T12:00:00Z');
		expect(res.latitude).toBe(0);
		expect(res.longitude).toBe(0);
	});

	it('asserts every returned moon event falls within the longitude-local 24-hour interval', () => {
		const dateStr = '2026-09-02T12:00:00Z';
		const lat = 40.7128;
		const lng = -74.006;
		const res = getMoonriseMoonset(dateStr, lat, lng);

		const epochMs = new Date(dateStr).getTime();
		const localMs = epochMs + (lng * 240000);
		const localDate = new Date(localMs);
		const startOfDayMs = Date.UTC(localDate.getUTCFullYear(), localDate.getUTCMonth(), localDate.getUTCDate());
		const moonDayStartMs = startOfDayMs - (lng * 240000);
		const moonDayEndMs = moonDayStartMs + 86400000;

		if (res.moonriseMs !== undefined) {
			expect(res.moonriseMs).toBeGreaterThanOrEqual(moonDayStartMs);
			expect(res.moonriseMs).toBeLessThanOrEqual(moonDayEndMs);
		}

		if (res.moonsetMs !== undefined) {
			expect(res.moonsetMs).toBeGreaterThanOrEqual(moonDayStartMs);
			expect(res.moonsetMs).toBeLessThanOrEqual(moonDayEndMs);
		}
	});
});
