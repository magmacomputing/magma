import { ifNumeric, asInteger, asText, asNumber, when } from '#library/coercion.library.js';

describe('Coercion Library', () => {
	describe('asText', () => {
		it('should return trimmed string for non-empty strings', () => {
			expect(asText('hello')).toBe('hello');
			expect(asText('  hello  ')).toBe('hello');
			expect(asText('  0  ')).toBe('0');
		});

		it('should return undefined or fallback for empty strings and non-strings', () => {
			expect(asText('')).toBeUndefined();
			expect(asText('   ')).toBeUndefined();
			expect(asText(null)).toBeUndefined();
			expect(asText(undefined)).toBeUndefined();
			expect(asText(123)).toBeUndefined();
			expect(asText({})).toBeUndefined();

			expect(asText('', 'fallback')).toBe('fallback');
			expect(asText('   ', 'default')).toBe('default');
			expect(asText(null, 'default')).toBe('default');
		});

		it('should deep-clean control characters and multi-spaces when deepClean is true', () => {
			expect(asText('  hello \t world \n', undefined, true)).toBe('hello world');
			expect(asText('line1\r\nline2', undefined, true)).toBe('line1 line2');
			expect(asText('foo    bar', undefined, true)).toBe('foo bar');
			expect(asText('  undefined \t text \n', undefined, true)).toBe('undefined text');
		});
	});

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

	describe('asNumber', () => {
		it('should return number for finite numbers, BigInts, and numeric strings', () => {
			expect(asNumber(123)).toBe(123);
			expect(asNumber(123.45)).toBe(123.45);
			expect(asNumber(0)).toBe(0);
			expect(asNumber(-42)).toBe(-42);
			expect(asNumber(123n)).toBe(123);
			expect(asNumber('123.45')).toBe(123.45);
			expect(asNumber('  123.45  ')).toBe(123.45);
			expect(asNumber('0')).toBe(0);
		});

		it('should return undefined or fallback for non-numbers, NaN, infinities, and empty strings', () => {
			expect(asNumber('')).toBeUndefined();
			expect(asNumber('   ')).toBeUndefined();
			expect(asNumber('abc')).toBeUndefined();
			expect(asNumber(null)).toBeUndefined();
			expect(asNumber(undefined)).toBeUndefined();
			expect(asNumber(NaN)).toBeUndefined();
			expect(asNumber(Infinity)).toBeUndefined();
			expect(asNumber(-Infinity)).toBeUndefined();
			expect(asNumber({})).toBeUndefined();

			expect(asNumber('abc', 0)).toBe(0);
			expect(asNumber(null, 1.0)).toBe(1.0);
			expect(asNumber(0, 1.0)).toBe(0);
			expect(asNumber('invalid', null)).toBeNull();
		});

		it('should handle BigInt conversion and fallback on non-finite results', () => {
			expect(asNumber(42n)).toBe(42);
			expect(asNumber(0n)).toBe(0);
			expect(asNumber(-100n)).toBe(-100);
			const hugeBigInt = 10n ** 1000n;
			expect(asNumber(hugeBigInt)).toBeUndefined();
			expect(asNumber(hugeBigInt, 0)).toBe(0);
		});
	});

	describe('when', () => {
		it('should return value when guard passes, otherwise undefined or fallback', () => {
			const isPositive = (v: unknown): v is number => typeof v === 'number' && v > 0;

			expect(when(10, isPositive)).toBe(10);
			expect(when(-5, isPositive)).toBeUndefined();
			expect(when(-5, isPositive, 0)).toBe(0);
			expect(when('hello', (v): v is string => typeof v === 'string')).toBe('hello');
			expect(when(123, (v): v is string => typeof v === 'string')).toBeUndefined();
			expect(when(123, (v): v is string => typeof v === 'string', 'default')).toBe('default');
		});
	});
});
