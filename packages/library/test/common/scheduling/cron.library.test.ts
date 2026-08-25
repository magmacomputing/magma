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

		// Non-aligned anchor 2026-08-20 12:00:30 UTC for "0 12 * * *" -> 2026-08-20 12:00:00 UTC
		const nonAlignedAnchorMs = Date.UTC(2026, 7, 20, 12, 0, 30);
		const prevNonAlignedMs = getPrevCronEpoch('0 12 * * *', nonAlignedAnchorMs, 'UTC');
		expect(new Date(prevNonAlignedMs).toISOString()).toBe('2026-08-20T12:00:00.000Z');
	});

	test('rejects non-numeric, out of range, or invalid cron field tokens', () => {
		expect(() => parseCron('60 0 * * *')).toThrow();
		expect(() => parseCron('0 24 * * *')).toThrow();
		expect(() => parseCron('0 0 32 * *')).toThrow();
		expect(() => parseCron('0 0 * 13 *')).toThrow();
		expect(() => parseCron('0 0 * * 8')).toThrow();
		expect(() => parseCron('foo * * * *')).toThrow();
		expect(() => parseCron('5/10 * * * *')).toThrow();
	});

	test('treats DOW 0 and DOW 7 as Sunday equivalently', () => {
		// 2026-08-23 is a Sunday
		const anchorMs = Date.UTC(2026, 7, 22, 12, 0, 0); // Saturday
		const nextMsDow0 = getNextCronEpoch('0 12 * * 0', anchorMs, 'UTC');
		const nextMsDow7 = getNextCronEpoch('0 12 * * 7', anchorMs, 'UTC');
		expect(nextMsDow0).toBe(nextMsDow7);
		expect(new Date(nextMsDow0).toISOString()).toBe('2026-08-23T12:00:00.000Z');
	});

	test('handles DST transitions correctly in IANA timezones', () => {
		// US Eastern DST transition: March 8, 2026 at 02:00 -> 03:00
		const anchorMs = new Date('2026-03-07T12:00:00-05:00').getTime();
		const nextMs = getNextCronEpoch('0 4 * * *', anchorMs, 'America/New_York');
		expect(new Date(nextMs).toISOString()).toBe('2026-03-08T08:00:00.000Z'); // 04:00 EDT is 08:00 UTC
	});
});
