import { Tempo } from '#tempo/core';
import { FormatModule } from '#tempo/format';
import '#tempo/parse';

Tempo.extend(FormatModule);

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
});
