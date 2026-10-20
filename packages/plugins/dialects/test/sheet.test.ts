import { Tempo } from '@magmacomputing/tempo/core';
import { FormatModule } from '@magmacomputing/tempo/format';
import { ParseModule } from '@magmacomputing/tempo/parse';
import { DialectsPlugin, DIALECT, SHEET_TOKENS } from '../src/index.js';

describe('Spreadsheet (Excel / Google Sheets) Format Dialect', () => {
	beforeAll(() => {
		Tempo.use(FormatModule);
		Tempo.use(ParseModule);
		Tempo.use(DialectsPlugin);
	});

	const dtString = '2026-10-24T15:30:45.123+10:00';

	describe('Formatting & Context Sensitivity', () => {
		it('formats standard spreadsheet date-time mask', () => {
			const t = new Tempo(dtString);
			expect(t.dialects.sheet('yyyy-mm-dd hh:mm:ss')).toBe('2026-10-24 15:30:45');
		});

		it('supports case-insensitivity in format masks', () => {
			const t = new Tempo(dtString);
			expect(t.dialects.sheet('YYYY-MM-DD HH:MM:SS')).toBe('2026-10-24 15:30:45');
		});

		it('resolves mm as minute when preceded by hour or followed by second', () => {
			const t = new Tempo(dtString);
			// mm preceded by hh -> minute
			expect(t.dialects.sheet('hh:mm:ss')).toBe('15:30:45');
			// mm followed by ss -> minute
			expect(t.dialects.sheet('mm:ss')).toBe('30:45');
			// mm preceded by h -> minute; m preceded by nothing and followed by d -> month
			expect(t.dialects.sheet('m/d/yy h:mm')).toBe('10/24/26 15:30');
		});

		it('resolves mm as month when not in proximity to hour or second', () => {
			const t = new Tempo(dtString);
			// mm followed by dd -> month
			expect(t.dialects.sheet('mm/dd/yyyy')).toBe('10/24/2026');
			expect(t.dialects.sheet('yyyy-mm-dd')).toBe('2026-10-24');
		});

		it('formats textual month and weekday names', () => {
			const t = new Tempo(dtString);
			expect(t.dialects.sheet('dddd, mmmm d, yyyy')).toBe('Saturday, October 24, 2026');
			expect(t.dialects.sheet('ddd, mmm d, yy')).toBe('Sat, Oct 24, 26');
			expect(t.dialects.sheet('mmmmm')).toBe('O'); // First letter of October
		});

		it('formats 12-hour clock when AM/PM or A/P designator is present', () => {
			const t = new Tempo(dtString);
			expect(t.dialects.sheet('hh:mm:ss AM/PM')).toBe('03:30:45 PM');
			expect(t.dialects.sheet('h:mm:ss a/p')).toBe('3:30:45 P');
		});

		it('formats fractional seconds (.0, .00, .000)', () => {
			const t = new Tempo(dtString);
			expect(t.dialects.sheet('ss.000')).toBe('45.123');
			expect(t.dialects.sheet('ss.00')).toBe('45.12');
			expect(t.dialects.sheet('ss.0')).toBe('45.1');
		});

		it('supports quoted literal escaping and backslash escaping', () => {
			const t = new Tempo(dtString);
			expect(t.dialects.sheet('"Date: "yyyy-mm-dd')).toBe('Date: 2026-10-24');
			expect(t.dialects.sheet('\\y\\y\\y\\y')).toBe('yyyy');
		});

		it('supports ecosystem aliases and auto-detection', () => {
			const t = new Tempo(dtString);
			expect(t.format('yyyy-mm-dd hh:mm:ss', { dialect: 'spreadsheet' })).toBe('2026-10-24 15:30:45');
			expect(t.format('yyyy-mm-dd hh:mm:ss', { dialect: 'excel' })).toBe('2026-10-24 15:30:45');
			expect(t.format('yyyy-mm-dd hh:mm:ss', { dialect: 'sheets' })).toBe('2026-10-24 15:30:45');

			// Auto-detection on AM/PM or mmmmm
			expect(t.dialects.format('hh:mm:ss AM/PM')).toBe('03:30:45 PM');
			expect(t.dialects.format('mmmmm')).toBe('O');
		});
	});

	describe('Parsing', () => {
		it('parses standard spreadsheet mask', () => {
			const parsed = Tempo.dialects.parse('2026-10-24 15:30:45', 'yyyy-mm-dd hh:mm:ss', DIALECT.Sheet);
			expect(parsed.isValid).toBe(true);
			expect(parsed.yy).toBe(2026);
			expect(parsed.mm).toBe(10);
			expect(parsed.dd).toBe(24);
			expect(parsed.hh).toBe(15);
			expect(parsed.mi).toBe(30);
			expect(parsed.ss).toBe(45);
		});

		it('parses 12-hour clock with AM/PM designator', () => {
			const parsed = Tempo.dialects.parse('2026-10-24 03:30:45 PM', 'yyyy-mm-dd hh:mm:ss AM/PM', DIALECT.Sheet);
			expect(parsed.isValid).toBe(true);
			expect(parsed.hh).toBe(15);
			expect(parsed.mi).toBe(30);
			expect(parsed.ss).toBe(45);
		});

		it('parses unpadded specifiers', () => {
			const parsed = Tempo.dialects.parse('2026-1-5 9:5:2', 'yyyy-m-d h:m:s', DIALECT.Sheet);
			expect(parsed.isValid).toBe(true);
			expect(parsed.mm).toBe(1);
			expect(parsed.dd).toBe(5);
			expect(parsed.hh).toBe(9);
			expect(parsed.mi).toBe(5);
			expect(parsed.ss).toBe(2);
		});

		it('parses month-first masks', () => {
			const parsed = Tempo.dialects.parse('10/24/2026', 'mm/dd/yyyy', DIALECT.Sheet);
			expect(parsed.isValid).toBe(true);
			expect(parsed.yy).toBe(2026);
			expect(parsed.mm).toBe(10);
			expect(parsed.dd).toBe(24);
		});

		it('rejects contradictory weekday names', () => {
			const parsed = Tempo.dialects.parse('Sunday, October 24, 2026', 'dddd, mmmm d, yyyy', DIALECT.Sheet, { error: 'catch' });
			expect(parsed.isValid).toBe(false);
		});
	});

	describe('Explain & Transpilation', () => {
		it('explains spreadsheet masks into native Tempo braced tokens', () => {
			const res = Tempo.dialects.explain('yyyy-mm-dd hh:mm:ss', DIALECT.Sheet);
			expect(res.dialect).toBe(DIALECT.Sheet);
			expect(res.pattern).toBe('{yyyy}-{mm}-{dd} {hh}:{mi}:{ss}');
		});

		it('explains 12-hour AM/PM masks correctly', () => {
			const res = Tempo.dialects.explain('hh:mm:ss AM/PM', DIALECT.Sheet);
			expect(res.pattern).toBe('{h12}:{mi}:{ss} {mer:upper}');
		});
	});
});
