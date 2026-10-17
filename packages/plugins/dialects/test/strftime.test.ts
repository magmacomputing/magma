import { Tempo } from '@magmacomputing/tempo';
import { DialectsPlugin, DIALECT } from '../src/index.js';
import { compileStrftimeFormatter } from '../src/compiler/strftime.compiler.js';

describe('POSIX strftime Formatting & Parsing', () => {
	Tempo.use(DialectsPlugin);

	const dt = new Tempo('2026-10-24T15:30:45');

	it('formats standard strftime specifiers', () => {
		expect(dt.format('%Y-%m-%d %H:%M:%S', { dialect: DIALECT.Strftime })).toBe('2026-10-24 15:30:45');
		expect(dt.format('%B %d, %Y (%A)', { dialect: DIALECT.Strftime })).toBe('October 24, 2026 (Saturday)');

		const tzDt = new Tempo('2026-10-24T15:30:45+02:00[Europe/Paris]');
		expect(tzDt.format('%Y-%m-%d %H:%M:%S %z %Z', { dialect: DIALECT.Strftime })).toBe('2026-10-24 15:30:45 +0200 Europe/Paris');

		const negDt = new Tempo('-000005-10-24T15:30:45Z');
		expect(negDt.format('%y', { dialect: DIALECT.Strftime })).toBe('95');

		const pre1970 = new Tempo('1969-12-31T23:59:59.500Z');
		expect(pre1970.format('%s', { dialect: DIALECT.Strftime })).toBe('-1');
	});

	it('auto-detects strftime dialect when mask contains % specifiers', () => {
		expect(dt.dialects.format('%F %T')).toBe('2026-10-24 15:30:45');
		expect(dt.dialects.strftime('%Y/%m/%d')).toBe('2026/10/24');

		// Quoted percent in LDML does not trigger strftime
		expect(dt.dialects.format("yyyy-MM-dd '100%'")).toBe('2026-10-24 100%');
	});

	it('parses %f microsecond precision properly splitting ms and us', () => {
		const t = Tempo.dialects.parse('2026-10-24 15:30:45.123456', '%Y-%m-%d %H:%M:%S.%f', DIALECT.Strftime);
		expect(t.isValid).toBe(true);
		expect(t.ms).toBe(123);
		expect(t.toDateTime().microsecond).toBe(456);
	});

	it('returns invalid when strftime textual month is unrecognized', () => {
		const t = Tempo.dialects.parse('24-InvalidMonth-2026', '%d-%B-%Y', DIALECT.Strftime, { error: 'catch' });
		expect(t.isValid).toBe(false);
	});

	it('parses strings with weekday names (%A, %a)', () => {
		const t1 = Tempo.dialects.parse('October 24, 2026 (Saturday)', '%B %d, %Y (%A)', DIALECT.Strftime);
		expect(t1.isValid).toBe(true);
		expect(t1.yy).toBe(2026);
		expect(t1.mm).toBe(10);
		expect(t1.dd).toBe(24);

		const t2 = Tempo.dialects.parse('Sat, 24 Oct 2026', '%a, %d %b %Y', DIALECT.Strftime);
		expect(t2.isValid).toBe(true);
		expect(t2.yy).toBe(2026);
		expect(t2.mm).toBe(10);
		expect(t2.dd).toBe(24);
	});

	it('parses strings formatted with strftime specifiers', () => {
		const t = Tempo.dialects.parse('2026-10-24 15:30:45', '%Y-%m-%d %H:%M:%S', DIALECT.Strftime);
		expect(t.isValid).toBe(true);
		expect(t.yy).toBe(2026);
		expect(t.mm).toBe(10);
		expect(t.dd).toBe(24);
		expect(t.hh).toBe(15);
		expect(t.mi).toBe(30);
		expect(t.ss).toBe(45);
	});

	it('parses day of year %j correctly', () => {
		const t = Tempo.dialects.parse('2026-100', '%Y-%j', DIALECT.Strftime);
		expect(t.isValid).toBe(true);
		expect(t.yy).toBe(2026);
		expect(t.mm).toBe(4);
		expect(t.dd).toBe(10);
	});

	it('parses compound masks (%F %T) with repeated groups safely', () => {
		const t = Tempo.dialects.parse('2026-10-24 15:30:45', '%F %T', DIALECT.Strftime);
		expect(t.isValid).toBe(true);
		expect(t.yy).toBe(2026);
		expect(t.mm).toBe(10);
		expect(t.dd).toBe(24);
		expect(t.hh).toBe(15);
		expect(t.mi).toBe(30);
		expect(t.ss).toBe(45);
	});

	it('formats and parses unpadded flags and variable width fractional seconds', () => {
		const dtFrac = new Tempo('2026-05-04T09:08:07.123456');
		expect(dtFrac.format('%-d/%-m/%Y %-H:%-M:%-S.%3f', { dialect: DIALECT.Strftime })).toBe('4/5/2026 9:8:7.123');
		expect(dtFrac.format('%Y-%m-%d %H:%M:%S.%f', { dialect: DIALECT.Strftime })).toBe('2026-05-04 09:08:07.123456');

		const parsed = Tempo.dialects.parse('4/5/2026 9:8:7.123', '%-d/%-m/%Y %-H:%-M:%-S.%3f', DIALECT.Strftime);
		expect(parsed.isValid).toBe(true);
		expect(parsed.dd).toBe(4);
		expect(parsed.mm).toBe(5);
		expect(parsed.hh).toBe(9);
		expect(parsed.ms).toBe(123);

		// %9f nanosecond precision format & parse
		const dtNano = new Tempo('2026-05-04T09:08:07.123456789');
		expect(dtNano.format('%Y-%m-%d %H:%M:%S.%9f', { dialect: DIALECT.Strftime })).toBe('2026-05-04 09:08:07.123456789');
		const parsedNano = Tempo.dialects.parse('2026-05-04 09:08:07.123456789', '%Y-%m-%d %H:%M:%S.%9f', DIALECT.Strftime);
		expect(parsedNano.isValid).toBe(true);
		expect(parsedNano.ms).toBe(123);
		expect(parsedNano.toDateTime().microsecond).toBe(456);
		expect(parsedNano.toDateTime().nanosecond).toBe(789);
	});

	it('formats and parses space-padded %e (day) and %l (hour)', () => {
		const dtSingle = new Tempo('2026-05-04T09:08:07');
		// Single digit day and hour should have leading space
		expect(dtSingle.format('%e', { dialect: DIALECT.Strftime })).toBe(' 4');
		expect(dtSingle.format('%l', { dialect: DIALECT.Strftime })).toBe(' 9');
		// With unpadded flag '-'
		expect(dtSingle.format('%-e', { dialect: DIALECT.Strftime })).toBe('4');
		expect(dtSingle.format('%-l', { dialect: DIALECT.Strftime })).toBe('9');

		// Parse space-padded input
		const parsedSpaced = Tempo.dialects.parse('2026-05- 4  9:08:07 AM', '%Y-%m-%e %l:%M:%S %p', DIALECT.Strftime);
		expect(parsedSpaced.isValid).toBe(true);
		expect(parsedSpaced.dd).toBe(4);
		expect(parsedSpaced.hh).toBe(9);

		// Double-digit day and hour without leading space
		const dtDouble = new Tempo('2026-10-24T11:08:07');
		expect(dtDouble.format('%e', { dialect: DIALECT.Strftime })).toBe('24');
		expect(dtDouble.format('%l', { dialect: DIALECT.Strftime })).toBe('11');
	});

	it('formats ISO week of year (%V, %-V)', () => {
		const dtWeek43 = new Tempo('2026-10-24T15:30:45');
		expect(dtWeek43.format('%V', { dialect: DIALECT.Strftime })).toBe('43');
		expect(dtWeek43.format('%-V', { dialect: DIALECT.Strftime })).toBe('43');

		const dtWeek2 = new Tempo('2026-01-05T12:00:00');
		expect(dtWeek2.format('%V', { dialect: DIALECT.Strftime })).toBe('02');
		expect(dtWeek2.format('%-V', { dialect: DIALECT.Strftime })).toBe('2');

		// With a non-ISO calendar, %V, %G, and %g still derive ISO 8601 values
		const dtHebrew = new Tempo('2026-10-24T15:30:45', { calendar: 'hebrew' });
		expect(dtHebrew.format('%V', { dialect: DIALECT.Strftime })).toBe('43');
		expect(dtHebrew.format('%G', { dialect: DIALECT.Strftime })).toBe('2026');
		expect(dtHebrew.format('%g', { dialect: DIALECT.Strftime })).toBe('26');

		// Fallback when ISO week retrieval fails
		const formatV = compileStrftimeFormatter('%V');
		expect(formatV({} as any)).toBe('%V');
		expect(formatV({ withCalendar: () => { throw new Error('fail'); } } as any)).toBe('%V');
	});

	it('parses ISO week-year and week dates (%G, %g, %V, %u, %w)', () => {
		const parsed1 = Tempo.dialects.parse('2026-43-6', '%G-%V-%u', DIALECT.Strftime);
		expect(parsed1.isValid).toBe(true);
		expect(parsed1.format('{yyyy}-{mm}-{dd}')).toBe('2026-10-24');

		const parsedSunday = Tempo.dialects.parse('2026-43-0', '%G-%V-%w', DIALECT.Strftime);
		expect(parsedSunday.isValid).toBe(true);
		expect(parsedSunday.format('{yyyy}-{mm}-{dd}')).toBe('2026-10-25');

		const parsed2Digit = Tempo.dialects.parse('26-43-6', '%g-%V-%u', DIALECT.Strftime);
		expect(parsed2Digit.isValid).toBe(true);
		expect(parsed2Digit.format('{yyyy}-{mm}-{dd}')).toBe('2026-10-24');

		const parsedIsoCal = Tempo.dialects.parse('2026-10-24', '%G-%m-%d', DIALECT.Strftime);
		expect(parsedIsoCal.isValid).toBe(true);
		expect(parsedIsoCal.format('{yyyy}-{mm}-{dd}')).toBe('2026-10-24');
	});
});

