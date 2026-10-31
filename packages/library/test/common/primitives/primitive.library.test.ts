import { toArray, ownEntries, ownKeys, ownValues, unwrap, distinct } from '#library/primitive.library.js';

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
	});

	describe('ownEntries, ownKeys, ownValues', () => {
		it('should retrieve own entries, keys, and values from an object', () => {
			const obj = { a: 1, b: 2 };
			expect(ownEntries(obj)).toEqual([['a', 1], ['b', 2]]);
			expect(ownKeys(obj)).toEqual(['a', 'b']);
			expect(ownValues(obj)).toEqual([1, 2]);
		});
	});
});
