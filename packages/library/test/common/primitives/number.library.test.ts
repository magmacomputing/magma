import { toHex, suffix, split, fix, asTime, convertToRoman, TIMEOUT_MAX } from '#library/number.library.js';

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
			expect(convertToRoman(1)).toBe('I');
			expect(convertToRoman(4)).toBe('IV');
			expect(convertToRoman(9)).toBe('IX');
			expect(convertToRoman(10)).toBe('X');
			expect(convertToRoman(14)).toBe('XIV');
			expect(convertToRoman(40)).toBe('XL');
			expect(convertToRoman(90)).toBe('XC');
			expect(convertToRoman(2026)).toBe('MMXXVI');
			expect(convertToRoman(3999)).toBe('MMMCMXCIX');
		});

		it('should return empty string for non-integers and numbers outside 1..3999', () => {
			expect(convertToRoman(0)).toBe('');
			expect(convertToRoman(-1)).toBe('');
			expect(convertToRoman(4000)).toBe('');
			expect(convertToRoman(12.5)).toBe('');
			expect(convertToRoman(NaN)).toBe('');
		});
	});
});
