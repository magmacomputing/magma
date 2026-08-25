import { isNumber, isNumeric, isText, isArrayLike, isPlainObject, isEmpty } from '#library/assertion.library.js';

describe('Assertion Library', () => {

	describe('isText', () => {
		it('should return true for non-empty, non-whitespace strings', () => {
			expect(isText('hello')).toBe(true);
			expect(isText(' a ')).toBe(true);
			expect(isText('0')).toBe(true);
			expect(isText('false')).toBe(true);
		});

		it('should return false for empty or whitespace-only strings', () => {
			expect(isText('')).toBe(false);
			expect(isText('   ')).toBe(false);
			expect(isText('\t\n\r')).toBe(false);
		});

		it('should return false for non-string types', () => {
			expect(isText(null)).toBe(false);
			expect(isText(undefined)).toBe(false);
			expect(isText(123)).toBe(false);
			expect(isText(0)).toBe(false);
			expect(isText(true)).toBe(false);
			expect(isText({})).toBe(false);
			expect(isText([])).toBe(false);
		});
	});

	describe('isPlainObject', () => {
		it('should return true for object literals and Object.create(null)', () => {
			expect(isPlainObject({})).toBe(true);
			expect(isPlainObject({ a: 1, b: 'hello' })).toBe(true);
			expect(isPlainObject(Object.create(null))).toBe(true);
		});

		it('should return false for class instances, arrays, Maps, Sets, and primitives', () => {
			class CustomClass {
				test() { return 1; }
			}

			expect(isPlainObject(new CustomClass())).toBe(false);
			expect(isPlainObject(new Map())).toBe(false);
			expect(isPlainObject(new Set())).toBe(false);
			expect(isPlainObject(new Date())).toBe(false);
			expect(isPlainObject(/regex/)).toBe(false);
			expect(isPlainObject([1, 2, 3])).toBe(false);
			expect(isPlainObject(null)).toBe(false);
			expect(isPlainObject(undefined)).toBe(false);
			expect(isPlainObject('string')).toBe(false);
			expect(isPlainObject(123)).toBe(false);
			expect(isPlainObject(true)).toBe(false);
		});
	});

	describe('isEmpty', () => {
		it('should return true for nullish and empty values', () => {
			expect(isEmpty(null)).toBe(true);
			expect(isEmpty(undefined)).toBe(true);
			expect(isEmpty('')).toBe(true);
			expect(isEmpty('   ')).toBe(true);
			expect(isEmpty({})).toBe(true);
			expect(isEmpty([])).toBe(true);
			expect(isEmpty(new Set())).toBe(true);
			expect(isEmpty(new Map())).toBe(true);
			expect(isEmpty(NaN)).toBe(true);
			expect(isEmpty(new Uint8Array(0))).toBe(true);
			expect(isEmpty(Buffer.alloc(0))).toBe(true);
			expect(isEmpty(new DataView(new ArrayBuffer(0)))).toBe(true);
			expect(isEmpty(new Date('invalid'))).toBe(true);
		});

		it('should return false for non-empty values', () => {
			expect(isEmpty(0)).toBe(false);
			expect(isEmpty(42)).toBe(false);
			expect(isEmpty(-1)).toBe(false);
			expect(isEmpty(Infinity)).toBe(false);
			expect(isEmpty(false)).toBe(false);
			expect(isEmpty(true)).toBe(false);
			expect(isEmpty('hello')).toBe(false);
			expect(isEmpty({ a: 1 })).toBe(false);
			expect(isEmpty([1])).toBe(false);
			expect(isEmpty(new Set([1]))).toBe(false);
			expect(isEmpty(new Map([['a', 1]]))).toBe(false);
			expect(isEmpty(new Uint8Array([1, 2, 3]))).toBe(false);
			expect(isEmpty(Buffer.from('hello'))).toBe(false);
			expect(isEmpty(new Date())).toBe(false);
		});
	});

	describe('isNumber', () => {
		it('should return true for valid finite numbers', () => {
			expect(isNumber(0)).toBe(true);
			expect(isNumber(42)).toBe(true);
			expect(isNumber(-3.14159)).toBe(true);
			expect(isNumber(Number.MAX_SAFE_INTEGER)).toBe(true);
			expect(isNumber(Number.MIN_SAFE_INTEGER)).toBe(true);
			expect(isNumber(Number.EPSILON)).toBe(true);
		});

		it('should return false for NaN', () => {
			expect(isNumber(NaN)).toBe(false);
			expect(isNumber(Number.NaN)).toBe(false);
			expect(isNumber(0 / 0)).toBe(false);
			expect(isNumber(parseInt('not-a-number', 10))).toBe(false);
		});

		it('should return false for Infinity and -Infinity', () => {
			expect(isNumber(Infinity)).toBe(false);
			expect(isNumber(-Infinity)).toBe(false);
			expect(isNumber(Number.POSITIVE_INFINITY)).toBe(false);
			expect(isNumber(Number.NEGATIVE_INFINITY)).toBe(false);
			expect(isNumber(1 / 0)).toBe(false);
		});

		it('should return false for non-number types', () => {
			expect(isNumber('42')).toBe(false);
			expect(isNumber('0')).toBe(false);
			expect(isNumber(null)).toBe(false);
			expect(isNumber(undefined)).toBe(false);
			expect(isNumber({})).toBe(false);
			expect(isNumber([])).toBe(false);
			expect(isNumber(true)).toBe(false);
			expect(isNumber(100n)).toBe(false);
		});
	});

	describe('isNumeric', () => {
		it('should return true for numbers, BigInts, and numeric strings', () => {
			expect(isNumeric(42)).toBe(true);
			expect(isNumeric(0)).toBe(true);
			expect(isNumeric(123n)).toBe(true);
			expect(isNumeric('123')).toBe(true);
			expect(isNumeric('-45.67')).toBe(true);
			expect(isNumeric('123n')).toBe(true);
		});

		it('should return false for non-numeric values, NaN, and Infinity', () => {
			expect(isNumeric(NaN)).toBe(false);
			expect(isNumeric(Infinity)).toBe(false);
			expect(isNumeric('abc')).toBe(false);
			expect(isNumeric('')).toBe(false);
			expect(isNumeric(null)).toBe(false);
			expect(isNumeric(undefined)).toBe(false);
		});
	});

	describe('isArrayLike', () => {
		it('should return true for array-like objects', () => {
			expect(isArrayLike({ 0: 'a', 1: 'b', length: 2 })).toBe(true);
		});

		it('should return false for plain non-array-like objects', () => {
			expect(isArrayLike({ a: 1, b: 2 })).toBe(false);
		});
	});

});
