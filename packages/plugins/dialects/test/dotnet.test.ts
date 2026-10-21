import { Tempo } from '@magmacomputing/tempo/core';
import { FormatModule } from '@magmacomputing/tempo/format';
import { ParseModule } from '@magmacomputing/tempo/parse';
import { DialectsPlugin, DIALECT, DOTNET_TOKENS } from '../src/index.js';
import { compileDotNetFormatter } from '../src/compiler/dotnet.compiler.js';

describe('.NET Date and Time Format Dialect', () => {
	beforeAll(() => {
		Tempo.use(FormatModule);
		Tempo.use(ParseModule);
		Tempo.use(DialectsPlugin);
	});

	const dtString = '2026-10-24T15:30:45.1234567+10:00';

	describe('Formatting', () => {
		it('formats standard .NET date-time pattern', () => {
			const t = new Tempo(dtString);
			expect(t.dialects.dotnet('yyyy-MM-dd HH:mm:ss')).toBe('2026-10-24 15:30:45');
		});

		it('formats month and weekday names', () => {
			const t = new Tempo(dtString);
			expect(t.dialects.dotnet('dddd, MMMM d, yyyy')).toBe('Saturday, October 24, 2026');
			expect(t.dialects.dotnet('ddd, MMM d, yy')).toBe('Sat, Oct 24, 26');
		});

		it('formats 12-hour and 24-hour clocks with AM/PM designators', () => {
			const t = new Tempo(dtString);
			expect(t.dialects.dotnet('hh:mm:ss tt')).toBe('03:30:45 PM');
			expect(t.dialects.dotnet('h:m:s t')).toBe('3:30:45 P');
			expect(t.dialects.dotnet('HH:mm:ss')).toBe('15:30:45');
			expect(t.dialects.dotnet('H:m:s')).toBe('15:30:45');
		});

		it('formats fractional seconds with varying precision', () => {
			const t = new Tempo(dtString);
			expect(t.dialects.dotnet('ss.fff')).toBe('45.123');
			expect(t.dialects.dotnet('ss.ffffff')).toBe('45.123456');
			expect(t.dialects.dotnet('ss.fffffff')).toBe('45.1234567');
			expect(t.dialects.dotnet('ss.FFF')).toBe('45.123');
			expect(t.dialects.dotnet('ss.FFFFFFF')).toBe('45.1234567');

			const tZero = new Tempo('2026-10-24T15:30:45.000Z', { timeZone: 'UTC' });
			expect(tZero.dialects.dotnet('ss.FFF')).toBe('45');
			expect(tZero.dialects.dotnet('yyyy-MM-dd HH:mm:ss.FFF')).toBe('2026-10-24 15:30:45');
		});

		it('formats time zone offsets and K specifier', () => {
			const t = new Tempo(dtString);
			expect(t.dialects.dotnet('yyyy-MM-dd zzz')).toBe('2026-10-24 +10:00');
			expect(t.dialects.dotnet('yyyy-MM-dd zz')).toBe('2026-10-24 +10');
			expect(t.dialects.dotnet('yyyy-MM-dd K')).toBe('2026-10-24 +10:00');

			const utc = new Tempo('2026-10-24T15:30:45Z');
			expect(utc.dialects.dotnet('yyyy-MM-ddTHH:mm:ssK')).toBe('2026-10-24T15:30:45Z');
		});

		it('supports literal escaping via single quotes, double quotes, and backslash', () => {
			const t = new Tempo(dtString);
			expect(t.dialects.dotnet("yyyy'年'MM'月'dd'日'")).toBe('2026年10月24日');
			expect(t.dialects.dotnet('yyyy"年"MM"月"dd"日"')).toBe('2026年10月24日');
			expect(t.dialects.dotnet('yyyy\\-MM\\-dd')).toBe('2026-10-24');
			expect(t.dialects.dotnet("hh' o\\'clock'")).toBe("03 o'clock");
			expect(t.dialects.dotnet('hh" o\\"clock"')).toBe('03 o"clock');
		});

		it('supports standard format specifiers (O, s, u, r, R)', () => {
			const t = new Tempo('2026-10-24T15:30:45.1234567Z');
			expect(t.dialects.dotnet('s')).toBe('2026-10-24T15:30:45');
			expect(t.dialects.dotnet('u')).toBe('2026-10-24 15:30:45Z');
			expect(t.dialects.dotnet('O')).toBe('2026-10-24T15:30:45.1234567Z');

			// u and r/R convert to UTC when given a non-UTC instant
			const tOffset = new Tempo('2026-10-24T15:30:45+10:00');
			expect(tOffset.dialects.dotnet('u')).toBe('2026-10-24 05:30:45Z');
			expect(tOffset.dialects.dotnet('r')).toBe('Sat, 24 Oct 2026 05:30:45 GMT');
			expect(tOffset.dialects.dotnet('R')).toBe('Sat, 24 Oct 2026 05:30:45 GMT');

			// Direct compilation behaves identically
			expect(compileDotNetFormatter('u')(tOffset.zdt)).toBe('2026-10-24 05:30:45Z');
			expect(compileDotNetFormatter('r')(tOffset.zdt)).toBe('Sat, 24 Oct 2026 05:30:45 GMT');
			expect(compileDotNetFormatter('R')(tOffset.zdt)).toBe('Sat, 24 Oct 2026 05:30:45 GMT');
		});

		it('supports ecosystem aliases and auto-detection', () => {
			const t = new Tempo(dtString);
			expect(t.format('yyyy-MM-dd HH:mm:ss', { dialect: 'csharp' })).toBe('2026-10-24 15:30:45');
			expect(t.format('yyyy-MM-dd HH:mm:ss', { dialect: '.net' })).toBe('2026-10-24 15:30:45');
			expect(t.format('yyyy-MM-dd HH:mm:ss', { dialect: 'c#' })).toBe('2026-10-24 15:30:45');

			// Auto-detection on distinctive tokens (tt, dddd, fff, fffffffK, standalone O)
			expect(t.dialects.format('yyyy-MM-dd hh:mm tt')).toBe('2026-10-24 03:30 PM');
			expect(t.dialects.format('dddd, MMMM d, yyyy')).toBe('Saturday, October 24, 2026');
			expect(t.dialects.format('yyyy-MM-dd HH:mm:ss.fff')).toBe('2026-10-24 15:30:45.123');
			expect(t.dialects.format('yyyy-MM-ddTHH:mm:ss.fffffffK')).toBe('2026-10-24T15:30:45.1234567+10:00');
			expect(t.dialects.format('O')).toBe('2026-10-24T15:30:45.1234567+10:00');
		});
	});

	describe('Parsing', () => {
		it('parses standard .NET date-time mask', () => {
			const parsed = Tempo.dialects.parse('2026-10-24 15:30:45', 'yyyy-MM-dd HH:mm:ss', DIALECT.DotNet);
			expect(parsed.isValid).toBe(true);
			expect(parsed.yy).toBe(2026);
			expect(parsed.mm).toBe(10);
			expect(parsed.dd).toBe(24);
			expect(parsed.hh).toBe(15);
			expect(parsed.mi).toBe(30);
			expect(parsed.ss).toBe(45);
		});

		it('parses 12-hour clock with tt marker', () => {
			const parsed = Tempo.dialects.parse('2026-10-24 03:30:45 PM', 'yyyy-MM-dd hh:mm:ss tt', DIALECT.DotNet);
			expect(parsed.isValid).toBe(true);
			expect(parsed.hh).toBe(15);
			expect(parsed.mi).toBe(30);
			expect(parsed.ss).toBe(45);
		});

		it('parses unpadded specifiers', () => {
			const parsed = Tempo.dialects.parse('2026-1-5 9:5:2', 'yyyy-M-d H:m:s', DIALECT.DotNet);
			expect(parsed.isValid).toBe(true);
			expect(parsed.mm).toBe(1);
			expect(parsed.dd).toBe(5);
			expect(parsed.hh).toBe(9);
			expect(parsed.mi).toBe(5);
			expect(parsed.ss).toBe(2);
		});

		it('parses optional fractional seconds with F specifiers with and without decimal point', () => {
			const parsedWithFrac = Tempo.dialects.parse('2026-10-24 15:30:45.123', 'yyyy-MM-dd HH:mm:ss.FFF', DIALECT.DotNet);
			expect(parsedWithFrac.isValid).toBe(true);
			expect(parsedWithFrac.ss).toBe(45);
			expect(parsedWithFrac.ms).toBe(123);

			const parsedWithoutFrac = Tempo.dialects.parse('2026-10-24 15:30:45', 'yyyy-MM-dd HH:mm:ss.FFF', DIALECT.DotNet);
			expect(parsedWithoutFrac.isValid).toBe(true);
			expect(parsedWithoutFrac.ss).toBe(45);
			expect(parsedWithoutFrac.ms).toBe(0);
		});

		it('parses textual month and weekday names', () => {
			const parsed = Tempo.dialects.parse('Saturday, October 24, 2026', 'dddd, MMMM d, yyyy', DIALECT.DotNet);
			expect(parsed.isValid).toBe(true);
			expect(parsed.yy).toBe(2026);
			expect(parsed.mm).toBe(10);
			expect(parsed.dd).toBe(24);
		});

		it('rejects contradictory weekday names', () => {
			const parsed = Tempo.dialects.parse('Sunday, October 24, 2026', 'dddd, MMMM d, yyyy', DIALECT.DotNet, { error: 'catch' });
			expect(parsed.isValid).toBe(false);
		});

		it('rejects unrecognized weekday names', () => {
			const parsed = Tempo.dialects.parse('Xyzday, October 24, 2026', 'dddd, MMMM d, yyyy', DIALECT.DotNet, { error: 'catch' });
			expect(parsed.isValid).toBe(false);
		});

		it('parses standard UTC format specifiers (u, r, R) as UTC', () => {
			const parsedU = Tempo.dialects.parse('2026-10-24 15:30:45Z', 'u', DIALECT.DotNet);
			expect(parsedU.isValid).toBe(true);
			expect(parsedU.tz).toBe('UTC');
			expect(parsedU.yy).toBe(2026);
			expect(parsedU.hh).toBe(15);

			const parsedR = Tempo.dialects.parse('Sat, 24 Oct 2026 15:30:45 GMT', 'r', DIALECT.DotNet);
			expect(parsedR.isValid).toBe(true);
			expect(parsedR.tz).toBe('UTC');
			expect(parsedR.yy).toBe(2026);
			expect(parsedR.hh).toBe(15);
		});
	});
});

