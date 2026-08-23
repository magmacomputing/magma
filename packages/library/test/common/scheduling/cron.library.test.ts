import {
	isCronString,
	parseCron,
	getNextCronEpoch,
	getPrevCronEpoch
} from '#library/cron.library.js';

describe('cron.library', () => {
	test('isCronString identifies valid 5-part cron expressions', () => {
		expect(isCronString('0 0 * * *')).toBe(true);
		expect(isCronString('*/15 9-17 * * 1-5')).toBe(true);
		expect(isCronString('0 0 1 1 *')).toBe(true);
		expect(isCronString('FREQ=DAILY')).toBe(false);
		expect(isCronString('invalid cron')).toBe(false);
		expect(isCronString('60 0 * * *')).toBe(false);
		expect(isCronString('foo * * * *')).toBe(false);
	});

	test('parseCron correctly parses fields into allowed sets', () => {
		const parsed = parseCron('15 9 1,15 * 1-5');
		expect(parsed.minutes.allowed.has(15)).toBe(true);
		expect(parsed.hours.allowed.has(9)).toBe(true);
		expect(parsed.daysOfMonth.allowed.has(1)).toBe(true);
		expect(parsed.daysOfMonth.allowed.has(15)).toBe(true);
		expect(parsed.daysOfWeek.allowed.has(1)).toBe(true);
		expect(parsed.daysOfWeek.allowed.has(5)).toBe(true);
	});

	test('getNextCronEpoch calculates next occurrence timestamp in ms', () => {
		// 2026-08-20 12:00:00 UTC (Thursday)
		const anchorMs = Date.UTC(2026, 7, 20, 12, 0, 0);
		// Next occurrence of "0 13 * * *" -> 2026-08-20 13:00:00 UTC
		const nextMs = getNextCronEpoch('0 13 * * *', anchorMs, 'UTC');
		expect(new Date(nextMs).toISOString()).toBe('2026-08-20T13:00:00.000Z');
	});

	test('getPrevCronEpoch calculates previous occurrence timestamp in ms', () => {
		// 2026-08-20 12:00:00 UTC
		const anchorMs = Date.UTC(2026, 7, 20, 12, 0, 0);
		// Previous occurrence of "0 11 * * *" -> 2026-08-20 11:00:00 UTC
		const prevMs = getPrevCronEpoch('0 11 * * *', anchorMs, 'UTC');
		expect(new Date(prevMs).toISOString()).toBe('2026-08-20T11:00:00.000Z');
	});

	test('rejects non-numeric, out of range, or invalid cron field tokens', () => {
		expect(() => parseCron('60 0 * * *')).toThrow();
		expect(() => parseCron('0 24 * * *')).toThrow();
		expect(() => parseCron('0 0 32 * *')).toThrow();
		expect(() => parseCron('0 0 * 13 *')).toThrow();
		expect(() => parseCron('0 0 * * 8')).toThrow();
		expect(() => parseCron('foo * * * *')).toThrow();
	});
});
