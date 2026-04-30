import { Tempo } from '#tempo';

describe('layout matching order', () => {
	beforeEach(() => {
		Tempo.init();
	});

	test('uses month-day-year first for US timezone on compact 8-digit input', () => {
		const t = new Tempo('04012026', { timeZone: 'America/New_York' });
		const first = t.parse.result?.[0];

		expect(t.yy).toBe(2026);
		expect(t.mm).toBe(4);
		expect(t.dd).toBe(1);
		expect(first?.match).toBe('date');
		expect(first?.groups?.yy).toBe('2026');
		expect(first?.groups?.mm).toBe('04');
		expect(first?.groups?.dd).toBe('01');
		expect(first?.groups?.nbr).toBeUndefined();
	});

	test('uses day-month-year first for UK timezone on compact 8-digit input', () => {
		const t = new Tempo('04012026', { timeZone: 'Europe/London' });
		const first = t.parse.result?.[0];

		expect(t.yy).toBe(2026);
		expect(t.mm).toBe(1);
		expect(t.dd).toBe(4);
		expect(first?.match).toBe('date');
		expect(first?.groups?.yy).toBe('2026');
		expect(first?.groups?.mm).toBe('01');
		expect(first?.groups?.dd).toBe('04');
		expect(first?.groups?.nbr).toBeUndefined();
	});

	test('falls back to compact 6-digit date when input is not a valid hhmiss time', () => {
		const t = new Tempo('310559', { timeZone: 'Europe/London' });
		const first = t.parse.result?.[0];

		expect(t.yy).toBe(1959);
		expect(t.mm).toBe(5);
		expect(t.dd).toBe(31);
		expect(first?.match).toBe('dayMonthYearShort');
		expect(first?.groups?.yy).toBe('59');
		expect(first?.groups?.mm).toBe('05');
		expect(first?.groups?.dd).toBe('31');
	});

	test('falls back to the only valid compact 6-digit date layout even in month-day locales', () => {
		const t = new Tempo('310559', { timeZone: 'America/New_York' });
		const first = t.parse.result?.[0];

		expect(t.yy).toBe(1959);
		expect(t.mm).toBe(5);
		expect(t.dd).toBe(31);
		expect(first?.match).toBe('dayMonthYearShort');
	});

	test('keeps slash-separated ambiguous date aligned with timezone preference', () => {
		const us = new Tempo('04/01/2026', { timeZone: 'America/New_York' });
		const uk = new Tempo('04/01/2026', { timeZone: 'Europe/London' });

		expect(us.mm).toBe(4);
		expect(us.dd).toBe(1);
		expect(us.parse.result?.[0]?.match).toBe('date');
		expect(us.parse.result?.[0]?.groups?.mm).toBe('04');
		expect(us.parse.result?.[0]?.groups?.dd).toBe('01');

		expect(uk.mm).toBe(1);
		expect(uk.dd).toBe(4);
		expect(uk.parse.result?.[0]?.match).toBe('date');
		expect(uk.parse.result?.[0]?.groups?.mm).toBe('01');
		expect(uk.parse.result?.[0]?.groups?.dd).toBe('04');
	});

	test('still resolves explicit relative expression via relativeOffset layout', () => {
		const t = new Tempo('2 days ago', { timeZone: 'UTC' });
		const first = t.parse.result?.[0];

		expect(first?.match).toBe('relativeOffset');
	});

	test('keeps current precedence: single-digit numeric input resolves as time before offset', () => {
		const t = new Tempo('6', { timeZone: 'UTC' });
		const first = t.parse.result?.[0];

		expect(t.isValid).toBe(true);
		expect(first?.match).toBe('time');
		expect(t.hh).toBe(6);
		expect(t.mi).toBe(0);
	});

	test('still allows explicit day-offset syntax to resolve via offset layout', () => {
		const t = new Tempo('+6', { timeZone: 'UTC' });
		const first = t.parse.result?.[0];

		expect(t.isValid).toBe(true);
		expect(first?.match).toBe('offset');
	});

	test('parses compact yymmdd (ymd6) correctly regardless of locale', () => {
		const us = new Tempo('590531', { timeZone: 'America/New_York' });
		const uk = new Tempo('590531', { timeZone: 'Europe/London' });

		// ymd6 is unambiguous — timezone should not change the interpretation
		for (const t of [us, uk]) {
			expect(t.yy).toBe(1959);
			expect(t.mm).toBe(5);
			expect(t.dd).toBe(31);
			expect(t.parse.result?.[0]?.match).toBe('yearMonthDayShort');
		}
	});

	test('supports layoutOrder option to customize precedence', () => {
		Tempo.init({ layoutOrder: ['dt', 'wkd'] });
		const t = new Tempo('monday', { timeZone: 'UTC' });

		expect(Tempo.parse.layoutOrder).toEqual(['dt', 'wkd']);
		expect(t.parse.result?.[0]?.match).toBe('date');
	});
});
