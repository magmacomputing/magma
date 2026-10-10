import { Tempo } from '#tempo/core';
import { Enum } from '#tempo/support';
import { FormatModule } from '#tempo/format';
import { parseWeekday, parseDate } from '#tempo/engine/engine.lexer.js';
import '#tempo/parse';

Tempo.use(FormatModule);

describe('Core Ordinal Offset Parsing', () => {
	beforeEach(() => {
		Tempo.init();
	});

	describe('Nth Weekday of Month', () => {
		it('should parse "3rd Thursday of November 2026"', () => {
			const t = new Tempo('3rd Thursday of November 2026');
			expect(t.isValid).toBe(true);
			expect(t.format('{yyyy}-{mm}-{dd}')).toBe('2026-11-19');
		});

		it('should parse "1st Monday of May 2026"', () => {
			const t = new Tempo('1st Monday of May 2026');
			expect(t.isValid).toBe(true);
			expect(t.format('{yyyy}-{mm}-{dd}')).toBe('2026-05-04');
		});

		it('should parse "last Friday of May 2026"', () => {
			const t = new Tempo('last Friday of May 2026');
			expect(t.isValid).toBe(true);
			expect(t.format('{yyyy}-{mm}-{dd}')).toBe('2026-05-29');
		});

		it('should parse "second Wednesday of October 2026"', () => {
			const t = new Tempo('second Wednesday of October 2026');
			expect(t.isValid).toBe(true);
			expect(t.format('{yyyy}-{mm}-{dd}')).toBe('2026-10-14');
		});

		it('should parse with implicit year anchor', () => {
			const currentYear = new Tempo().yy;
			const t = new Tempo('1st Monday of May');
			expect(t.isValid).toBe(true);
			expect(t.yy).toBe(currentYear);
			expect(t.mm).toBe(5);
		});
	});

	describe('Nth and Last Day of Month/Year', () => {
		it('should parse "1st day of May 2026"', () => {
			const t = new Tempo('1st day of May 2026');
			expect(t.isValid).toBe(true);
			expect(t.format('{yyyy}-{mm}-{dd}')).toBe('2026-05-01');
		});

		it('should parse "last day of May 2026"', () => {
			const t = new Tempo('last day of May 2026');
			expect(t.isValid).toBe(true);
			expect(t.format('{yyyy}-{mm}-{dd}')).toBe('2026-05-31');
		});

		it('should parse "100th day of 2026"', () => {
			const t = new Tempo('100th day of 2026');
			expect(t.isValid).toBe(true);
			expect(t.format('{yyyy}-{mm}-{dd}')).toBe('2026-04-10');
		});

		it('should parse "last day of 2026"', () => {
			const t = new Tempo('last day of 2026');
			expect(t.isValid).toBe(true);
			expect(t.format('{yyyy}-{mm}-{dd}')).toBe('2026-12-31');
		});
	});

	describe('Leap Year Boundary Cases', () => {
		it('should handle last day of February in leap vs non-leap years', () => {
			const leap = new Tempo('last day of February 2024');
			expect(leap.format('{yyyy}-{mm}-{dd}')).toBe('2024-02-29');

			const nonLeap = new Tempo('last day of February 2025');
			expect(nonLeap.format('{yyyy}-{mm}-{dd}')).toBe('2025-02-28');
		});

		it('should handle 60th day of year in leap vs non-leap years', () => {
			const leap60 = new Tempo('60th day of 2024');
			expect(leap60.format('{yyyy}-{mm}-{dd}')).toBe('2024-02-29');

			const nonLeap60 = new Tempo('60th day of 2025');
			expect(nonLeap60.format('{yyyy}-{mm}-{dd}')).toBe('2025-03-01');
		});
	});

	describe('Lexer ord / nth Fallback', () => {
		const dt = Temporal.ZonedDateTime.from('2026-11-01T12:00:00[UTC]');

		it('resolves ordinal weekday from groups.ord and clears both keys', () => {
			const groups: Record<string, string> = { wkd: 'Thursday', ord: '3rd', mm: '11', yy: '2026' };
			const res = parseWeekday(groups, dt, {});
			expect(res.day).toBe(19);
			expect(groups).not.toHaveProperty('ord');
			expect(groups).not.toHaveProperty('nth');
		});

		it('falls back to groups.nth when groups.ord is absent', () => {
			const groups: Record<string, string> = { wkd: 'Thursday', nth: '3rd', mm: '11', yy: '2026' };
			const res = parseWeekday(groups, dt, {});
			expect(res.day).toBe(19);
			expect(groups).not.toHaveProperty('ord');
			expect(groups).not.toHaveProperty('nth');
		});

		it('prioritizes groups.ord over groups.nth when both are present in parseWeekday', () => {
			const groups: Record<string, string> = { wkd: 'Thursday', ord: '1st', nth: '3rd', mm: '11', yy: '2026' };
			const res = parseWeekday(groups, dt, {});
			expect(res.day).toBe(5);
			expect(groups).not.toHaveProperty('ord');
			expect(groups).not.toHaveProperty('nth');
		});

		it('resolves ordinal date from groups.ord and clears both keys', () => {
			const groups: Record<string, string> = { ord: '100th', yy: '2026' };
			const res = parseDate(groups, dt, {});
			expect(res.month).toBe(4);
			expect(res.day).toBe(10);
			expect(groups).not.toHaveProperty('ord');
			expect(groups).not.toHaveProperty('nth');
		});

		it('falls back to groups.nth in parseDate when groups.ord is absent', () => {
			const groups: Record<string, string> = { nth: '100th', yy: '2026' };
			const res = parseDate(groups, dt, {});
			expect(res.month).toBe(4);
			expect(res.day).toBe(10);
			expect(groups).not.toHaveProperty('ord');
			expect(groups).not.toHaveProperty('nth');
		});

		it('prioritizes groups.ord over groups.nth when both are present in parseDate', () => {
			const groups: Record<string, string> = { ord: '1st', nth: '100th', yy: '2026', mm: '5' };
			const res = parseDate(groups, dt, {});
			expect(res.month).toBe(5);
			expect(res.day).toBe(1);
			expect(groups).not.toHaveProperty('ord');
			expect(groups).not.toHaveProperty('nth');
		});
	});

	describe('Tempo.enums.ORDINAL Enum and Extensibility', () => {
		it('exposes built-in ordinals on Tempo.enums.ORDINAL and enums.ORDINAL', () => {
			expect(Tempo.enums.ORDINAL.first).toBe(1);
			expect(Tempo.enums.ORDINAL.second).toBe(2);
			expect(Tempo.enums.ORDINAL.third).toBe(3);
			expect(Tempo.enums.ORDINAL.fourth).toBe(4);
			expect(Tempo.enums.ORDINAL.fifth).toBe(5);
			expect(Tempo.enums.ORDINAL.sixth).toBe(6);
			expect(Tempo.enums.ORDINAL.tenth).toBe(10);
			expect(Tempo.enums.ORDINAL.current).toBe(0);
			expect(Tempo.enums.ORDINAL.last).toBe(-1);
		});

		it('parses extended written ordinals beyond fifth in natural dates', () => {
			const t6th = new Tempo('sixth day of May 2026');
			expect(t6th.isValid).toBe(true);
			expect(t6th.format('{yyyy}-{mm}-{dd}')).toBe('2026-05-06');

			const t10th = new Tempo('tenth day of May 2026');
			expect(t10th.isValid).toBe(true);
			expect(t10th.format('{yyyy}-{mm}-{dd}')).toBe('2026-05-10');
		});

		it('supports user extensibility via Enum.extend and Tempo.init registry', () => {
			try {
				const CustomOrd = Enum.extend(Tempo.enums.ORDINAL, {
					zeroth: 0,
				});
				expect(CustomOrd.zeroth).toBe(0);
				expect(CustomOrd.first).toBe(1);

				Tempo.init({
					registry: {
						ordinals: {
							penultimate: -2,
							twelfth: 12,
						}
					}
				});

				expect(Tempo.enums.ORDINAL.penultimate).toBe(-2);
				expect(Tempo.enums.ORDINAL.twelfth).toBe(12);

				const t12th = new Tempo('twelfth day of May 2026');
				expect(t12th.isValid).toBe(true);
				expect(t12th.format('{yyyy}-{mm}-{dd}')).toBe('2026-05-12');

				const tPenultDay = new Tempo('penultimate day of May 2026');
				expect(tPenultDay.isValid).toBe(true);
				expect(tPenultDay.format('{yyyy}-{mm}-{dd}')).toBe('2026-05-30');

				const tPenultWkd = new Tempo('penultimate Friday of May 2026');
				expect(tPenultWkd.isValid).toBe(true);
				expect(tPenultWkd.format('{yyyy}-{mm}-{dd}')).toBe('2026-05-22');
			} finally {
				Tempo.init();
			}
		});
	});
});
