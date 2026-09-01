import {
	getLunarPhase,
	getLunarPhaseRange,
	getSolarEvents,
	getSunriseSunset,
	getZodiacSign,
	getChineseZodiac
} from '../src/celestial/index.js';

describe('Astro Pure Functions (tempo-fns)', () => {
	it('calculates lunar phase correctly for reference new moon', () => {
		const phase = getLunarPhase(947182440000, { sphere: 'north' });
		expect(phase.key).toBe('new-moon');
		expect(phase.index).toBe(1);
		expect(phase.emoji).toBe('🌑');
		expect(phase.illumination).toBeCloseTo(0, 1);
	});

	it('calculates lunar phase range boundaries', () => {
		const range = getLunarPhaseRange(947182440000, { sphere: 'north' });
		expect(range.startMs).toBeLessThanOrEqual(947182440000);
		expect(range.endMs).toBeGreaterThan(947182440000);
		expect(range.phase.key).toBe('new-moon');
	});

	it('calculates solar equinoxes and solstices for year 2026', () => {
		const events = getSolarEvents(2026);
		expect(events).toHaveLength(4);
		expect(events[0]?.key).toBe('Vernal');
		expect(events[1]?.key).toBe('Summer');
		expect(events[2]?.key).toBe('Autumnal');
		expect(events[3]?.key).toBe('Winter');

		// Vernal Equinox 2026 should be near March 20, 2026
		const vernalDate = new Date(events[0]!.epochMs);
		expect(vernalDate.getUTCFullYear()).toBe(2026);
		expect(vernalDate.getUTCMonth()).toBe(2); // March
	});

	it('calculates solar events for boundaries -1000, 1000, and 3000', () => {
		for (const yr of [-1000, 1000, 3000]) {
			const events = getSolarEvents(yr);
			expect(events).toHaveLength(4);
			expect(events[0]?.key).toBe('Vernal');
			expect(events[1]?.key).toBe('Summer');
			expect(events[2]?.key).toBe('Autumnal');
			expect(events[3]?.key).toBe('Winter');
			for (const ev of events) {
				expect(ev.epochMs).toBeDefined();
				expect(Number.isNaN(ev.epochMs)).toBe(false);
			}
		}
		expect(() => getSolarEvents(-1001)).toThrow(RangeError);
		expect(() => getSolarEvents(3001)).toThrow(RangeError);
	});

	it('calculates sunrise and sunset with 1-based index and coordinate options object', () => {
		// June 21, 2026 at 02:00 UTC (12:00 PM local time in Sydney)
		const res = getSunriseSunset(new Date('2026-06-21T02:00:00Z'), { lat: -33.8688, lng: 151.2093 });
		expect(res.sunriseMs).toBeLessThan(res.sunsetMs);
		expect(res.solarNoonMs).toBeGreaterThan(res.sunriseMs);
		expect(res.solarNoonMs).toBeLessThan(res.sunsetMs);
		expect(res.daylightDurationMs).toBeGreaterThan(0);
		expect(res.isDaylight).toBe(true);
		expect(res.solarPhaseState).toBe('daylight');
		expect(res.index).toBe(5); // 1-based (5 = daylight)
		expect(res.civil).toBeDefined();
		expect(res.civil.sunriseMs).toBeLessThan(res.sunriseMs);
		expect(res.civil.sunsetMs).toBeGreaterThan(res.sunsetMs);
		expect(res.nautical.sunriseMs).toBeLessThan(res.civil.sunriseMs);
		expect(res.astronomical.sunriseMs).toBeLessThan(res.nautical.sunriseMs);

		// Test alternative coordinate key formats (lat/long)
		const res2 = getSunriseSunset(new Date('2026-06-21T02:00:00Z'), { lat: -33.8688, long: 151.2093 });
		expect(res2.sunriseMs).toBe(res.sunriseMs);
		expect(res2.index).toBe(5);

		// June 21, 2026 at 12:00 UTC (10:00 PM local time in Sydney -> night)
		const nightRes = getSunriseSunset(new Date('2026-06-21T12:00:00Z'), { lat: -33.8688, lng: 151.2093 });
		expect(nightRes.solarPhaseState).toBe('night');
		expect(nightRes.index).toBe(1); // 1-based (1 = night)
	});

	it('calculates Western Tropical Zodiac sign', () => {
		expect(getZodiacSign('2026-03-25')).toBe('Aries');
		expect(getZodiacSign('2026-07-25')).toBe('Leo');
		expect(getZodiacSign('2026-12-25')).toBe('Capricorn');
	});

	it('calculates Chinese Zodiac animal and element', () => {
		// 2026 is Year of the Fire Horse (Yang)
		const cz = getChineseZodiac(2026);
		expect(cz.animal).toBe('Horse');
		expect(cz.element).toBe('Fire');
		expect(cz.yinYang).toBe('Yang');
	});
});
