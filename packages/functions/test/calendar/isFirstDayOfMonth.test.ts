import { isFirstDayOfMonth } from '../../src/calendar/isFirstDayOfMonth.js';
import { Tempo } from '@magmacomputing/tempo';

describe('isFirstDayOfMonth', () => {
	it('should return true for the first day of the month (Tempo)', () => {
		const t = new Tempo('2026-07-01');
		expect(isFirstDayOfMonth(t)).toBe(true);
	});

	it('should return false for other days (Tempo)', () => {
		const t = new Tempo('2026-07-02');
		expect(isFirstDayOfMonth(t)).toBe(false);
	});

	it('should handle native Temporal objects gracefully', () => {
		const t = { day: 1 }; // Duck typing to simulate native Temporal object
		expect(isFirstDayOfMonth(t as any)).toBe(true);
	});

	it('should handle objects exposing .zdt without top-level .day property', () => {
		const wrapper = { zdt: { day: 1 } };
		expect(isFirstDayOfMonth(wrapper as any)).toBe(true);

		const wrapperNotFirst = { zdt: { day: 15 } };
		expect(isFirstDayOfMonth(wrapperNotFirst as any)).toBe(false);
	});
});
