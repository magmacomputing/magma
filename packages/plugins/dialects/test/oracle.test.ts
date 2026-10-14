import { Tempo } from '@magmacomputing/tempo';
import { DialectsPlugin, DIALECT } from '../src/index.js';

describe('Oracle / SQL TO_CHAR Formatting & Parsing', () => {
	Tempo.use(DialectsPlugin);

	const dt = new Tempo('2026-10-24T15:30:45.123456');

	describe('Formatting', () => {
		it('formats standard Oracle/SQL format models via .oracle() and .sql()', () => {
			expect(dt.dialects.oracle('YYYY-MM-DD HH24:MI:SS')).toBe('2026-10-24 15:30:45');
			expect(dt.dialects.sql('YYYY-MM-DD HH24:MI:SS')).toBe('2026-10-24 15:30:45');
			expect(dt.format('YYYY-MM-DD HH24:MI:SS', { dialect: DIALECT.Oracle })).toBe('2026-10-24 15:30:45');
			expect(dt.format('YYYY-MM-DD HH24:MI:SS', { dialect: 'sql' })).toBe('2026-10-24 15:30:45');
			expect(dt.format('YYYY-MM-DD HH24:MI:SS', { dialect: 'postgres' })).toBe('2026-10-24 15:30:45');
			expect(dt.format('YYYY-MM-DD HH24:MI:SS', { dialect: 'snowflake' })).toBe('2026-10-24 15:30:45');
		});

		it('supports case-insensitive tokens (yyyy-mm-dd hh24:mi:ss)', () => {
			expect(dt.dialects.sql('yyyy-mm-dd hh24:mi:ss')).toBe('2026-10-24 15:30:45');
			expect(dt.dialects.sql('yyyy/mm/dd')).toBe('2026/10/24');
		});

		it('respects Oracle case conventions for month and day names', () => {
			// Uppercase
			expect(dt.dialects.sql('MONTH DD, YYYY (DAY)')).toBe('OCTOBER 24, 2026 (SATURDAY)');
			expect(dt.dialects.sql('DD-MON-YYYY (DY)')).toBe('24-OCT-2026 (SAT)');

			// Capitalized / Titlecase
			expect(dt.dialects.sql('Month DD, YYYY (Day)')).toBe('October 24, 2026 (Saturday)');
			expect(dt.dialects.sql('DD-Mon-YYYY (Dy)')).toBe('24-Oct-2026 (Sat)');

			// Lowercase
			expect(dt.dialects.sql('month DD, YYYY (day)')).toBe('october 24, 2026 (saturday)');
			expect(dt.dialects.sql('DD-mon-YYYY (dy)')).toBe('24-oct-2026 (sat)');
		});

		it('formats Roman numeral months (RM / rm)', () => {
			expect(dt.dialects.sql('DD-RM-YYYY')).toBe('24-X-2026');
			expect(dt.dialects.sql('DD-rm-YYYY')).toBe('24-x-2026');
		});

		it('handles 12-hour clock (HH, HH12) and meridiem (AM, PM, a.m., p.m.)', () => {
			expect(dt.dialects.sql('HH12:MI:SS AM')).toBe('03:30:45 PM');
			expect(dt.dialects.sql('HH:MI:SS am')).toBe('03:30:45 pm');
			expect(dt.dialects.sql('HH12:MI:SS A.M.')).toBe('03:30:45 P.M.');
			expect(dt.dialects.sql('HH:MI:SS a.m.')).toBe('03:30:45 p.m.');
		});

		it('handles FM (Fill Mode) to suppress padding', () => {
			const spring = new Tempo('2026-04-09T08:05:07');
			// Without FM: zero-padded
			expect(spring.dialects.sql('MM/DD/YYYY HH24:MI:SS')).toBe('04/09/2026 08:05:07');
			// With FM: unpadded
			expect(spring.dialects.sql('FMMM/FMDD/YYYY FMHH24:FMMI:FMSS')).toBe('4/9/2026 8:5:7');
		});

		it('handles double-quoted literal text in format models', () => {
			expect(dt.dialects.sql('YYYY"年"MM"月"DD"日"')).toBe('2026年10月24日');
			expect(dt.dialects.sql('YYYY"-"MM"-"DD"T"HH24:MI:SS')).toBe('2026-10-24T15:30:45');
		});

		it('formats fractional seconds (FF, FF3, FF6)', () => {
			expect(dt.dialects.sql('YYYY-MM-DD HH24:MI:SS.FF3')).toBe('2026-10-24 15:30:45.123');
			expect(dt.dialects.sql('YYYY-MM-DD HH24:MI:SS.FF6')).toBe('2026-10-24 15:30:45.123456');
			expect(dt.dialects.sql('YYYY-MM-DD HH24:MI:SS.FF')).toBe('2026-10-24 15:30:45.123456');
		});

		it('formats week, quarter, and day of year (IW, Q, DDD)', () => {
			expect(dt.dialects.sql('YYYY-"W"IW-D')).toBe('2026-W43-6');
			expect(dt.dialects.sql('YYYY-"Q"Q')).toBe('2026-Q4');
			expect(dt.dialects.sql('DDD')).toBe('297');
		});

		it('auto-detects Oracle dialect with distinct tokens (HH24, MI, FF)', () => {
			expect(dt.dialects.format('YYYY-MM-DD HH24:MI:SS')).toBe('2026-10-24 15:30:45');
		});
	});

	describe('Parsing', () => {
		it('parses standard ISO-like timestamps with YYYY-MM-DD HH24:MI:SS', () => {
			const t = Tempo.dialects.parse('2026-10-24 15:30:45', 'YYYY-MM-DD HH24:MI:SS', 'oracle');
			expect(t.isValid).toBe(true);
			expect(t.yy).toBe(2026);
			expect(t.mm).toBe(10);
			expect(t.dd).toBe(24);
			expect(t.hh).toBe(15);
			expect(t.mi).toBe(30);
			expect(t.ss).toBe(45);
		});

		it('parses with SQL aliases (sql, postgres, snowflake)', () => {
			const t1 = Tempo.dialects.parse('2026-10-24 15:30:45', 'YYYY-MM-DD HH24:MI:SS', 'sql');
			expect(t1.isValid).toBe(true);
			expect(t1.yy).toBe(2026);

			const t2 = Tempo.dialects.parse('2026-10-24 15:30:45', 'YYYY-MM-DD HH24:MI:SS', 'postgres');
			expect(t2.isValid).toBe(true);
			expect(t2.yy).toBe(2026);

			const t3 = Tempo.dialects.parse('2026-10-24 15:30:45', 'YYYY-MM-DD HH24:MI:SS', 'snowflake');
			expect(t3.isValid).toBe(true);
			expect(t3.yy).toBe(2026);
		});

		it('parses month abbreviations and full names (MON, MONTH)', () => {
			const t1 = Tempo.dialects.parse('24-OCT-2026', 'DD-MON-YYYY', 'oracle');
			expect(t1.isValid).toBe(true);
			expect(t1.mm).toBe(10);
			expect(t1.dd).toBe(24);

			const t2 = Tempo.dialects.parse('October 24, 2026', 'MONTH DD, YYYY', 'oracle');
			expect(t2.isValid).toBe(true);
			expect(t2.mm).toBe(10);
			expect(t2.dd).toBe(24);
		});

		it('parses Roman numeral months (RM)', () => {
			const t = Tempo.dialects.parse('24-X-2026', 'DD-RM-YYYY', 'oracle');
			expect(t.isValid).toBe(true);
			expect(t.mm).toBe(10);
			expect(t.dd).toBe(24);
		});

		it('parses 12-hour clock with AM/PM', () => {
			const t = Tempo.dialects.parse('03:30:45 PM', 'HH12:MI:SS AM', 'oracle');
			expect(t.isValid).toBe(true);
			expect(t.hh).toBe(15);
			expect(t.mi).toBe(30);
			expect(t.ss).toBe(45);
		});

		it('parses fractional seconds (FF)', () => {
			const t = Tempo.dialects.parse('2026-10-24 15:30:45.123456', 'YYYY-MM-DD HH24:MI:SS.FF6', 'oracle');
			expect(t.isValid).toBe(true);
			expect(t.ms).toBe(123);
			expect(t.toDateTime().microsecond).toBe(456);
		});

		it('parses double-quoted literals', () => {
			const t = Tempo.dialects.parse('2026年10月24日', 'YYYY"年"MM"月"DD"日"', 'oracle');
			expect(t.isValid).toBe(true);
			expect(t.yy).toBe(2026);
			expect(t.mm).toBe(10);
			expect(t.dd).toBe(24);
		});

		it('parses day of year (DDD)', () => {
			const t = Tempo.dialects.parse('2026-297', 'YYYY-DDD', 'oracle');
			expect(t.isValid).toBe(true);
			expect(t.yy).toBe(2026);
			expect(t.mm).toBe(10);
			expect(t.dd).toBe(24);
		});
	});

	describe('Explain', () => {
		it('explains Oracle/SQL format models into Tempo token syntax', () => {
			const exp = Tempo.dialects.explain('YYYY-MM-DD HH24:MI:SS', 'oracle');
			expect(exp.dialect).toBe(DIALECT.Oracle);
			expect(exp.pattern).toBe('{yyyy}-{mm}-{dd} {hh}:{mi}:{ss}');
			expect(exp.toString()).toBe('{yyyy}-{mm}-{dd} {hh}:{mi}:{ss}');
			expect(exp.tokens.length).toBe(6);
		});

		it('explains with sql alias and auto-detect', () => {
			const exp1 = Tempo.dialects.explain('YYYY-MM-DD HH24:MI:SS', 'sql');
			expect(exp1.dialect).toBe(DIALECT.Oracle);
			expect(exp1.pattern).toBe('{yyyy}-{mm}-{dd} {hh}:{mi}:{ss}');

			const exp2 = dt.dialects.explain('YYYY-MM-DD HH24:MI:SS');
			expect(exp2.dialect).toBe(DIALECT.Oracle);
			expect(exp2.pattern).toBe('{yyyy}-{mm}-{dd} {hh}:{mi}:{ss}');
		});

		it('explains double quoted literals and fractional seconds', () => {
			const exp = Tempo.dialects.explain('YYYY"-"MM"-"DD HH24:MI:SS.FF3', 'oracle');
			expect(exp.pattern).toBe('{yyyy}-{mm}-{dd} {hh}:{mi}:{ss}.{ms}');
		});
	});
});
