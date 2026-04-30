import { Tempo } from '#tempo';

describe('compact hhmiss parsing', () => {
	beforeEach(() => {
		Tempo.init();
	});

	test('parses 093015 as 09:30:15', () => {
		const t = new Tempo('093015', { timeZone: 'UTC' });

		expect(t.hh).toBe(9);
		expect(t.mi).toBe(30);
		expect(t.ss).toBe(15);
		expect(t.parse.result?.[0]?.match).toBe('hourMinuteSecond');
	});

	test('parses 235959 as 23:59:59', () => {
		const t = new Tempo('235959', { timeZone: 'UTC' });

		expect(t.hh).toBe(23);
		expect(t.mi).toBe(59);
		expect(t.ss).toBe(59);
		expect(t.parse.result?.[0]?.match).toBe('hourMinuteSecond');
	});

	test('supports 240000 rollover to next day at 00:00:00', () => {
		const anchor = new Tempo('2026-04-01T12:00:00', { timeZone: 'UTC' });
		const t = new Tempo('240000', { timeZone: 'UTC', anchor: anchor.toDateTime() });

		expect(t.hh).toBe(0);
		expect(t.mi).toBe(0);
		expect(t.ss).toBe(0);
		expect(t.dd).toBe(2);
		expect(t.parse.result?.[0]?.match).toBe('hourMinuteSecond');
	});

	test('keeps valid hhmiss ahead of compact 6-digit date layouts', () => {
		const t = new Tempo('110559', { timeZone: 'Europe/London' });

		expect(t.hh).toBe(11);
		expect(t.mi).toBe(5);
		expect(t.ss).toBe(59);
		expect(t.parse.result?.[0]?.match).toBe('hourMinuteSecond');
	});

	test('does not regress compact date parsing for 8-digit input', () => {
		const us = new Tempo('04012026', { timeZone: 'America/New_York' });
		const uk = new Tempo('04012026', { timeZone: 'Europe/London' });

		expect(us.mm).toBe(4);
		expect(us.dd).toBe(1);
		expect(uk.mm).toBe(1);
		expect(uk.dd).toBe(4);
	});
});
