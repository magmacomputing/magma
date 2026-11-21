import { omit, purge, allObject, lazyMethod } from '#library/reflection.library.js';

describe('lazyMethod descriptors', () => {
	it('reifies a hidden mutable method on each receiver independently', () => {
		const prototype = { value: 0 };
		const factory = vi.fn(function (this: typeof prototype) {
			const value = this.value;
			return () => value;
		});
		lazyMethod(prototype, 'method', factory);
		const first = Object.assign(Object.create(prototype), { value: 1 });
		const second = Object.assign(Object.create(prototype), { value: 2 });
		expect(factory).not.toHaveBeenCalled();
		expect(first.method()).toBe(1);
		expect(first.method()).toBe(1);
		expect(second.method()).toBe(2);
		expect(factory).toHaveBeenCalledTimes(2);
		expect(Object.getOwnPropertyDescriptor(first, 'method')).toEqual({
			value: first.method, enumerable: false, writable: true, configurable: true,
		});
		expect(Object.getOwnPropertyDescriptor(prototype, 'method')?.get).toBeDefined();
		first.method = () => 3;
		expect(first.method()).toBe(3);
		expect(second.method()).toBe(2);
	});

	it('returns the method without caching on non-extensible receivers', () => {
		const prototype = {};
		const method = () => 42;
		const factory = vi.fn(() => method);
		lazyMethod(prototype, 'method', factory);
		const receiver = Object.preventExtensions(Object.create(prototype));
		expect(receiver.method()).toBe(42);
		expect(receiver.method).toBe(method);
		expect(factory).toHaveBeenCalledTimes(2);
		expect(Object.hasOwn(receiver, 'method')).toBe(false);
	});
});

describe('Reflection Library', () => {
	describe('allObject on prototype-backed objects', () => {
		it('flattens inherited symbols and evaluates accessors against the derived receiver', () => {
			const key = Symbol('inherited');
			const nested = { value: 1 };
			const getter = vi.fn(function (this: { value: number }) { return this.value * 2; });
			const parent = Object.defineProperty({ value: 1, nested, [key]: 'base' }, 'computed', {
				get: getter, enumerable: true,
			});
			const child = Object.assign(Object.create(parent), { value: 3 });
			const result = allObject(child);
			expect(result).toEqual({ value: 3, nested, [key]: 'base', computed: 6 });
			expect(Object.getPrototypeOf(result)).toBe(Object.prototype);
			expect(result.nested).toBe(nested);
			expect(getter).toHaveBeenCalledTimes(1);
			expect(getter.mock.contexts[0]).toBe(child);
		});

		it('omits inherited members shadowed by non-enumerable own properties', () => {
			const child = Object.create({ hidden: 1, visible: 2 });
			Object.defineProperty(child, 'hidden', { value: 3 });
			expect(allObject(child)).toEqual({ visible: 2 });
		});
	});

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

