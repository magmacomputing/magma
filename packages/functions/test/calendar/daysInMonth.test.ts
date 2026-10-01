import { daysInMonth } from '../../src/calendar/calendar.js';
import { Tempo } from '@magmacomputing/tempo';

describe('daysInMonth', () => {
	it('should return 31 days for January, March, May, July, August, October, December', () => {
		expect(daysInMonth(2026, 1)).toBe(31);
		expect(daysInMonth(2026, 3)).toBe(31);
		expect(daysInMonth(2026, 5)).toBe(31);
		expect(daysInMonth(2026, 7)).toBe(31);
		expect(daysInMonth(2026, 8)).toBe(31);
		expect(daysInMonth(2026, 10)).toBe(31);
		expect(daysInMonth(2026, 12)).toBe(31);
	});

	it('should return 30 days for April, June, September, November', () => {
		expect(daysInMonth(2026, 4)).toBe(30);
		expect(daysInMonth(2026, 6)).toBe(30);
		expect(daysInMonth(2026, 9)).toBe(30);
		expect(daysInMonth(2026, 11)).toBe(30);
	});

	it('should return 29 days for February in leap years and 28 in non-leap years', () => {
		expect(daysInMonth(2024, 2)).toBe(29);
		expect(daysInMonth(2000, 2)).toBe(29);
		expect(daysInMonth(2023, 2)).toBe(28);
		expect(daysInMonth(1900, 2)).toBe(28);
	});

	it('should extract year and month from ISO date strings and Tempo instances', () => {
		expect(daysInMonth('2024-02-15')).toBe(29);
		expect(daysInMonth('2023-02-15')).toBe(28);
		expect(daysInMonth('2026-07-04')).toBe(31);

		const t = new Tempo('2024-02-01');
		expect(daysInMonth(t)).toBe(29);
	});

	it('should accept Date objects and duck-typed objects', () => {
		const d = new Date(2024, 1, 10); // Feb 10, 2024
		expect(daysInMonth(d)).toBe(29);

		expect(daysInMonth({ year: 2026, month: 4 })).toBe(30);
		expect(daysInMonth({ daysInMonth: 29, year: 2024, month: 2 })).toBe(29);
	});

	it('should throw RangeError for month out of bounds', () => {
		expect(() => daysInMonth(2026, 0)).toThrow(RangeError);
		expect(() => daysInMonth(2026, 13)).toThrow(RangeError);
	});

	it('should throw TypeError when year is passed as number without month', () => {
		expect(() => daysInMonth(2026 as any)).toThrow(TypeError);
	});

	it('should extract year and month from epoch timestamps without requiring separate month argument', () => {
		const feb2024Ts = new Date(2024, 1, 15).getTime();
		expect(daysInMonth(feb2024Ts)).toBe(29);
	});
});
