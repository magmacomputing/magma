import { defineFrom, defineLazy, defineProp, flattenObject } from '#library/primitive.library.js';
import type { PropFlag } from '#library/primitive.library.js';
import { proxify } from '#library/proxy.library.js';

describe('defineProp', () => {
	it.each(['invalid', 'toString', '__proto__', 'constructor'])('rejects unknown flag %s without modifying the target', flag => {
		const target = { value: 1 };
		const original = Object.getOwnPropertyDescriptor(target, 'value');
		for (const flags of [flag, ['mutable', flag]]) {
			expect(() => defineProp(target, 'value', 2, flags as PropFlag)).toThrow(TypeError);
			expect(Object.getOwnPropertyDescriptor(target, 'value')).toEqual(original);
		}
	});

	it.each<[PropFlag, boolean, boolean, boolean]>([
		['mutable', true, true, true],
		['readonly', true, false, false],
		['hidden', false, true, true],
		['sealed', false, false, false],
		['writable', false, true, false],
		['enumerable', true, false, false],
		['configurable', false, false, true],
	])('applies the %s descriptor preset', (flag, enumerable, writable, configurable) => {
		const target = {};
		const value = {};
		expect(defineProp(target, 'value', value, flag)).toBe(target);
		expect(Object.getOwnPropertyDescriptor(target, 'value')).toEqual({
			value, enumerable, writable, configurable,
		});
	});

	it('defaults to a mutable property, including an undefined value', () => {
		const target = {};
		defineProp(target, 'value', undefined);
		expect(Object.getOwnPropertyDescriptor(target, 'value')).toEqual({
			value: undefined, enumerable: true, writable: true, configurable: true,
		});
	});

	it('combines flags additively for symbol keys without changing the flags array', () => {
		const key = Symbol('value');
		const flags = Object.freeze(['readonly', 'configurable'] as const);
		const target = {};
		defineProp(target, key, 42, flags);
		expect(Object.getOwnPropertyDescriptor(target, key)).toEqual({
			value: 42, enumerable: true, writable: false, configurable: true,
		});
		defineProp(target, key, 43, flags);
		expect(Reflect.get(target, key)).toBe(43);
	});

	it('uses no descriptor permissions for an empty flag list', () => {
		const target = {};
		defineProp(target, 'value', 1, []);
		expect(Object.getOwnPropertyDescriptor(target, 'value')).toEqual({
			value: 1, enumerable: false, writable: false, configurable: false,
		});
		expect(Reflect.set(target, 'value', 2)).toBe(false);
		expect(Reflect.deleteProperty(target, 'value')).toBe(false);
		expect(() => defineProp(target, 'value', 2)).toThrow(TypeError);
	});

	it('rejects adding properties to a non-extensible target', () => {
		expect(() => defineProp(Object.preventExtensions({}), 'value', 1)).toThrow(TypeError);
	});
});

describe('defineLazy', () => {
	it('can invalidate a cached value by deleting its configurable property', () => {
		const target: { value?: number } = {};
		const factory = vi.fn().mockReturnValueOnce(1).mockReturnValueOnce(2);
		defineLazy(target, 'value', factory);
		expect(target.value).toBe(1);
		expect(Reflect.deleteProperty(target, 'value')).toBe(true);
		defineLazy(target, 'value', factory);
		expect(target.value).toBe(2);
		expect(target.value).toBe(2);
		expect(factory).toHaveBeenCalledTimes(2);
	});

	it('recomputes on frozen receivers without trying to replace their getter', () => {
		const target: { value?: number } = {};
		const factory = vi.fn(() => 42);
		defineLazy(target, 'value', factory);
		Object.freeze(target);
		expect(target.value).toBe(42);
		expect(target.value).toBe(42);
		expect(factory).toHaveBeenCalledTimes(2);
		expect(Object.getOwnPropertyDescriptor(target, 'value')?.get).toBeDefined();
	});

	it('allows deleting a cached value to reveal the inherited lazy getter again', () => {
		const prototype = {};
		const factory = vi.fn().mockReturnValueOnce(1).mockReturnValueOnce(2);
		defineLazy(prototype, 'value', factory);
		const receiver = Object.create(prototype);
		expect(receiver.value).toBe(1);
		expect(Reflect.deleteProperty(receiver, 'value')).toBe(true);
		expect(receiver.value).toBe(2);
		expect(receiver.value).toBe(2);
		expect(factory).toHaveBeenCalledTimes(2);
	});
	it('defers computation and caches undefined as a read-only data property', () => {
		const target: { value?: unknown } = {};
		const factory = vi.fn(() => undefined);
		expect(defineLazy(target, 'value', factory)).toBe(target);
		expect(factory).not.toHaveBeenCalled();
		expect(target.value).toBeUndefined();
		expect(target.value).toBeUndefined();
		expect(factory).toHaveBeenCalledTimes(1);
		expect(Object.getOwnPropertyDescriptor(target, 'value')).toEqual({
			value: undefined, enumerable: true, writable: false, configurable: true,
		});
	});

	it('binds inherited getters to each receiver and caches independently', () => {
		const key = Symbol('lazy');
		const prototype = { seed: 0 };
		const factory = vi.fn(function (this: typeof prototype) { return { seed: this.seed }; });
		defineLazy(prototype, key, factory, false);
		const first = Object.assign(Object.create(prototype), { seed: 1 });
		const second = Object.assign(Object.create(prototype), { seed: 2 });
		expect(first[key]).toEqual({ seed: 1 });
		expect(first[key]).toBe(first[key]);
		expect(second[key]).toEqual({ seed: 2 });
		expect(factory).toHaveBeenCalledTimes(2);
		expect(Object.getOwnPropertyDescriptor(prototype, key)?.get).toBeDefined();
		expect(Object.getOwnPropertyDescriptor(first, key)).toEqual({
			value: first[key], enumerable: false, writable: false, configurable: true,
		});
	});

	it('recomputes without throwing when the receiver is non-extensible', () => {
		const target: { value?: number } = {};
		const factory = vi.fn(() => 42);
		defineLazy(target, 'value', factory);
		Object.preventExtensions(target);
		expect(target.value).toBe(42);
		expect(target.value).toBe(42);
		expect(factory).toHaveBeenCalledTimes(2);
		expect(Object.getOwnPropertyDescriptor(target, 'value')?.get).toBeDefined();
	});

	it('retries after a factory throws instead of caching a failed computation', () => {
		const target: { value?: number } = {};
		const failure = new Error('not ready');
		const factory = vi.fn().mockImplementationOnce(() => { throw failure; }).mockReturnValue(42);
		defineLazy(target, 'value', factory);
		expect(() => target.value).toThrow(failure);
		expect(target.value).toBe(42);
		expect(target.value).toBe(42);
		expect(factory).toHaveBeenCalledTimes(2);
	});

	it('caches on the raw target when accessed through a readonly proxy', () => {
		const target: { value?: object } = {};
		const value = {};
		const factory = vi.fn(() => value);
		defineLazy(target, 'value', factory);
		const proxy = proxify(target, 'readonly');
		expect(proxy.value).toBe(value);
		expect(proxy.value).toBe(target.value);
		expect(factory).toHaveBeenCalledTimes(1);
		expect(Object.getOwnPropertyDescriptor(target, 'value')?.get).toBeUndefined();
	});
});

