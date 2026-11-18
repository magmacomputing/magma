import {
	toArray,
	ownEntries,
	ownKeys,
	ownValues,
	unwrap,
	distinct,
	defineProp,
	defineLazy,
	defineFrom,
	flattenObject,
} from '#library/primitive.library.js';

describe('Primitive Library', () => {
	describe('toArray', () => {
		it('should convert a regular array to a shallow copy', () => {
			const original = [1, 2, 3];
			const result = toArray(original);
			expect(result).toEqual([1, 2, 3]);
			expect(result).not.toBe(original);
		});

		it('should convert an array-like object to an array', () => {
			const arrayLike = { 0: 'alpha', 1: 'beta', length: 2 };
			const result = toArray(arrayLike);
			expect(result).toEqual(['alpha', 'beta']);
		});

		it('should convert a string to an array of characters', () => {
			const result = toArray('tempo');
			expect(result).toEqual(['t', 'e', 'm', 'p', 'o']);
		});

		it('should return an empty array for nullish or invalid inputs', () => {
			expect(toArray(null)).toEqual([]);
			expect(toArray(undefined)).toEqual([]);
			expect(toArray({} as any)).toEqual([]);
			expect(toArray(123 as any)).toEqual([]);
			expect(toArray({ length: -1 } as any)).toEqual([]);
			expect(toArray({ length: 'invalid' } as any)).toEqual([]);
			expect(toArray({ length: NaN } as any)).toEqual([]);
			expect(toArray({ length: Infinity } as any)).toEqual([]);
			expect(toArray({ length: 2.5 } as any)).toEqual([]);
		});

		it('should read array elements by numeric index bypassing custom Symbol.iterator', () => {
			const custom = ['first', 'second'];
			(custom as any)[Symbol.iterator] = function* () {
				yield 'iterator-hijacked-1';
				yield 'iterator-hijacked-2';
			};

			const result = toArray(custom);
			expect(result).toEqual(['first', 'second']);
		});

		it('should preserve sparse array holes as undefined values', () => {
			const sparse = [10];
			sparse[2] = 30;
			const result = toArray(sparse);
			expect(result).toStrictEqual([10, undefined, 30]);
		});

		it('should return empty array for lengths exceeding maximum array length 0xFFFFFFFF', () => {
			const arrayLike = { length: 0x100000000 };
			expect(toArray(arrayLike)).toEqual([]);
		});
	});

	describe('ownEntries, ownKeys, ownValues', () => {
		it('should retrieve own entries, keys, and values from an object', () => {
			const obj = { a: 1, b: 2 };
			expect(ownEntries(obj)).toEqual([['a', 1], ['b', 2]]);
			expect(ownKeys(obj)).toEqual(['a', 'b']);
			expect(ownValues(obj)).toEqual([1, 2]);
		});

		it('flattens prototype-chained properties via flattenObject', () => {
			const base = { a: 1, b: 2, visible: 1 };
			const child = Object.assign(Object.create(base), { b: 20, c: 3 });
			defineProp(child, 'visible', 2, 'hidden');
			expect(flattenObject(child)).toEqual({ a: 1, b: 20, c: 3 });

			const proxyWithGhostKey = new Proxy(Object.create({ a: 1 }), { ownKeys: () => ['a'] });
			expect(flattenObject(proxyWithGhostKey)).toEqual({ a: 1 });
		});
	});

	describe('descriptor helpers', () => {
		it('handles defineProp, defineLazy, and defineFrom', () => {
			const target: Record<string, any> = {};
			defineProp(target, 'secret', 123, 'hidden');
			expect(target.secret).toBe(123);
			expect(Object.keys(target)).not.toContain('secret');

			defineProp(target, 'locked', 'ok', 'readonly');
			expect(target.locked).toBe('ok');
			expect(() => { target.locked = 'fail'; }).toThrow(TypeError);

			defineProp(target, 'sealedFlag', true, 'sealed');
			expect(Object.getOwnPropertyDescriptor(target, 'sealedFlag')).toEqual({
				value: true,
				enumerable: false,
				writable: false,
				configurable: false,
			});

			const spy = vi.fn(() => ({ computed: true }));
			defineLazy(target, 'lazyProp', spy);
			expect(target.lazyProp).toEqual({ computed: true });
			expect(target.lazyProp).toEqual({ computed: true });
			expect(spy).toHaveBeenCalledTimes(1);

			const symKey = Symbol('meta');
			const src = {};
			defineProp(src, symKey, 'symVal', 'hidden');
			defineProp(src, 'pub', 42, ['readonly', 'configurable']);
			const clone = defineFrom({} as any, src);
			expect(clone[symKey]).toBe('symVal');
			expect(clone.pub).toBe(42);
			expect(Object.getOwnPropertyDescriptor(clone, 'pub')?.writable).toBe(false);
			expect(Object.getOwnPropertyDescriptor(clone, 'pub')?.configurable).toBe(true);

			const lockedLazy: { ans?: number } = {};
			defineLazy(lockedLazy, 'ans', () => 99);
			Object.defineProperty(lockedLazy, 'ans', { configurable: false });
			expect(lockedLazy.ans).toBe(99);
		});
	});
});
