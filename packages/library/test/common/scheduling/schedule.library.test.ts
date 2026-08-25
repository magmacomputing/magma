import {
	isScheduleString,
	getNextScheduleEpoch
} from '#library/schedule.library.js';

describe('schedule.library', () => {
	test('isScheduleString recognizes both Cron expressions and RRULE strings', () => {
		expect(isScheduleString('0 0 * * *')).toBe(true);
		expect(isScheduleString('FREQ=DAILY')).toBe(true);
		expect(isScheduleString('RRULE:FREQ=WEEKLY;BYDAY=MO')).toBe(true);
		expect(isScheduleString('not a schedule')).toBe(false);
	});

	test('getNextScheduleEpoch handles Cron pattern accurately', () => {
		const anchorMs = Date.UTC(2026, 7, 20, 10, 0, 0);
		const nextCronMs = getNextScheduleEpoch('0 11 * * *', anchorMs, 'UTC');
		expect(nextCronMs).not.toBeNull();
		expect(new Date(nextCronMs!).toISOString()).toBe('2026-08-20T11:00:00.000Z');
	});

	test('getNextScheduleEpoch handles RRULE string accurately', () => {
		const anchorMs = Date.UTC(2026, 7, 20, 10, 0, 0);
		const nextRRuleMs = getNextScheduleEpoch('FREQ=DAILY;INTERVAL=1', anchorMs);
		expect(nextRRuleMs).not.toBeNull();
		expect(new Date(nextRRuleMs!).toISOString()).toBe('2026-08-21T10:00:00.000Z');
	});

	test('getNextScheduleEpoch returns null for invalid pattern', () => {
		const anchorMs = Date.UTC(2026, 7, 20, 10, 0, 0);
		expect(getNextScheduleEpoch('invalid pattern', anchorMs)).toBeNull();
	});
});