describe('defineFrom', () => {
	it('replaces configurable accessors with data descriptors without reading them', () => {
		const getter = vi.fn(() => 1);
		const target = Object.defineProperty({}, 'value', { get: getter, configurable: true });
		const source = { value: 2 };
		defineFrom(target, source);
		expect(getter).not.toHaveBeenCalled();
		expect(Object.getOwnPropertyDescriptor(target, 'value')).toEqual(Object.getOwnPropertyDescriptor(source, 'value'));
	});

	it('rejects overwriting a non-configurable property', () => {
		const target = Object.freeze({ value: 1 });
		expect(() => defineFrom(target, { value: 2 })).toThrow(TypeError);
		expect(target.value).toBe(1);
	});

	it('copies own descriptors without evaluating getters or copying inherited properties', () => {
		const key = Symbol('hidden');
		const getter = vi.fn(() => 42);
		const setter = vi.fn();
		const source = Object.create({ inherited: true });
		Object.defineProperties(source, {
			value: { get: getter, set: setter, enumerable: true, configurable: true },
			[key]: { value: {}, writable: false, enumerable: false, configurable: false },
		});
		const target = { retained: true };
		expect(defineFrom(target, source)).toBe(target);
		expect(getter).not.toHaveBeenCalled();
		for (const property of Reflect.ownKeys(source))
			expect(Object.getOwnPropertyDescriptor(target, property)).toEqual(Object.getOwnPropertyDescriptor(source, property));
		expect(target).not.toHaveProperty('inherited');
		expect(target.retained).toBe(true);
		Reflect.set(target, 'value', 9);
		expect(setter).toHaveBeenCalledWith(9);
	});

	it('rejects an incompatible redefinition of a non-configurable property', () => {
		const target = Object.defineProperty({}, 'value', { value: 1 });
		expect(() => defineFrom(target, { value: 2 })).toThrow(TypeError);
		expect(Reflect.get(target, 'value')).toBe(1);
	});
});

describe('flattenObject', () => {
	it('flattens multiple levels, symbols and getters into a fresh shallow plain object', () => {
		const key = Symbol('member');
		const nested = {};
		const base = Object.assign(Object.create(null), { base: true, overridden: 1, [key]: 2 });
		const middle = Object.assign(Object.create(base), { overridden: 3 });
		const source = Object.assign(Object.create(middle), { nested, [key]: 4 });
		const getter = vi.fn(() => 7);
		Object.defineProperty(source, 'computed', { get: getter, enumerable: true });
		Object.defineProperty(base, 'hidden', { value: 'secret' });
		const result = flattenObject(proxify(source, 'readonly'));
		expect(result).toEqual({ base: true, overridden: 3, nested, [key]: 4, computed: 7 });
		expect(Object.getPrototypeOf(result)).toBe(Object.prototype);
		expect(result.nested).toBe(nested);
		expect(getter).toHaveBeenCalledTimes(1);
		result.overridden = 99;
		expect(source.overridden).toBe(3);
	});

	it('copies __proto__ as data without changing the result prototype', () => {
		const source = Object.create(null);
		source.__proto__ = { injected: true };
		const result = flattenObject(source);
		expect(Object.getPrototypeOf(result)).toBe(Object.prototype);
		expect(Object.hasOwn(result, '__proto__')).toBe(true);
		expect(result).not.toHaveProperty('injected');
		expect(flattenObject(Object.create(null))).toEqual({});
	});
});
