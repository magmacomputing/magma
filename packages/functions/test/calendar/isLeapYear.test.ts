import { isLeapYear } from '../../src/calendar/calendar.js';
import { Tempo } from '@magmacomputing/tempo';

describe('isLeapYear', () => {
	it('should return true for typical leap years (divisible by 4, not 100)', () => {
		expect(isLeapYear(2024)).toBe(true);
		expect(isLeapYear(2028)).toBe(true);
		expect(isLeapYear(1996)).toBe(true);
	});

	it('should return false for common non-leap years', () => {
		expect(isLeapYear(2023)).toBe(false);
		expect(isLeapYear(2025)).toBe(false);
		expect(isLeapYear(2026)).toBe(false);
		expect(isLeapYear(2027)).toBe(false);
	});

	it('should return true for century leap years (divisible by 400)', () => {
		expect(isLeapYear(2000)).toBe(true);
		expect(isLeapYear(1600)).toBe(true);
		expect(isLeapYear(2400)).toBe(true);
	});

	it('should return false for century non-leap years (divisible by 100, not 400)', () => {
		expect(isLeapYear(1900)).toBe(false);
		expect(isLeapYear(1800)).toBe(false);
		expect(isLeapYear(1700)).toBe(false);
		expect(isLeapYear(2100)).toBe(false);
	});

	it('should accept string year representations and ISO strings', () => {
		expect(isLeapYear('2024')).toBe(true);
		expect(isLeapYear('2023')).toBe(false);
		expect(isLeapYear('2024-02-15')).toBe(true);
		expect(isLeapYear('2023-11-20')).toBe(false);
	});

	it('should accept Tempo instances, Date objects, and duck-typed objects', () => {
		expect(isLeapYear(new Tempo('2024-06-01'))).toBe(true);
		expect(isLeapYear(new Tempo('2025-06-01'))).toBe(false);
		expect(isLeapYear(new Date(2024, 0, 1))).toBe(true);
		expect(isLeapYear(new Date(2023, 0, 1))).toBe(false);
		expect(isLeapYear({ year: 2024 })).toBe(true);
		expect(isLeapYear({ year: 2023 })).toBe(false);
	});

	it('should throw TypeError for invalid or unrecognizable inputs', () => {
		expect(() => isLeapYear('invalid-year' as any)).toThrow();
		expect(() => isLeapYear(null as any)).toThrow();
	});
});
