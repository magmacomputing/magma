import { Tempo } from '@magmacomputing/tempo';
import { DialectsPlugin, DIALECT } from '../src/index.js';

describe('Oracle / SQL TO_CHAR Formatting & Parsing', () => {
	Tempo.use(DialectsPlugin);

	const dt = new Tempo('2026-10-24T15:30:45.123456');

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

	it('handles FM (Fill Mode) to toggle padding suppression', () => {
		const spring = new Tempo('2026-04-09T08:05:07');
		// Without FM: zero-padded
		expect(spring.dialects.sql('MM/DD/YYYY HH24:MI:SS')).toBe('04/09/2026 08:05:07');
		// With single FM prefix: unpadded across subsequent elements
		expect(spring.dialects.sql('FMMM/DD/YYYY HH24:MI:SS')).toBe('4/9/2026 8:5:7');
		// Second FM toggles padding back on
		expect(spring.dialects.sql('FMMM/FMDD/YYYY')).toBe('4/09/2026');
	});

	it('handles double-quoted literal text in format models', () => {
		expect(dt.dialects.sql('YYYY"年"MM"月"DD"日"')).toBe('2026年10月24日');
		expect(dt.dialects.sql('YYYY"-"MM"-"DD"T"HH24:MI:SS')).toBe('2026-10-24T15:30:45');
	});

	it('formats day with ordinal suffix (DDTH, ddth, FMDDTH)', () => {
		expect(dt.dialects.sql('DDTH "of" Month YYYY')).toBe('24TH of October 2026');
		expect(dt.dialects.sql('ddth "of" Month YYYY')).toBe('24th of October 2026');
		expect(dt.dialects.sql('FMDDTH "of" Month YYYY')).toBe('24TH of October 2026');

		const first = new Tempo('2026-05-01');
		expect(first.dialects.sql('DDTH')).toBe('01ST');
		expect(first.dialects.sql('ddth')).toBe('01st');
		expect(first.dialects.sql('FMDDTH')).toBe('1ST');
		expect(first.dialects.sql('FMddth')).toBe('1st');
	});

	it('formats fractional seconds (FF, FF3, FF6)', () => {
		expect(dt.dialects.sql('YYYY-MM-DD HH24:MI:SS.FF3')).toBe('2026-10-24 15:30:45.123');
		expect(dt.dialects.sql('YYYY-MM-DD HH24:MI:SS.FF6')).toBe('2026-10-24 15:30:45.123456');
		expect(dt.dialects.sql('YYYY-MM-DD HH24:MI:SS.FF')).toBe('2026-10-24 15:30:45.123456');
	});

	it('formats week, quarter, Julian day, and day of year (IW, WW, Q, J, DDD)', () => {
		expect(dt.dialects.sql('YYYY-"W"IW-D')).toBe('2026-W43-6');
		expect(dt.dialects.sql('WW')).toBe('43');
		expect(dt.dialects.sql('YYYY-"Q"Q')).toBe('2026-Q4');
		expect(dt.dialects.sql('DDD')).toBe('297');
		expect(dt.dialects.sql('J')).toBe('2461338');

		// Jan 8 is always WW = 2 (day 8 of year)
		const jan8 = new Tempo('2026-01-08T12:00:00Z');
		expect(jan8.dialects.sql('WW')).toBe('02');
	});

	it('formats seconds past midnight (SSSSS, FMSSSSS)', () => {
		const early = new Tempo('2026-04-09T01:00:05');
		expect(early.dialects.sql('SSSSS')).toBe('03605');
		expect(early.dialects.sql('FMSSSSS')).toBe('3605');
	});

	it('formats time zone region (TZR) and daylight saving abbreviation (TZD)', () => {
		const ny = new Tempo('2026-10-24T15:30:45[America/New_York]');
		expect(ny.dialects.sql('TZR')).toBe('America/New_York');
		expect(ny.dialects.sql('TZD')).toBe('EDT');
	});

	it('formats ISO week-year tokens (IYYY, IYY, IY, I)', () => {
		const dec31 = new Tempo('2024-12-30T10:00:00Z'); // Week 1 of ISO year 2025
		expect(dec31.dialects.sql('IYYY-IW')).toBe('2025-01');
		expect(dec31.dialects.sql('IYY')).toBe('025');
		expect(dec31.dialects.sql('IY')).toBe('25');
		expect(dec31.dialects.sql('I')).toBe('5');
	});

	it('auto-detects Oracle dialect with distinct tokens (HH24, MI, FF)', () => {
		expect(dt.dialects.format('YYYY-MM-DD HH24:MI:SS')).toBe('2026-10-24 15:30:45');
	});

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

	it('parses day with ordinal suffix (DDTH)', () => {
		const t = Tempo.dialects.parse('24th of October 2026', 'DDTH "of" Month YYYY', 'oracle');
		expect(t.isValid).toBe(true);
		expect(t.yy).toBe(2026);
		expect(t.mm).toBe(10);
		expect(t.dd).toBe(24);
	});

	it('parses ISO week-numbering year (IYYY)', () => {
		const t = Tempo.dialects.parse('2025-10-24', 'IYYY-MM-DD', 'oracle');
		expect(t.isValid).toBe(true);
		expect(t.yy).toBe(2025);
		expect(t.mm).toBe(10);
		expect(t.dd).toBe(24);
	});

	it('parses ISO week date combinations (IYYY-IW and IYYY-IW-D)', () => {
		const tWeek = Tempo.dialects.parse('2025-01', 'IYYY-IW', 'oracle');
		expect(tWeek.isValid).toBe(true);
		// Week 1 of 2025 starts on Monday 2024-12-30
		expect(tWeek.yy).toBe(2024);
		expect(tWeek.mm).toBe(12);
		expect(tWeek.dd).toBe(30);

		const tWeekDay = Tempo.dialects.parse('2025-43-5', 'IYYY-IW-D', 'oracle');
		expect(tWeekDay.isValid).toBe(true);
		expect(tWeekDay.yy).toBe(2025);
		expect(tWeekDay.mm).toBe(10);
		expect(tWeekDay.dd).toBe(24);
	});

	it('rejects invalid ISO week date combinations', () => {
		const tInvalidDay = Tempo.dialects.parse('2025-43-8', 'IYYY-IW-D', 'oracle', { error: 'catch' });
		expect(tInvalidDay.isValid).toBe(false);

		const tInvalidWeek = Tempo.dialects.parse('2025-53-1', 'IYYY-IW-D', 'oracle', { error: 'catch' });
		expect(tInvalidWeek.isValid).toBe(false);
	});

	it('validates weekday_num when iw is absent', () => {
		const tValid = Tempo.dialects.parse('2026-10-24 6', 'YYYY-MM-DD D', 'oracle');
		expect(tValid.isValid).toBe(true);
		expect(tValid.yy).toBe(2026);
		expect(tValid.mm).toBe(10);
		expect(tValid.dd).toBe(24);

		const tMismatch = Tempo.dialects.parse('2026-10-24 1', 'YYYY-MM-DD D', 'oracle', { error: 'catch' });
		expect(tMismatch.isValid).toBe(false);
	});

	it('preserves round-tripping near ISO year boundaries with IYYY-MM-DD', () => {
		// 2024-12-30 is Monday of ISO week 1, 2025 -> formats to "2025-12-30"
		const orig = new Tempo('2024-12-30T12:00:00Z');
		const formatted = orig.dialects.sql('IYYY-MM-DD');
		expect(formatted).toBe('2025-12-30');

		const parsed = Tempo.dialects.parse(formatted, 'IYYY-MM-DD', 'oracle');
		expect(parsed.isValid).toBe(true);
		expect(parsed.yy).toBe(2024);
		expect(parsed.mm).toBe(12);
		expect(parsed.dd).toBe(30);
	});

	it('resolves day of year (DDD) when month is present without day token', () => {
		// 2026-10-24 is DOY 297
		const tValid = Tempo.dialects.parse('2026-10 297', 'YYYY-MM DDD', 'oracle');
		expect(tValid.isValid).toBe(true);
		expect(tValid.yy).toBe(2026);
		expect(tValid.mm).toBe(10);
		expect(tValid.dd).toBe(24);

		// Contradiction between MM and DDD
		const tMismatch = Tempo.dialects.parse('2026-11 297', 'YYYY-MM DDD', 'oracle', { error: 'catch' });
		expect(tMismatch.isValid).toBe(false);
	});

	it('disambiguates or rejects ambiguous ISO week-year candidates with IYYY-MM-DD', () => {
		// Both 2014-12-29 (Monday, D=1) and 2015-12-29 (Tuesday, D=2) have ISO week-year 2015
		const tAmbiguous = Tempo.dialects.parse('2015-12-29', 'IYYY-MM-DD', 'oracle', { error: 'catch' });
		expect(tAmbiguous.isValid).toBe(false);

		const tMonday = Tempo.dialects.parse('2015-12-29 1', 'IYYY-MM-DD D', 'oracle');
		expect(tMonday.isValid).toBe(true);
		expect(tMonday.yy).toBe(2014);
		expect(tMonday.mm).toBe(12);
		expect(tMonday.dd).toBe(29);

		const tTuesday = Tempo.dialects.parse('2015-12-29 2', 'IYYY-MM-DD D', 'oracle');
		expect(tTuesday.isValid).toBe(true);
		expect(tTuesday.yy).toBe(2015);
		expect(tTuesday.mm).toBe(12);
		expect(tTuesday.dd).toBe(29);
	});

	it('parses two-digit years with YY (current century) and RR (pivot century)', () => {
		const today2026 = new Tempo('2026-05-15T12:00:00Z').toDateTime();

		// YY always adopts current century (2000s in 2026)
		const tYY = Tempo.dialects.parse('85-10-24', 'YY-MM-DD', 'oracle', { today: today2026 });
		expect(tYY.isValid).toBe(true);
		expect(tYY.yy).toBe(2085);

		// RR pivots: in 2026 (curYY < 50), 85 >= 50 goes to previous century (1985)
		const tRR = Tempo.dialects.parse('85-10-24', 'RR-MM-DD', 'oracle', { today: today2026 });
		expect(tRR.isValid).toBe(true);
		expect(tRR.yy).toBe(1985);

		// RR: 26 < 50 goes to current century (2026)
		const tRR2 = Tempo.dialects.parse('26-10-24', 'RR-MM-DD', 'oracle', { today: today2026 });
		expect(tRR2.isValid).toBe(true);
		expect(tRR2.yy).toBe(2026);
	});

	it('parses dotted meridiem markers (A.M. / P.M.)', () => {
		const t = Tempo.dialects.parse('03:30:45 P.M.', 'HH12:MI:SS A.M.', 'oracle');
		expect(t.isValid).toBe(true);
		expect(t.hh).toBe(15);
	});

	it('parses day of year (DDD)', () => {
		const t = Tempo.dialects.parse('2026-297', 'YYYY-DDD', 'oracle');
		expect(t.isValid).toBe(true);
		expect(t.yy).toBe(2026);
		expect(t.mm).toBe(10);
		expect(t.dd).toBe(24);

		const tInvalidDoy = Tempo.dialects.parse('2026-366', 'YYYY-DDD', 'oracle', { error: 'catch' });
		expect(tInvalidDoy.isValid).toBe(false);

		const tValidLeapDoy = Tempo.dialects.parse('2024-366', 'YYYY-DDD', 'oracle');
		expect(tValidLeapDoy.isValid).toBe(true);
		expect(tValidLeapDoy.mm).toBe(12);
		expect(tValidLeapDoy.dd).toBe(31);
	});

	it('rejects invalid out-of-range calendar dates using overflow reject', () => {
		const tInvalidDay = Tempo.dialects.parse('2026-04-31', 'YYYY-MM-DD', 'oracle', { error: 'catch' });
		expect(tInvalidDay.isValid).toBe(false);

		const tInvalidFeb = Tempo.dialects.parse('2026-02-29', 'YYYY-MM-DD', 'oracle', { error: 'catch' });
		expect(tInvalidFeb.isValid).toBe(false);
	});

	it('returns invalid for masks containing unsupported reverse-parse tokens', () => {
		const tJulian = Tempo.dialects.parse('2461338', 'J', 'oracle', { error: 'catch' });
		expect(tJulian.isValid).toBe(false);

		const tWeek = Tempo.dialects.parse('2026-43', 'YYYY-WW', 'oracle', { error: 'catch' });
		expect(tWeek.isValid).toBe(false);
	});

	it('preserves fractional-second precision up to nanoseconds (FF9)', () => {
		const t = Tempo.dialects.parse('2026-10-24 15:30:45.123456789', 'YYYY-MM-DD HH24:MI:SS.FF9', 'oracle');
		expect(t.isValid).toBe(true);
		expect(t.ms).toBe(123);
		const zdt = t.toDateTime();
		expect(zdt.microsecond).toBe(456);
		expect(zdt.nanosecond).toBe(789);
	});

	it('gracefully handles invalid time zones returning invalid instance', () => {
		const tBadTz = Tempo.dialects.parse('2026-10-24 15:30:45 Nonexistent/Timezone', 'YYYY-MM-DD HH24:MI:SS TZR', 'oracle', { error: 'catch' });
		expect(tBadTz.isValid).toBe(false);
	});

	it('parses and validates weekday names (DAY) and abbreviations (DY)', () => {
		// 2026-10-24 is Saturday
		const tDay = Tempo.dialects.parse('2026-10-24 SATURDAY', 'YYYY-MM-DD DAY', 'oracle');
		expect(tDay.isValid).toBe(true);
		expect(tDay.dd).toBe(24);

		const tDy = Tempo.dialects.parse('2026-10-24 SAT', 'YYYY-MM-DD DY', 'oracle');
		expect(tDy.isValid).toBe(true);
		expect(tDy.dd).toBe(24);

		// Contradictory weekday name should be rejected
		const tMismatch = Tempo.dialects.parse('2026-10-24 MONDAY', 'YYYY-MM-DD DAY', 'oracle', { error: 'catch' });
		expect(tMismatch.isValid).toBe(false);

		// ISO week with DY
		const tIsoDy = Tempo.dialects.parse('2026-43-SAT', 'IYYY-IW-DY', 'oracle');
		expect(tIsoDy.isValid).toBe(true);
		expect(tIsoDy.dd).toBe(24);
	});
});
