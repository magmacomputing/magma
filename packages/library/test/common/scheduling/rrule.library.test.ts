import {
	isRRuleString,
	isFiniteRRule,
	parseRRule,
	expandRRuleEpochs,
	getNextRRuleEpoch,
} from '#library/rrule.library.js';
import { DAY_MAP } from '#library/calendar.library.js';

describe('rrule.library', () => {
	test('isRRuleString identifies valid RRULE patterns', () => {
		expect(isRRuleString('FREQ=DAILY')).toBe(true);
		expect(isRRuleString('RRULE:FREQ=WEEKLY;BYDAY=MO')).toBe(true);
		expect(isRRuleString('FREQ=MONTHLY;BYDAY=1MO,3MO')).toBe(true);
		expect(isRRuleString('hello world')).toBe(false);
		expect(isRRuleString('2026-08-07')).toBe(false);
	});

	test('isFiniteRRule identifies bounded vs infinite series', () => {
		expect(isFiniteRRule('FREQ=DAILY;COUNT=5')).toBe(true);
		expect(isFiniteRRule('FREQ=WEEKLY;UNTIL=20261231T235959Z')).toBe(true);
		expect(isFiniteRRule('FREQ=MONTHLY;UNTIL=20261231')).toBe(true);
		expect(isFiniteRRule('FREQ=DAILY')).toBe(false);
		expect(isFiniteRRule('FREQ=WEEKLY;BYDAY=MO,WE,FR')).toBe(false);
	});

	test('DAY_MAP provides correct weekday mapping and Sunday aliases', () => {
		expect(DAY_MAP.MO).toBe(1);
		expect(DAY_MAP.TU).toBe(2);
		expect(DAY_MAP.WE).toBe(3);
		expect(DAY_MAP.TH).toBe(4);
		expect(DAY_MAP.FR).toBe(5);
		expect(DAY_MAP.SA).toBe(6);
		expect(DAY_MAP.SU).toBe(7);
		expect(DAY_MAP.SUN).toBe(7);
	});

	test('parseRRule correctly parses RRULE components', () => {
		const parsed = parseRRule('FREQ=WEEKLY;INTERVAL=2;COUNT=5;BYDAY=1MO,-1FR;BYHOUR=9,17;BYMINUTE=30');
		expect(parsed.freq).toBe('WEEKLY');
		expect(parsed.interval).toBe(2);
		expect(parsed.count).toBe(5);
		expect(parsed.byDay).toEqual([
			{ nth: 1, day: 'MO' },
			{ nth: -1, day: 'FR' }
		]);
		expect(parsed.byHour).toEqual([9, 17]);
		expect(parsed.byMinute).toEqual([30]);
	});

	test('parseRRule correctly handles RRULE: prefix', () => {
		const parsed = parseRRule('RRULE:FREQ=WEEKLY;INTERVAL=1;BYDAY=MO');
		expect(parsed.freq).toBe('WEEKLY');
		expect(parsed.interval).toBe(1);
		expect(parsed.byDay).toEqual([{ nth: undefined, day: 'MO' }]);
	});

	test('parseRRule supports 2-letter, 3-letter, and full weekday names and normalizes to standard RFC 2-letter codes', () => {
		const parsed = parseRRule('FREQ=WEEKLY;BYDAY=Monday,FRI,Wed,2Thursday,Sunday');
		expect(parsed.byDay).toEqual([
			{ nth: undefined, day: 'MO' },
			{ nth: undefined, day: 'FR' },
			{ nth: undefined, day: 'WE' },
			{ nth: 2, day: 'TH' },
			{ nth: undefined, day: 'SU' }
		]);
	});

	test('parseRRule supports numeric, 3-letter, and full month names in BYMONTH', () => {
		const parsed = parseRRule('FREQ=YEARLY;BYMONTH=1,Jan,December,AUG');
		expect(parsed.byMonth).toEqual([1, 1, 12, 8]);
	});

	test('expandRRuleEpochs generates correct daily occurrence timestamps', () => {
		// 2026-08-07T00:00:00.000Z is Friday
		const anchor = Date.UTC(2026, 7, 7, 0, 0, 0, 0);
		const epochs = expandRRuleEpochs('FREQ=DAILY;INTERVAL=1', anchor, { count: 3 });

		expect(epochs.length).toBe(3);
		expect(new Date(epochs[0]).toISOString()).toBe('2026-08-07T00:00:00.000Z');
		expect(new Date(epochs[1]).toISOString()).toBe('2026-08-08T00:00:00.000Z');
		expect(new Date(epochs[2]).toISOString()).toBe('2026-08-09T00:00:00.000Z');
	});

	test('expandRRuleEpochs handles Sunday BYDAY correctly for WEEKLY', () => {
		// Friday, Aug 7, 2026
		const anchor = Date.UTC(2026, 7, 7, 10, 0, 0, 0);
		const epochs = expandRRuleEpochs('FREQ=WEEKLY;BYDAY=SU', anchor, { count: 2 });

		expect(epochs.length).toBe(2);
		// First Sunday on or after Friday Aug 7 is Sunday Aug 9
		expect(new Date(epochs[0]).toISOString()).toBe('2026-08-09T10:00:00.000Z');
		// Next Sunday is Aug 16
		expect(new Date(epochs[1]).toISOString()).toBe('2026-08-16T10:00:00.000Z');
	});

	test('expandRRuleEpochs handles Sunday and positive/negative nth selectors for MONTHLY', () => {
		// August 2026: 1st is Saturday, 2nd is Sunday, last day is 31st (Monday), last Sunday is 30th
		const anchor = Date.UTC(2026, 7, 1, 9, 0, 0, 0);

		// 1st Sunday of August 2026 -> Aug 2
		const firstSunday = expandRRuleEpochs('FREQ=MONTHLY;BYDAY=1SU', anchor, { count: 1 });
		expect(new Date(firstSunday[0]).toISOString()).toBe('2026-08-02T09:00:00.000Z');

		// Last Sunday of August 2026 -> Aug 30
		const lastSunday = expandRRuleEpochs('FREQ=MONTHLY;BYDAY=-1SU', anchor, { count: 1 });
		expect(new Date(lastSunday[0]).toISOString()).toBe('2026-08-30T09:00:00.000Z');

		// 2nd Tuesday of August 2026 -> Aug 11
		const secondTuesday = expandRRuleEpochs('FREQ=MONTHLY;BYDAY=2TU', anchor, { count: 1 });
		expect(new Date(secondTuesday[0]).toISOString()).toBe('2026-08-11T09:00:00.000Z');
	});

	test('expandRRuleEpochs handles YEARLY with BYMONTH', () => {
		const anchor = Date.UTC(2026, 7, 7, 12, 0, 0, 0);
		const epochs = expandRRuleEpochs('FREQ=YEARLY;BYMONTH=12', anchor, { count: 2 });

		expect(epochs.length).toBe(2);
		expect(new Date(epochs[0]).toISOString()).toBe('2026-12-07T12:00:00.000Z');
		expect(new Date(epochs[1]).toISOString()).toBe('2027-12-07T12:00:00.000Z');

		// BYMONTH=1 produces January candidates
		const janEpochs = expandRRuleEpochs('FREQ=YEARLY;BYMONTH=1', anchor, { count: 2 });
		expect(janEpochs.length).toBe(2);
		expect(new Date(janEpochs[0]).toISOString()).toBe('2026-01-07T12:00:00.000Z');
		expect(new Date(janEpochs[1]).toISOString()).toBe('2027-01-07T12:00:00.000Z');

		// BYMONTH with BYDAY (e.g. 4th Thursday of November)
		// November 2026 Thursdays: Nov 5, 12, 19, 26 (4th is Nov 26)
		const thanksgivingEpochs = expandRRuleEpochs('FREQ=YEARLY;BYMONTH=11;BYDAY=4TH', anchor, { count: 1 });
		expect(thanksgivingEpochs.length).toBe(1);
		expect(new Date(thanksgivingEpochs[0]).toISOString()).toBe('2026-11-26T12:00:00.000Z');
	});

	test('expandRRuleEpochs terminates correctly with UNTIL and COUNT clauses', () => {
		const anchor = Date.UTC(2026, 7, 1, 0, 0, 0, 0);

		// COUNT=3
		const countEpochs = expandRRuleEpochs('FREQ=DAILY;COUNT=3', anchor);
		expect(countEpochs.length).toBe(3);

		// UNTIL=20260804
		const untilEpochs = expandRRuleEpochs('FREQ=DAILY;UNTIL=20260804', anchor);
		expect(untilEpochs.length).toBe(4);
		expect(new Date(untilEpochs[3]).toISOString()).toBe('2026-08-04T00:00:00.000Z');
	});

	test('expandRRuleEpochs filters correctly with BYSETPOS', () => {
		// August 2026 weekdays: Aug 3 (1st weekday), Aug 31 (last weekday)
		const anchor = Date.UTC(2026, 7, 1, 8, 0, 0, 0);

		// 1st weekday of the month
		const firstWeekday = expandRRuleEpochs('FREQ=MONTHLY;BYDAY=MO,TU,WE,TH,FR;BYSETPOS=1', anchor, { count: 1 });
		expect(new Date(firstWeekday[0]).toISOString()).toBe('2026-08-03T08:00:00.000Z');

		// Last weekday of the month
		const lastWeekday = expandRRuleEpochs('FREQ=MONTHLY;BYDAY=MO,TU,WE,TH,FR;BYSETPOS=-1', anchor, { count: 1 });
		expect(new Date(lastWeekday[0]).toISOString()).toBe('2026-08-31T08:00:00.000Z');
	});

	test('getNextRRuleEpoch computes next occurrence including Sunday handling', () => {
		const anchor = Date.UTC(2026, 7, 7, 0, 0, 0, 0); // Friday Aug 7
		const nextDaily = getNextRRuleEpoch('FREQ=DAILY;INTERVAL=1', anchor);
		expect(nextDaily).not.toBeNull();
		expect(new Date(nextDaily!).toISOString()).toBe('2026-08-08T00:00:00.000Z');

		// Next occurrence after Friday Aug 7 for Sunday rule is Sunday Aug 9
		const nextSunday = getNextRRuleEpoch('FREQ=WEEKLY;BYDAY=SU', anchor);
		expect(nextSunday).not.toBeNull();
		expect(new Date(nextSunday!).toISOString()).toBe('2026-08-09T00:00:00.000Z');
	});

	test('expandRRuleEpochs respects smaller of rule.count and options.count', () => {
		const anchor = Date.UTC(2026, 7, 7, 0, 0, 0, 0);
		// rule.count = 10, options.count = 2 -> yields 2
		const epochs1 = expandRRuleEpochs('FREQ=DAILY;COUNT=10', anchor, { count: 2 });
		expect(epochs1.length).toBe(2);

		// rule.count = 2, options.count = 10 -> yields 2
		const epochs2 = expandRRuleEpochs('FREQ=DAILY;COUNT=2', anchor, { count: 10 });
		expect(epochs2.length).toBe(2);

		// neither count provided -> defaults to up to 100
		const epochs3 = expandRRuleEpochs('FREQ=DAILY;INTERVAL=1', anchor);
		expect(epochs3.length).toBe(100);
	});

	test('expandRRuleEpochs skips months that do not have the anchor day for MONTHLY recurrence without BYDAY', () => {
		// Jan 31, 2026 -> Feb has 28 days (skipped), Mar has 31 days (included), Apr has 30 days (skipped), May has 31 days (included)
		const anchor = Date.UTC(2026, 0, 31, 10, 0, 0, 0);
		const epochs = expandRRuleEpochs('FREQ=MONTHLY;INTERVAL=1', anchor, { count: 3 });

		expect(epochs.length).toBe(3);
		expect(new Date(epochs[0]).toISOString()).toBe('2026-01-31T10:00:00.000Z');
		expect(new Date(epochs[1]).toISOString()).toBe('2026-03-31T10:00:00.000Z');
		expect(new Date(epochs[2]).toISOString()).toBe('2026-05-31T10:00:00.000Z');
	});

	test('isRRuleString and isFiniteRRule strictly validate token boundaries', () => {
		expect(isRRuleString('FREQ=DAILYXYZ')).toBe(false);
		expect(isRRuleString('FREQ=DAILY;INTERVAL=1')).toBe(true);
		expect(isFiniteRRule('FREQ=DAILY;XCOUNT=5')).toBe(false);
		expect(isFiniteRRule('FREQ=DAILY;COUNT=5')).toBe(true);
		expect(isFiniteRRule('RRULE:COUNT=5')).toBe(true);
	});

	test('parseRRule rejects invalid calendar dates in 8-digit UNTIL clause', () => {
		const parsed = parseRRule('FREQ=DAILY;UNTIL=20260230');
		expect(parsed.untilMs).toBeUndefined();

		const validParsed = parseRRule('FREQ=DAILY;UNTIL=20260228');
		expect(validParsed.untilMs).toBe(Date.UTC(2026, 1, 28, 23, 59, 59, 999));
	});

	test('getNextRRuleEpoch returns null when no occurrences exist', () => {
		const anchor = Date.UTC(2026, 7, 7, 0, 0, 0, 0);
		const result = getNextRRuleEpoch('FREQ=DAILY;UNTIL=20260801', anchor);
		expect(result).toBeNull();
	});
});
