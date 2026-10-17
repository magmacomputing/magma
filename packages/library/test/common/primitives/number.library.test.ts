import { toHex, suffix, split, fix, asTime, toRoman, fromRoman, TIMEOUT_MAX } from '#library/number.library.js';

describe('Number Library', () => {
	describe('TIMEOUT_MAX', () => {
		it('should equal 2^31 - 1', () => {
			expect(TIMEOUT_MAX).toBe(2_147_483_647);
			expect(TIMEOUT_MAX).toBe(2 ** 31 - 1);
		});
	});

	describe('toHex', () => {
		it('should convert numbers to hex strings', () => {
			expect(toHex([255, 16])).toBe('ff10');
		});
	});

	describe('suffix', () => {
		it('should append ordinal suffixes to numbers', () => {
			expect(suffix(1)).toBe('1st');
			expect(suffix(2)).toBe('2nd');
			expect(suffix(3)).toBe('3rd');
			expect(suffix(4)).toBe('4th');
			expect(suffix(11)).toBe('11th');
			expect(suffix(23)).toBe('23rd');
		});
	});

	describe('split', () => {
		it('should split numeric strings by delimiter', () => {
			expect(split('12.34')).toEqual([12, 34]);
		});
	});

	describe('fix', () => {
		it('should format number to fixed precision string', () => {
			expect(fix(12.3456, 2)).toBe('12.35');
		});
	});

	describe('asTime', () => {
		it('should convert time string to number', () => {
			expect(asTime('14:30')).toBe(1430);
		});
	});

	describe('convertToRoman', () => {
		it('should convert numbers to Roman numeral representation', () => {
			expect(toRoman(1)).toBe('I');
			expect(toRoman(4)).toBe('IV');
			expect(toRoman(9)).toBe('IX');
			expect(toRoman(10)).toBe('X');
			expect(toRoman(14)).toBe('XIV');
			expect(toRoman(40)).toBe('XL');
			expect(toRoman(90)).toBe('XC');
			expect(toRoman(2026)).toBe('MMXXVI');
			expect(toRoman(3999)).toBe('MMMCMXCIX');
		});

		it('should return empty string for non-integers and numbers outside 1..3999', () => {
			expect(toRoman(0)).toBe('');
			expect(toRoman(-1)).toBe('');
			expect(toRoman(4000)).toBe('');
			expect(toRoman(12.5)).toBe('');
			expect(toRoman(NaN)).toBe('');
		});

		it('should support convertToRoman as an alias', () => {
			expect(toRoman(2026)).toBe('MMXXVI');
		});
	});

	describe('fromRoman', () => {
		it('should convert valid Roman numerals to numbers', () => {
			expect(fromRoman('I')).toBe(1);
			expect(fromRoman('IV')).toBe(4);
			expect(fromRoman('IX')).toBe(9);
			expect(fromRoman('X')).toBe(10);
			expect(fromRoman('XIV')).toBe(14);
			expect(fromRoman('XL')).toBe(40);
			expect(fromRoman('XC')).toBe(90);
			expect(fromRoman('MMXXVI')).toBe(2026);
			expect(fromRoman('MMMCMXCIX')).toBe(3999);
		});

		it('should handle lowercase and surrounding whitespace', () => {
			expect(fromRoman('  mmxxvi  ')).toBe(2026);
			expect(fromRoman('xiv')).toBe(14);
		});

		it('should return NaN for invalid Roman numerals or non-string inputs', () => {
			expect(fromRoman('')).toBeNaN();
			expect(fromRoman('IIII')).toBeNaN();
			expect(fromRoman('VX')).toBeNaN();
			expect(fromRoman('IC')).toBeNaN();
			expect(fromRoman('MMMM')).toBeNaN();
			expect(fromRoman('ABC')).toBeNaN();
			expect(fromRoman(undefined as any)).toBeNaN();
			expect(fromRoman(null as any)).toBeNaN();
		});

		it('should round-trip with toRoman for all valid values', () => {
			for (const num of [1, 4, 9, 44, 99, 400, 944, 1984, 2026, 3999]) {
				expect(fromRoman(toRoman(num))).toBe(num);
			}
		});
	});
});
