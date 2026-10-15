import { Tempo } from '@magmacomputing/tempo';
import { DialectsPlugin, DIALECT } from '../src/index.js';

describe('Go Reference Time Dialect Engine', () => {
	beforeAll(() => {
		Tempo.use(DialectsPlugin);
	});

	it('formats basic date and time with 2006-01-02 15:04:05', () => {
		const t = new Tempo('2026-10-24T15:30:45Z');
		expect(t.dialects.go('2006-01-02 15:04:05')).toBe('2026-10-24 15:30:45');
	});

	it('formats 12-hour clock, unpadded components, and meridiem', () => {
		const morning = new Tempo('2026-10-24T09:05:07Z');
		const evening = new Tempo('2026-10-24T21:05:07Z');

		expect(morning.dialects.go('January 2, 2006 at 3:04:05 PM')).toBe('October 24, 2026 at 9:05:07 AM');
		expect(evening.dialects.go('Jan 2, 06 at 3:04:05 pm')).toBe('Oct 24, 26 at 9:05:07 pm');
	});

	it('formats weekday and day of year reference tokens', () => {
		const t = new Tempo('2026-10-24T12:00:00Z');
		expect(t.dialects.go('Monday, Mon, day 002 of 2006')).toBe('Saturday, Sat, day 297 of 2026');
	});

	it('formats subseconds and RFC 3339 layout', () => {
		const t = new Tempo('2026-10-24T15:30:45.123456789+02:00');
		expect(t.dialects.go('2006-01-02T15:04:05Z07:00')).toBe('2026-10-24T15:30:45+02:00');
		expect(t.dialects.go('2006-01-02T15:04:05.000Z07:00')).toBe('2026-10-24T15:30:45.123+02:00');
		expect(t.dialects.go('2006-01-02T15:04:05.000000Z07:00')).toBe('2026-10-24T15:30:45.123456+02:00');
	});

	it('parses formatted Go date strings', () => {
		const parsed = Tempo.dialects.parse('2026-10-24 15:30:45', '2006-01-02 15:04:05', DIALECT.Go, { timeZone: 'UTC' });
		expect(parsed.iso).toBe('2026-10-24T15:30:45Z');

		const shortParsed = Tempo.dialects.parse('24/10/2026 15:30', '02/01/2006 15:04', DIALECT.Go, { timeZone: 'UTC' });
		expect(shortParsed.iso).toBe('2026-10-24T15:30:00Z');

		// Day of year 002 (2026-10-24 is day 297)
		const doyParsed = Tempo.dialects.parse('2026-297', '2006-002', DIALECT.Go, { timeZone: 'UTC' });
		expect(doyParsed.yy).toBe(2026);
		expect(doyParsed.mm).toBe(10);
		expect(doyParsed.dd).toBe(24);
	});

	it('auto-detects Go layout in explain', () => {
		const res = Tempo.dialects.explain('2006-01-02 15:04:05');
		expect(res.dialect).toBe(DIALECT.Go);
		expect(res.pattern).toBe('{yyyy}-{mm}-{dd} {hh}:{mi}:{ss}');
	});

	it('exports Tempo IR to Go layout', () => {
		const res = Tempo.dialects.export('{yyyy}-{mm}-{dd} {hh}:{mi}:{ss}', DIALECT.Go);
		expect(res.pattern).toBe('2006-01-02 15:04:05');
	});

	it('cross-converts between Go, PHP, and Oracle', () => {
		// Go to PHP
		const go2php = Tempo.dialects.convert('2006-01-02 15:04:05', DIALECT.Go, DIALECT.Php);
		expect(go2php.pattern).toBe('Y-m-d H:i:s');

		// PHP to Go
		const php2go = Tempo.dialects.convert('Y-m-d H:i:s', DIALECT.Php, DIALECT.Go);
		expect(php2go.pattern).toBe('2006-01-02 15:04:05');

		// Go to Oracle
		const go2oracle = Tempo.dialects.convert('2006-01-02 15:04:05', DIALECT.Go, DIALECT.Oracle);
		expect(go2oracle.pattern).toBe('YYYY-MM-DD HH24:MI:SS');
	});
});
