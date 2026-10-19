import { Tempo } from '@magmacomputing/tempo';
import { DialectsPlugin, DIALECT } from '../src/index.js';

describe('PHP Date Dialect Engine', () => {
	beforeAll(() => {
		Tempo.use(DialectsPlugin);
	});

	it('formats basic date and time with Y-m-d H:i:s', () => {
		const t = new Tempo('2026-10-24T15:30:45Z');
		expect(t.dialects.php('Y-m-d H:i:s')).toBe('2026-10-24 15:30:45');
	});

	it('formats 12-hour clock and meridiem markers', () => {
		const morning = new Tempo('2026-10-24T09:05:07Z');
		const evening = new Tempo('2026-10-24T21:05:07Z');

		expect(morning.dialects.php('h:i:s a')).toBe('09:05:07 am');
		expect(morning.dialects.php('g:i:s A')).toBe('9:05:07 AM');
		expect(evening.dialects.php('h:i:s a')).toBe('09:05:07 pm');
		expect(evening.dialects.php('g:i:s A')).toBe('9:05:07 PM');
	});

	it('formats month and day names and ordinals', () => {
		const t = new Tempo('2026-10-24T12:00:00Z');
		expect(t.dialects.php('l, F jS, Y')).toBe('Saturday, October 24th, 2026');
		expect(t.dialects.php('D, M j, y')).toBe('Sat, Oct 24, 26');
	});

	it('formats timezone offsets with O and P', () => {
		const t = new Tempo('2026-10-24T15:30:45+02:00');
		expect(t.dialects.php('Y-m-d H:i:s P')).toBe('2026-10-24 15:30:45 +02:00');
		expect(t.dialects.php('Y-m-d H:i:s O')).toBe('2026-10-24 15:30:45 +0200');
	});

	it('handles backslash literal escaping in masks', () => {
		const t = new Tempo('2026-10-24T15:30:45Z');
		expect(t.dialects.php('\\T\\o\\d\\a\\y \\i\\s Y-m-d')).toBe('Today is 2026-10-24');
		expect(t.dialects.php('H\\hi\\m')).toBe('15h30m');
	});

	it('formats ISO 8601 (c) and RFC 2822 (r) compounds', () => {
		const t = new Tempo('2026-10-24T15:30:45+02:00');
		expect(t.dialects.php('c')).toBe('2026-10-24T15:30:45+02:00');
		expect(t.dialects.php('r')).toBe('Sat, 24 Oct 2026 15:30:45 +0200');
	});

	it('parses formatted PHP date strings', () => {
		const parsed = Tempo.dialects.parse('2026-10-24 15:30:45', 'Y-m-d H:i:s', DIALECT.Php, { timeZone: 'UTC' });
		expect(parsed.iso).toBe('2026-10-24T15:30:45Z');

		const shortParsed = Tempo.dialects.parse('24/10/26 3:30 PM', 'd/m/y g:i A', DIALECT.Php, { timeZone: 'UTC' });
		expect(shortParsed.iso).toBe('2026-10-24T15:30:00Z');

		// Day of year z (2026-10-24 is day 297, 0-indexed is 296)
		const doyParsed = Tempo.dialects.parse('2026-296', 'Y-z', DIALECT.Php, { timeZone: 'UTC' });
		expect(doyParsed.yy).toBe(2026);
		expect(doyParsed.mm).toBe(10);
		expect(doyParsed.dd).toBe(24);
	});

	it('parses compound masks c and r', () => {
		const parsedC = Tempo.dialects.parse('2026-10-24T15:30:45+02:00', 'c', DIALECT.Php);
		expect(parsedC.isValid).toBe(true);
		expect(parsedC.yy).toBe(2026);
		expect(parsedC.mm).toBe(10);
		expect(parsedC.dd).toBe(24);
		expect(parsedC.hh).toBe(15);
		expect(parsedC.mi).toBe(30);
		expect(parsedC.ss).toBe(45);
		expect(parsedC.toDateTime().offset).toBe('+02:00');

		const parsedR = Tempo.dialects.parse('Sat, 24 Oct 2026 15:30:45 +0200', 'r', DIALECT.Php);
		expect(parsedR.isValid).toBe(true);
		expect(parsedR.yy).toBe(2026);
		expect(parsedR.mm).toBe(10);
		expect(parsedR.dd).toBe(24);
		expect(parsedR.hh).toBe(15);
		expect(parsedR.mi).toBe(30);
		expect(parsedR.ss).toBe(45);
		expect(parsedR.toDateTime().offset).toBe('+02:00');
	});

	it('compiles parser without throwing on repeated layout tokens', () => {
		const parsed = Tempo.dialects.parse('2026-10-24 (2026)', 'Y-m-d (Y)', DIALECT.Php, { timeZone: 'UTC' });
		expect(parsed.yy).toBe(2026);
		expect(parsed.mm).toBe(10);
		expect(parsed.dd).toBe(24);
	});

	it('parses negative epoch seconds for pre-1970 dates (U)', () => {
		const parsed = Tempo.dialects.parse('-60', 'U', DIALECT.Php, { timeZone: 'UTC' });
		expect(parsed.isValid).toBe(true);
		expect(parsed.yy).toBe(1969);
		expect(parsed.mm).toBe(12);
		expect(parsed.dd).toBe(31);
		expect(parsed.hh).toBe(23);
		expect(parsed.mi).toBe(59);
		expect(parsed.ss).toBe(0);

		// Format and parse round-trip
		const pre1970 = new Tempo('1955-11-05T06:00:00Z');
		const formattedU = pre1970.dialects.php('U');
		expect(Number(formattedU)).toBeLessThan(0);
		const roundTripped = Tempo.dialects.parse(formattedU, 'U', DIALECT.Php, { timeZone: 'UTC' });
		expect(roundTripped.iso).toBe('1955-11-05T06:00:00Z');

		const parsedCal = Tempo.dialects.parse('0', 'U', DIALECT.Php, { timeZone: 'UTC', calendar: 'gregory' });
		expect(parsedCal.toDateTime().calendarId).toBe('gregory');
	});

	it('round-trips timezone identifiers containing hyphens and colons via e', () => {
		const tEtc = new Tempo('2026-10-24T15:30:00[Etc/GMT-14]');
		const formattedEtc = tEtc.dialects.php('Y-m-d H:i:s e');
		expect(formattedEtc).toBe('2026-10-24 15:30:00 Etc/GMT-14');
		const parsedEtc = Tempo.dialects.parse(formattedEtc, 'Y-m-d H:i:s e', DIALECT.Php);
		expect(parsedEtc.isValid).toBe(true);
		expect(parsedEtc.toDateTime().timeZoneId).toBe('Etc/GMT-14');

		const tOffset = new Tempo('2026-10-24T15:30:00+05:30', { timeZone: '+05:30' });
		const formattedOffset = tOffset.dialects.php('Y-m-d H:i:s e');
		expect(formattedOffset).toBe('2026-10-24 15:30:00 +05:30');
		const parsedOffset = Tempo.dialects.parse(formattedOffset, 'Y-m-d H:i:s e', DIALECT.Php);
		expect(parsedOffset.isValid).toBe(true);
		expect(parsedOffset.toDateTime().timeZoneId).toBe('+05:30');
	});

	it('explains PHP masks to Tempo IR', () => {
		const res = Tempo.dialects.explain('Y-m-d H:i:s', DIALECT.Php);
		expect(res.pattern).toBe('{yyyy}-{mm}-{dd} {hh}:{mi}:{ss}');
		expect(res.tokens.length).toBe(6);
	});

	it('exports Tempo IR to PHP masks', () => {
		const res = Tempo.dialects.export('{yyyy}-{mm}-{dd} {hh}:{mi}:{ss}', DIALECT.Php);
		expect(res.pattern).toBe('Y-m-d H:i:s');
	});

	it('parses and round-trips ISO week and auxiliary date tokens (o, W, N, w, t)', () => {
		const t = new Tempo('2026-10-24T12:00:00Z', { timeZone: 'UTC' });
		// 2026-10-24 is ISO week 43, Saturday (N = 6, w = 6), daysInMonth (t = 31)
		expect(t.dialects.php('o-\\WW-N')).toBe('2026-W43-6');
		expect(t.dialects.php('o-\\WW-w')).toBe('2026-W43-6');
		expect(t.dialects.php('Y-m-d t')).toBe('2026-10-24 31');

		const parsedIsoWeekN = Tempo.dialects.parse('2026-W43-6', 'o-\\WW-N', DIALECT.Php, { timeZone: 'UTC' });
		expect(parsedIsoWeekN.isValid).toBe(true);
		expect(parsedIsoWeekN.iso).toBe('2026-10-24T00:00:00Z');

		const parsedIsoWeekW = Tempo.dialects.parse('2026-W43-6', 'o-\\WW-w', DIALECT.Php, { timeZone: 'UTC' });
		expect(parsedIsoWeekW.isValid).toBe(true);
		expect(parsedIsoWeekW.iso).toBe('2026-10-24T00:00:00Z');

		const parsedDaysInMonth = Tempo.dialects.parse('2026-10-24 31', 'Y-m-d t', DIALECT.Php, { timeZone: 'UTC' });
		expect(parsedDaysInMonth.isValid).toBe(true);
		expect(parsedDaysInMonth.iso).toBe('2026-10-24T00:00:00Z');
	});

	it('rejects contradictions in weekday (N, w) and days in month (t)', () => {
		// Oct 24 2026 is Saturday (N = 6, w = 6). Monday (N = 1, w = 1) is a mismatch.
		const mismatchN = Tempo.dialects.parse('2026-10-24 1', 'Y-m-d N', DIALECT.Php, { error: 'catch' });
		expect(mismatchN.isValid).toBe(false);

		const mismatchW = Tempo.dialects.parse('2026-10-24 0', 'Y-m-d w', DIALECT.Php, { error: 'catch' });
		expect(mismatchW.isValid).toBe(false);

		// October has 31 days. 30 is a mismatch.
		const mismatchT = Tempo.dialects.parse('2026-10-24 30', 'Y-m-d t', DIALECT.Php, { error: 'catch' });
		expect(mismatchT.isValid).toBe(false);
	});
});
