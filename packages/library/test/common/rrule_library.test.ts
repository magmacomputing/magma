import { isRRuleString, parseRRule, expandRRuleEpochs, getNextRRuleEpoch } from '../../src/common/rrule.library.js';

describe('rrule.library', () => {
	test('isRRuleString identifies valid RRULE patterns', () => {
		expect(isRRuleString('FREQ=DAILY')).toBe(true);
		expect(isRRuleString('RRULE:FREQ=WEEKLY;BYDAY=MO')).toBe(true);
		expect(isRRuleString('FREQ=MONTHLY;BYDAY=1MO,3MO')).toBe(true);
		expect(isRRuleString('hello world')).toBe(false);
		expect(isRRuleString('2026-08-07')).toBe(false);
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

	test('parseRRule supports 2-letter, 3-letter, and full weekday names and normalizes to standard RFC 2-letter codes', () => {
		const parsed = parseRRule('FREQ=WEEKLY;BYDAY=Monday,FRI,Wed,2Thursday');
		expect(parsed.byDay).toEqual([
			{ nth: undefined, day: 'MO' },
			{ nth: undefined, day: 'FR' },
			{ nth: undefined, day: 'WE' },
			{ nth: 2, day: 'TH' }
		]);
	});

	test('parseRRule supports numeric, 3-letter, and full month names in BYMONTH', () => {
		const parsed = parseRRule('FREQ=YEARLY;BYMONTH=1,Jan,December,AUG');
		expect(parsed.byMonth).toEqual([1, 1, 12, 8]);
	});

	test('expandRRuleEpochs generates correct occurrence timestamps', () => {
		// 2026-08-07T00:00:00.000Z is Friday
		const anchor = Date.UTC(2026, 7, 7, 0, 0, 0, 0);
		const epochs = expandRRuleEpochs('FREQ=DAILY;INTERVAL=1', anchor, { count: 3 });

		expect(epochs.length).toBe(3);
		expect(new Date(epochs[0]).toISOString()).toBe('2026-08-07T00:00:00.000Z');
		expect(new Date(epochs[1]).toISOString()).toBe('2026-08-08T00:00:00.000Z');
		expect(new Date(epochs[2]).toISOString()).toBe('2026-08-09T00:00:00.000Z');
	});

	test('getNextRRuleEpoch computes next occurrence', () => {
		const anchor = Date.UTC(2026, 7, 7, 0, 0, 0, 0);
		const nextMs = getNextRRuleEpoch('FREQ=DAILY;INTERVAL=1', anchor);
		expect(new Date(nextMs).toISOString()).toBe('2026-08-08T00:00:00.000Z');
	});
});
