import { sym } from '#library/symbol.library.js';
import {
	toArray,
	ownEntries,
	ownKeys,
	ownValues,
	unwrap,
	walkPrototype,
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

			expect(() => defineProp({}, 'bad', 1, 'readOnly' as any)).toThrow(TypeError);
			expect(() => defineProp({}, 'badArr', 1, ['readonly', 'bogus' as any])).toThrow(TypeError);
		});
	});

	describe('walkPrototype', () => {
		it('returns empty for non-reference and function inputs', () => {
			for (const input of [null, undefined, 0, 42, 'str', true, Symbol('x'), () => {}])
				expect(Array.from(walkPrototype(input))).toEqual([]);
		});

		it('walks null-prototype and Object.prototype-terminated chains without yielding Object.prototype', () => {
			const grand = Object.create(null);
			grand.a = 1;
			const parent = Object.create(grand);
			parent.b = 2;
			const child = Object.create(parent);
			child.c = 3;

			expect(Array.from(walkPrototype(child))).toEqual([child, parent, grand]);

			const plainParent = { p: 1 };
			const plainChild = Object.create(plainParent);
			expect(Array.from(walkPrototype(plainChild))).toEqual([plainChild, plainParent]);
			expect(Array.from(walkPrototype(Object.prototype))).toEqual([]);
		});

		it('supports Proxy unwrapping (unwrapProxies = true vs false)', () => {
			const base = { a: 1 };
			const target = Object.create(base);
			const proxy = new Proxy(target, {
				get(t, prop, receiver) {
					if (prop === sym.$Target)
						return t;
					return Reflect.get(t, prop, receiver);
				},
			});

			expect(Array.from(walkPrototype(proxy))).toEqual([target, base]);
			expect(Array.from(walkPrototype(proxy, false))).toEqual([proxy, base]);

			const proxyProto = { fromProxy: true };
			const targetProto = { fromTarget: true };
			const rawTarget = Object.create(targetProto);
			const customProtoProxy = new Proxy(rawTarget, {
				get(t, prop, receiver) {
					if (prop === sym.$Target)
						return t;
					return Reflect.get(t, prop, receiver);
				},
				getPrototypeOf() {
					return proxyProto;
				},
			});
			expect(Array.from(walkPrototype(customProtoProxy))).toEqual([rawTarget, targetProto]);
			expect(Array.from(walkPrototype(customProtoProxy, false))).toEqual([customProtoProxy, proxyProto]);

			const wrappedRoot = new Proxy({}, {
				get(t, prop, receiver) {
					if (prop === sym.$Target)
						return Object.prototype;
					return Reflect.get(t, prop, receiver);
				},
			});
			expect(Array.from(walkPrototype(wrappedRoot))).toEqual([]);
		});

		it('guards against cyclic $Target chains and enforces maxDepth', () => {
			const a: any = {};
			const b: any = {};
			a[sym.$Target] = b;
			b[sym.$Target] = a;
			expect(Array.from(walkPrototype(a))).toEqual([b]);

			const makeInfinite = (): object => new Proxy({}, {
				getPrototypeOf: makeInfinite,
			});
			expect(() => Array.from(walkPrototype(makeInfinite(), true, 5))).toThrow(RangeError);
		});

		it('stops lazily on early break', () => {
			let protoCalls = 0;
			const first = new Proxy({}, {
				getPrototypeOf(t) {
					protoCalls++;
					return Object.getPrototypeOf(t);
				},
			});

			const yielded: object[] = [];
			for (const level of walkPrototype(first, false)) {
				yielded.push(level);
				break;
			}
			expect(protoCalls).toBe(0);
			expect(yielded.length).toBe(1);
			expect(yielded[0]).toBe(first);
		});
	});
});
