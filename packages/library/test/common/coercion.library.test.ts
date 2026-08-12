import { ifNumeric, asInteger } from '../../src/common/coercion.library.js';

describe('Coercion Library', () => {
	describe('ifNumeric', () => {
		it('should parse signed integer strings beyond max safe integer precisely as bigint', () => {
			expect(ifNumeric('+9007199254740993')).toBe(9007199254740993n);
			expect(ifNumeric('-9007199254740993')).toBe(-9007199254740993n);
		});

		it('should parse padded equivalents and trim strings correctly', () => {
			expect(ifNumeric(' +9007199254740993 ')).toBe(9007199254740993n);
			expect(ifNumeric('  +123n  ')).toBe(123);
			expect(ifNumeric('  -123n  ')).toBe(-123);
			expect(ifNumeric(' +123 ')).toBe(123);
			expect(ifNumeric(' -123 ')).toBe(-123);
		});

		it('should handle zero-padded strings correctly depending on stripZero', () => {
			expect(ifNumeric(' 012 ')).toBe(' 012 ');
			expect(ifNumeric(' 012 ', true)).toBe(12);
		});

		it('should handle NaN and infinities by passing through', () => {
			expect(ifNumeric(NaN)).toBeNaN();
			expect(ifNumeric(Infinity)).toBe(Infinity);
			expect(ifNumeric(-Infinity)).toBe(-Infinity);
		});
	});

	describe('asInteger', () => {
		it('should coerce strings with optional plus sign and padding to BigInt', () => {
			expect(asInteger('+9007199254740993')).toBe(9007199254740993n);
			expect(asInteger(' +9007199254740993n ')).toBe(9007199254740993n);
			expect(asInteger(' +123 ')).toBe(123n);
			expect(asInteger(' +123n ')).toBe(123n);
		});

		it('should throw SyntaxError for sign-only strings like + and -', () => {
			expect(() => asInteger('+')).toThrow(SyntaxError);
			expect(() => asInteger('-')).toThrow(SyntaxError);
			expect(() => asInteger('  +  ')).toThrow(SyntaxError);
		});
	});
});
