import { omit, purge, allObject } from '#library/reflection.library.js';

describe('Reflection Library', () => {
	describe('allObject on Array', () => {
		it('should read array elements by numeric index rather than consuming custom Symbol.iterator', () => {
			const arr = ['first', 'second'];
			// Define custom iterator that yields unexpected items
			(arr as any)[Symbol.iterator] = function* () {
				yield 'custom-1';
				yield 'custom-2';
			};
			const result = allObject(arr);
			expect(result).toEqual(['first', 'second']);
		});
	});

	describe('omit/purge on Array', () => {
		it('should clear an array using purge', () => {
			const arr = [1, 2, 3];
			purge(arr);
			expect(arr.length).toBe(0);
			expect(arr).toEqual([]);
		});

		it('should clear an array using omit with no keys', () => {
			const arr = ['a', 'b', 'c'];
			omit(arr);
			expect(arr.length).toBe(0);
			expect(arr).toEqual([]);
		});

		it('should omit specific keys from an array', () => {
			const arr = ['a', 'b', 'c'];
			omit(arr, 1);																				// remove index 1
			expect(arr).toEqual(['a', 'c']);

			const longArr = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11'];
			omit(longArr, 2, 10);
			expect(longArr).toEqual(['0', '1', '3', '4', '5', '6', '7', '8', '9', '11']);
		});

		it('should ignore Symbol keys when omitting from an array without throwing', () => {
			const arr = ['a', 'b', 'c'];
			omit(arr, Symbol('test') as any);
			expect(arr).toEqual(['a', 'b', 'c']);
		});
	});
});

