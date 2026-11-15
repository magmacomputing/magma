import { Tempo } from '#tempo';
import { getTemporalEra } from '#library/temporal.library.js';

describe('Era Parsing Engine', () => {
	test('parses year and era (trailing BC)', () => {
		const t = new Tempo('200 BC');
		expect(t.yy).toBe(-199);
		expect(t.mm).toBe(1);
		expect(t.dd).toBe(1);
		expect(t.era).toBe('bce');
	});

	test('parses year and era (leading BC)', () => {
		const t = new Tempo('BC 200');
		expect(t.yy).toBe(-199);
		expect(t.mm).toBe(1);
		expect(t.dd).toBe(1);
		expect(t.era).toBe('bce');
	});

	test('parses year and era (trailing BCE)', () => {
		const t = new Tempo('200 BCE');
		expect(t.yy).toBe(-199);
		expect(t.era).toBe('bce');
	});

	test('parses year and era (trailing AD)', () => {
		const t = new Tempo('1 AD');
		expect(t.yy).toBe(1);
		expect(t.mm).toBe(1);
		expect(t.dd).toBe(1);
		expect(t.era).toBe('ce');
	});

	test('parses year and era (trailing b.c.)', () => {
		const t = new Tempo('200 b.c.');
		expect(t.yy).toBe(-199);
		expect(t.era).toBe('bce');
	});

	test('parses year and era (trailing a.d.)', () => {
		const t = new Tempo('1 a.d.');
		expect(t.yy).toBe(1);
		expect(t.era).toBe('ce');
	});

	test('parses year and era (trailing CE)', () => {
		const t = new Tempo('2026 CE');
		expect(t.yy).toBe(2026);
		expect(t.era).toBe('ce');
	});

	test('parses 1 BC as Astronomical Year 0', () => {
		const t = new Tempo('1 BC');
		expect(t.yy).toBe(0);
	});

	test('parses full date with era (Ides of March)', () => {
		const t = new Tempo('15 March 44 BC');
		expect(t.yy).toBe(-43);
		expect(t.mm).toBe(3);
		expect(t.dd).toBe(15);
		expect(t.era).toBe('bce');
	});

	test('implicit defaults assume CE when omitted', () => {
		const t = new Tempo('2026');
		// Note: single year parsing depends on pivot logic and anchor, but in general '2026' without era is parsed as 2026 CE.
		// Wait, parsing '2026' alone might not trigger Token.ye layout if there's no era.
		// If it hits Token.dt/Token.dmy with just a year, it falls back to anchor/current date. 
		// Actually, testing implicit CE on a full date string:
		const tFull = new Tempo('15 March 2026');
		expect(tFull.yy).toBe(2026);
		expect(tFull.era).toBe('ce');
		expect(tFull.eon).toBe(2026);
	});

	test('provides humanized era and eon fallbacks on iso8601 calendar', () => {
		const ce = new Tempo('2026-10-24T12:00:00Z', { calendar: 'iso8601' });
		expect(ce.cal).toBe('iso8601');
		expect(ce.era).toBe('ce');
		expect(ce.eon).toBe(2026);
		expect(ce.zdt.era).toBeUndefined();
		expect(ce.zdt.eraYear).toBeUndefined();

		const yearZero = new Tempo('0000-01-01T00:00:00Z', { calendar: 'iso8601' });
		expect(yearZero.yy).toBe(0);
		expect(yearZero.era).toBe('bce');
		expect(yearZero.eon).toBe(1);

		const bce = new Tempo('-000043-03-15T00:00:00Z', { calendar: 'iso8601' });
		expect(bce.yy).toBe(-43);
		expect(bce.era).toBe('bce');
		expect(bce.eon).toBe(44);
	});

	test('normalizes legacy polyfill gregory and gregory-inverse era identifiers', () => {
		expect(getTemporalEra({ year: 2026, era: 'gregory', eraYear: 2026 })).toEqual({ era: 'ce', eraYear: 2026 });
		expect(getTemporalEra({ year: -199, era: 'gregory-inverse', eraYear: 200 })).toEqual({ era: 'bce', eraYear: 200 });
	});
});
