import {
	isNumber, isNumeric, isText, isArrayLike, isPlainObject, isEmpty, isFunction, isCallable, isSafeKey, isLocale,
	isDigits, isHttpUrl, isFileUrl, isWhitespace, isHex, isBase64, isBase64Url, isUuid, hasOwn,
	RE_DIGITS, RE_INTEGER, RE_HTTP_URL, RE_FILE_URL, RE_WHITESPACE, RE_WHITESPACES, RE_COMBINING_MARKS, RE_HEX, RE_HEX_8, RE_BASE64, RE_BASE64URL, RE_UUID
} from '#library/assertion.library.js';

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

	describe('isFunction', () => {
		it('should return true for functions, async functions, generator functions, and async generator functions', () => {
			function fn() {}
			const arrow = () => {};
			async function asyncFn() {}
			function* genFn() {}
			async function* asyncGenFn() {}

			expect(isFunction(fn)).toBe(true);
			expect(isFunction(arrow)).toBe(true);
			expect(isFunction(asyncFn)).toBe(true);
			expect(isFunction(genFn)).toBe(true);
			expect(isFunction(asyncGenFn)).toBe(true);
		});

		it('should return false for ES6 class constructors and non-function values', () => {
			class MyClass {}

			expect(isFunction(MyClass)).toBe(false);
			expect(isFunction({})).toBe(false);
			expect(isFunction([])).toBe(false);
			expect(isFunction('function')).toBe(false);
			expect(isFunction(123)).toBe(false);
			expect(isFunction(null)).toBe(false);
			expect(isFunction(undefined)).toBe(false);
		});
	});

	describe('isCallable', () => {
		it('should return true for all function types and ES6 classes', () => {
			function fn() {}
			const arrow = () => {};
			async function asyncFn() {}
			function* genFn() {}
			async function* asyncGenFn() {}
			class MyClass {}

			expect(isCallable(fn)).toBe(true);
			expect(isCallable(arrow)).toBe(true);
			expect(isCallable(asyncFn)).toBe(true);
			expect(isCallable(genFn)).toBe(true);
			expect(isCallable(asyncGenFn)).toBe(true);
			expect(isCallable(MyClass)).toBe(true);
			expect(isCallable(Intl.Locale)).toBe(true);
		});

		it('should return false for non-callable values', () => {
			expect(isCallable({})).toBe(false);
			expect(isCallable([])).toBe(false);
			expect(isCallable('function')).toBe(false);
			expect(isCallable(123)).toBe(false);
			expect(isCallable(null)).toBe(false);
			expect(isCallable(undefined)).toBe(false);
			expect(isCallable(Symbol('test'))).toBe(false);
		});
	});

	describe('isSafeKey', () => {
		it('should return true for valid object property keys', () => {
			expect(isSafeKey('name')).toBe(true);
			expect(isSafeKey('id')).toBe(true);
			expect(isSafeKey('latitude')).toBe(true);
			expect(isSafeKey(0)).toBe(true);
			expect(isSafeKey(Symbol('custom'))).toBe(true);
		});

		it('should return false for prototype pollution and hijacking keys', () => {
			expect(isSafeKey('__proto__')).toBe(false);
			expect(isSafeKey('constructor')).toBe(false);
			expect(isSafeKey('prototype')).toBe(false);
		});
	});

	describe('isLocale', () => {
		it('should return true for Intl.Locale instances', () => {
			expect(isLocale(new Intl.Locale('en-US'))).toBe(true);
			expect(isLocale(new Intl.Locale('fr-FR'))).toBe(true);
		});

		it('should return false for non-Intl.Locale values', () => {
			expect(isLocale('en-US')).toBe(false);
			expect(isLocale({})).toBe(false);
			expect(isLocale(null)).toBe(false);
			expect(isLocale(undefined)).toBe(false);
			expect(isLocale(123)).toBe(false);
			expect(isLocale(new Date())).toBe(false);
		});
	});

	describe('isDigits and RE_DIGITS', () => {
		it('should return true for digit-only strings', () => {
			expect(isDigits('123')).toBe(true);
			expect(isDigits('0')).toBe(true);
			expect(RE_DIGITS.test('99999')).toBe(true);
		});

		it('should return false for signed numbers or non-digits', () => {
			expect(isDigits('-123')).toBe(false);
			expect(isDigits('+123')).toBe(false);
			expect(isDigits('12.3')).toBe(false);
			expect(isDigits('abc')).toBe(false);
			expect(isDigits(123)).toBe(false);
		});
	});

	describe('isHttpUrl and isFileUrl', () => {
		it('should validate http/https and file URLs correctly', () => {
			expect(isHttpUrl('http://example.com')).toBe(true);
			expect(isHttpUrl('HTTPS://example.com/api')).toBe(true);
			expect(isHttpUrl('ftp://example.com')).toBe(false);
			expect(isHttpUrl('/local/path')).toBe(false);

			expect(isFileUrl('file:///path/to/file.txt')).toBe(true);
			expect(isFileUrl('FILE:///c:/windows')).toBe(true);
			expect(isFileUrl('http://example.com')).toBe(false);
		});
	});

	describe('isWhitespace and RE_WHITESPACE', () => {
		it('should identify strings consisting entirely of whitespace', () => {
			expect(isWhitespace('   ')).toBe(true);
			expect(isWhitespace('\t\n\r')).toBe(true);
			expect(isWhitespace(' ')).toBe(true);
			expect(isWhitespace('')).toBe(false);
			expect(isWhitespace(' a ')).toBe(false);
			expect(isWhitespace(123)).toBe(false);
		});

		it('should split with RE_WHITESPACE and strip with RE_WHITESPACES', () => {
			expect('a   b\tc'.split(RE_WHITESPACE)).toEqual(['a', 'b', 'c']);
			expect('a  b  c'.replace(RE_WHITESPACES, '')).toBe('abc');
		});
	});

	describe('isHex, RE_HEX, and RE_HEX_8', () => {
		it('should validate hexadecimal strings', () => {
			expect(isHex('0123456789abcdefABCDEF')).toBe(true);
			expect(isHex('deadbeef')).toBe(true);
			expect(isHex('xyz')).toBe(false);
			expect(isHex('')).toBe(false);

			expect(RE_HEX_8.test('01234567')).toBe(true);
			expect(RE_HEX_8.test('deadbeef')).toBe(true);
			expect(RE_HEX_8.test('deadbeef0')).toBe(false);
			expect(RE_HEX_8.test('deadbee')).toBe(false);
		});
	});

	describe('isBase64, isBase64Url, and RE_BASE64URL', () => {
		it('should validate Base64 and Base64URL strings', () => {
			expect(isBase64('SGVsbG8gV29ybGQ=')).toBe(true);
			expect(isBase64('YWJj')).toBe(true);
			expect(isBase64('')).toBe(true);
			expect(isBase64('!!!')).toBe(false);
			// Impossible lengths (length % 4 === 1) or bad padding
			expect(isBase64('A')).toBe(false);
			expect(isBase64('ABCDE')).toBe(false);
			expect(isBase64('A=')).toBe(false);

			expect(isBase64Url('SGVsbG8_V29ybGQ-')).toBe(true);
			expect(isBase64Url('abc')).toBe(true);
			expect(isBase64Url('')).toBe(true);
			// Impossible lengths (length % 4 === 1)
			expect(isBase64Url('A')).toBe(false);
			expect(isBase64Url('ABCDE')).toBe(false);
			expect(RE_BASE64URL.test('safe_url-123')).toBe(true);
		});
	});

	describe('isUuid and RE_UUID', () => {
		it('should validate canonical UUID format', () => {
			expect(isUuid('123e4567-e89b-12d3-a456-426614174000')).toBe(true);
			expect(isUuid('c73bcdcc-2669-4bf6-81d3-e4ae73fb11be')).toBe(true);
			expect(isUuid('not-a-uuid')).toBe(false);
			expect(isUuid('123e4567-e89b-12d3-a456')).toBe(false);
		});
	});

	describe('RE_COMBINING_MARKS', () => {
		it('should strip accents and diacritical marks', () => {
			const accented = 'café résumé naïve';
			const normalized = accented.normalize('NFD').replace(RE_COMBINING_MARKS, '');
			expect(normalized).toBe('cafe resume naive');
		});
	});

	describe('hasOwn', () => {
		it('should return true for own properties', () => {
			expect(hasOwn({ a: 1 }, 'a')).toBe(true);
			expect(hasOwn({ a: 0 }, 'a')).toBe(true);
			expect(hasOwn({ a: false }, 'a')).toBe(true);
			expect(hasOwn({ a: '' }, 'a')).toBe(true);
			expect(hasOwn({ a: null }, 'a')).toBe(true);
			expect(hasOwn({ a: undefined }, 'a')).toBe(true);
		});

		it('should return false for inherited prototype properties', () => {
			expect(hasOwn({}, 'toString')).toBe(false);
			expect(hasOwn({}, 'valueOf')).toBe(false);
			expect(hasOwn({}, 'constructor')).toBe(false);
			expect(hasOwn({}, '__proto__')).toBe(false);
		});

		it('should return false for primitives and nullish values without throwing', () => {
			expect(hasOwn(null, 'a')).toBe(false);
			expect(hasOwn(undefined, 'a')).toBe(false);
			expect(hasOwn(123, 'a')).toBe(false);
			expect(hasOwn('str', 'a')).toBe(false);
			expect(hasOwn(true, 'a')).toBe(false);
		});

		it('should not degrade existing property types (plain boolean, no narrowing)', () => {
			const record: Record<string, any> = { provider: { name: 'geo' } };
			if (hasOwn(record, 'provider')) {
				expect(record.provider.name).toBe('geo');
			}
		});
	});
});

