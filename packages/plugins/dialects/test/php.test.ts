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

	it('explains PHP masks to Tempo IR', () => {
		const res = Tempo.dialects.explain('Y-m-d H:i:s', DIALECT.Php);
		expect(res.pattern).toBe('{yyyy}-{mm}-{dd} {hh}:{mi}:{ss}');
		expect(res.tokens.length).toBe(6);
	});

	it('exports Tempo IR to PHP masks', () => {
		const res = Tempo.dialects.export('{yyyy}-{mm}-{dd} {hh}:{mi}:{ss}', DIALECT.Php);
		expect(res.pattern).toBe('Y-m-d H:i:s');
	});
});
