import { Tempo } from '@magmacomputing/tempo';
import { nextCron, prevCron, parseCron } from '../../src/scheduling/cron.js';

describe('cron parser', () => {
	it('parses cron strings correctly', () => {
		const schedule = parseCron('*/5 9-17 * * 1-5');
		expect(schedule.minutes.allowed.has(0)).toBe(true);
		expect(schedule.minutes.allowed.has(5)).toBe(true);
		expect(schedule.minutes.allowed.has(6)).toBe(false);
		expect(schedule.minutes.restricted).toBe(true);

		expect(schedule.hours.allowed.has(9)).toBe(true);
		expect(schedule.hours.allowed.has(17)).toBe(true);
		expect(schedule.hours.allowed.has(18)).toBe(false);

		expect(schedule.daysOfWeek.restricted).toBe(true);
		expect(schedule.daysOfMonth.restricted).toBe(false);
	});

	it('finds the next matching cron date', () => {
		const start = new Tempo('2026-07-01T08:00:00Z'); // Wednesday
		// Every 5 minutes from 9-17, Mon-Fri
		const next = nextCron(start, '*/5 9-17 * * 1-5');
		expect(next.hh).toBe(9);
		expect(next.mi).toBe(0);
		expect(next.dd).toBe(1);
	});

	it('finds the previous matching cron date', () => {
		const start = new Tempo('2026-07-01T18:00:00Z'); // Wednesday
		// Every 5 minutes from 9-17, Mon-Fri
		const prev = prevCron(start, '*/5 9-17 * * 1-5');
		expect(prev.hh).toBe(17);
		expect(prev.mi).toBe(55);
		expect(prev.dd).toBe(1);
	});

	it('correctly uses OR logic when both DOM and DOW are restricted', () => {
		// Run on the 1st of the month, OR on a Friday, at midnight
		const start = new Tempo('2026-07-02T00:00:00Z'); // Thursday
		const next = nextCron(start, '0 0 1 * 5');
		// The 3rd of July 2026 is a Friday!
		expect(next.dd).toBe(3);
		expect(next.dow).toBe(5); // Friday
	});

	it('correctly uses AND logic when only DOW is restricted', () => {
		// Run every Friday
		const start = new Tempo('2026-07-02T00:00:00Z'); // Thursday
		const next = nextCron(start, '0 0 * * 5');
		expect(next.dd).toBe(3);
		expect(next.dow).toBe(5); // Friday
	});

	it('handles Sunday correctly as 0 or 7', () => {
		const start = new Tempo('2026-07-04T00:00:00Z'); // Saturday
		const next1 = nextCron(start, '0 0 * * 0'); // Sunday = 0
		const next2 = nextCron(start, '0 0 * * 7'); // Sunday = 7

		expect(next1.dd).toBe(5);
		expect(next1.dow).toBe(7); // Tempo returns 7 for Sunday

		expect(next2.dd).toBe(5);
		expect(next2.dow).toBe(7);
	});

	it('rejects non-numeric and out-of-range cron fields', () => {
		expect(() => parseCron('60 9 * * 1-5')).toThrow();
		expect(() => parseCron('foo 9 * * 1-5')).toThrow();
		expect(() => parseCron('0 24 * * 1')).toThrow();
		expect(() => parseCron('0 9 32 * 1')).toThrow();
		expect(() => parseCron('0 9 1 13 1')).toThrow();
		expect(() => parseCron('0 9 1 1 8')).toThrow();
	});
});
