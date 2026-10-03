import { isLastDayOfMonth } from '../../src/calendar/calendar.js';
import { Tempo } from '@magmacomputing/tempo';

describe('isLastDayOfMonth', () => {
	it('should return true for the last day of standard 31-day months', () => {
		expect(isLastDayOfMonth('2026-01-31')).toBe(true);
		expect(isLastDayOfMonth('2026-03-31')).toBe(true);
		expect(isLastDayOfMonth('2026-05-31')).toBe(true);
		expect(isLastDayOfMonth('2026-07-31')).toBe(true);
		expect(isLastDayOfMonth('2026-08-31')).toBe(true);
		expect(isLastDayOfMonth('2026-10-31')).toBe(true);
		expect(isLastDayOfMonth('2026-12-31')).toBe(true);
	});

	it('should return false for days prior to the last day of 31-day months', () => {
		expect(isLastDayOfMonth('2026-01-30')).toBe(false);
		expect(isLastDayOfMonth('2026-07-15')).toBe(false);
	});

	it('should return true for the last day of 30-day months', () => {
		expect(isLastDayOfMonth('2026-04-30')).toBe(true);
		expect(isLastDayOfMonth('2026-06-30')).toBe(true);
		expect(isLastDayOfMonth('2026-09-30')).toBe(true);
		expect(isLastDayOfMonth('2026-11-30')).toBe(true);

		expect(isLastDayOfMonth('2026-04-29')).toBe(false);
	});

	it('should accurately handle February in leap vs non-leap years', () => {
		// 2024 is a leap year (Feb 29 days)
		expect(isLastDayOfMonth('2024-02-29')).toBe(true);
		expect(isLastDayOfMonth('2024-02-28')).toBe(false);

		// 2023 is a non-leap year (Feb 28 days)
		expect(isLastDayOfMonth('2023-02-28')).toBe(true);
		expect(isLastDayOfMonth('2023-02-27')).toBe(false);
	});

	it('should work with Tempo instances', () => {
		const tLast = new Tempo('2026-07-31');
		expect(isLastDayOfMonth(tLast)).toBe(true);

		const tMid = new Tempo('2026-07-15');
		expect(isLastDayOfMonth(tMid)).toBe(false);
	});

	it('should handle standard Date objects and timestamps', () => {
		const dLast = new Date(2026, 6, 31); // July 31
		expect(isLastDayOfMonth(dLast)).toBe(true);

		const dMid = new Date(2026, 6, 15); // July 15
		expect(isLastDayOfMonth(dMid)).toBe(false);
	});

	it('should handle duck-typed objects exposing daysInMonth and day', () => {
		expect(isLastDayOfMonth({ day: 31, daysInMonth: 31 })).toBe(true);
		expect(isLastDayOfMonth({ day: 30, daysInMonth: 31 })).toBe(false);
		expect(isLastDayOfMonth({ zdt: { day: 29, daysInMonth: 29 } } as any)).toBe(true);
	});
});
