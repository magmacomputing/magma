import { toHex, suffix, split, fix, asTime } from '#library/number.library.js';

describe('Number Library', () => {
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
});
