import { expect, test, describe } from 'vitest';
import { Tempo } from '@magmacomputing/tempo';
import { workingHoursUntil } from '../../src/business/workingHoursUntil.js';

describe('workingHoursUntil', () => {
	test('same day within working hours', () => {
		const start = new Tempo('2026-07-10T10:00:00+10:00'); // Friday
		const end = new Tempo('2026-07-10T14:30:00+10:00'); // Friday
		expect(workingHoursUntil(start, end)).toBe(4.5);
	});

	test('same day starting before working hours', () => {
		const start = new Tempo('2026-07-10T07:00:00+10:00');
		const end = new Tempo('2026-07-10T14:30:00+10:00');
		// Starts at 9:00 -> 14:30 = 5.5 hours
		expect(workingHoursUntil(start, end)).toBe(5.5);
	});

	test('same day ending after working hours', () => {
		const start = new Tempo('2026-07-10T10:00:00+10:00');
		const end = new Tempo('2026-07-10T19:00:00+10:00');
		// Ends at 17:00. 10:00 -> 17:00 = 7 hours
		expect(workingHoursUntil(start, end)).toBe(7);
	});

	test('spanning over weekend', () => {
		const start = new Tempo('2026-07-10T15:00:00+10:00'); // Friday
		const end = new Tempo('2026-07-13T12:00:00+10:00'); // Monday
		// Friday: 15 to 17 = 2 hrs
		// Monday: 9 to 12 = 3 hrs
		// Total = 5 hrs
		expect(workingHoursUntil(start, end)).toBe(5);
	});

	test('spanning over holidays', () => {
		const start = new Tempo('2026-12-24T12:00:00+10:00'); // Thursday
		const end = new Tempo('2026-12-28T12:00:00+10:00'); // Monday
		// Thursday (24th): 12 to 17 = 5 hrs
		// Friday (25th): holiday = 0 hrs
		// Sat/Sun: weekend = 0 hrs
		// Monday (28th): 9 to 12 = 3 hrs
		// Total = 8 hrs
		expect(workingHoursUntil(start, end, { holidays: ['2026-12-25'] })).toBe(8);
	});

	test('negative SLA (deadline in past)', () => {
		const end = new Tempo('2026-07-10T10:00:00+10:00'); // Friday
		const start = new Tempo('2026-07-10T14:30:00+10:00'); // Friday
		// 4.5 hours difference but negative
		expect(workingHoursUntil(start, end)).toBe(-4.5);
	});
});
