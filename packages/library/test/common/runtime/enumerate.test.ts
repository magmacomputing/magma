import { enumify, Enum, isEnum } from '#library/enumerate.library.js';
import { unwrap } from '#library/primitive.library.js';

describe('Enum descriptor preservation', () => {
	it('refreshes every reflection view when a frozen child inherits a mutable enum', () => {
		const parent = Enum.from({ A: 1 }, false);
		const child = Enum.extend(parent, { B: 2 });
		expect(Enum.keys(child)).toEqual(['A', 'B']);
		expect(Enum.values(child)).toEqual([1, 2]);
		expect(Enum.entries(child)).toEqual([['A', 1], ['B', 2]]);
		expect(Enum.invert(child)).toEqual({ 1: 'A', 2: 'B' });
		Object.assign(unwrap(parent), { A: 3, C: 4 });
		expect(Enum.keys(child)).toEqual(['A', 'C', 'B']);
		expect(Enum.values(child)).toEqual([3, 4, 2]);
		expect(Enum.entries(child)).toEqual([['A', 3], ['C', 4], ['B', 2]]);
		expect(Enum.invert(child)).toEqual({ 3: 'A', 4: 'C', 2: 'B' });
	});

	it('merges into an independent readonly snapshot of a live enum', () => {
		const source = Enum.from({ A: 1 }, false);
		const result = Enum.merge(source, { B: 2 });
		Object.assign(unwrap(source), { A: 9, C: 3 });
		expect(Enum.entries(result)).toEqual([['A', 1], ['B', 2]]);
		expect(() => Reflect.set(result, 'A', 5)).toThrow(TypeError);
	});
	it('preserves accessors and hidden symbol descriptors without evaluating getters', () => {
		const getter = vi.fn(() => 42);
		const key = Symbol('metadata');
		const source = Object.defineProperties({}, {
			answer: { get: getter, enumerable: true, configurable: true },
			[key]: { value: 'hidden', enumerable: false, configurable: true },
		});
		const result = Enum.from(source, false);
		expect(getter).not.toHaveBeenCalled();
		expect(Object.getOwnPropertyDescriptor(unwrap(result), 'answer')?.get).toBe(getter);
		expect(Object.getOwnPropertyDescriptor(unwrap(result), key)).toEqual(Object.getOwnPropertyDescriptor(source, key));
		expect(Reflect.get(result, 'answer')).toBe(42);
	});

	it('keeps a non-frozen enum proxy readonly while allowing raw target updates', () => {
		const result = Enum.from({ A: 1 }, false);
		const target = unwrap(result);
		expect(Object.isFrozen(target)).toBe(false);
		expect(() => Reflect.set(result, 'A', 2)).toThrow(TypeError);
		Reflect.set(target, 'A', 3);
		expect(result.A).toBe(3);
	});

	it('defines array members as enumerable immutable numeric values', () => {
		const result = Enum.from(['First', 'Second'] as const);
		expect(Enum.entries(result)).toEqual([['First', 0], ['Second', 1]]);
		expect(Object.getOwnPropertyDescriptor(unwrap(result), 'First')).toEqual({
			value: 0, enumerable: true, writable: false, configurable: false,
		});
	});
});

describe('Enum (Static Reflection & v5 Architecture)', () => {
	it('should enumerate keys, values, and entries across prototypal extension via Enum.*', () => {
		const BASE = Enum.from({ A: 1, B: 2 });
		const EXTENDED = Enum.extend(BASE, { C: 3 });

		expect(Enum.keys(EXTENDED)).toEqual(['A', 'B', 'C']);
		expect(Enum.values(EXTENDED)).toEqual([1, 2, 3]);
		expect(Enum.entries(EXTENDED)).toEqual([['A', 1], ['B', 2], ['C', 3]]);
		expect(Enum.count(EXTENDED)).toBe(3);
	});

	it('should correctly handle JSON.stringify() for extended enums', () => {
		const BASE = Enum.from({ A: 1, B: 2 });
		const EXTENDED = Enum.extend(BASE, { C: 3 });

		const json = JSON.parse(JSON.stringify(EXTENDED));
		expect(json).toEqual({ A: 1, B: 2, C: 3 });
	});

	it('should distinguish own vs inherited properties via Enum.hasOwn() and Enum.has()', () => {
		const BASE = Enum.from({ A: 1, B: 2 });
		const EXTENDED = Enum.extend(BASE, { C: 3 });

		expect(Enum.has(EXTENDED, 'A')).toBe(true);
		expect(Enum.hasOwn(EXTENDED, 'A')).toBe(false);
		expect(Enum.has(EXTENDED, 'C')).toBe(true);
		expect(Enum.hasOwn(EXTENDED, 'C')).toBe(true);
	});

	it('should handle multiple levels of extension', () => {
		const BASE = Enum.from({ A: 1 });
		const MID = Enum.extend(BASE, { B: 2 });
		const TOP = Enum.extend(MID, { C: 3 });

		expect(Enum.keys(TOP)).toEqual(['A', 'B', 'C']);
		expect(Enum.count(TOP)).toBe(3);
		expect(JSON.parse(JSON.stringify(TOP))).toEqual({ A: 1, B: 2, C: 3 });
	});

	it('should allow shadowing of inherited keys', () => {
		const BASE = Enum.from({ A: 1, B: 2 });
		const EXTENDED = Enum.extend(BASE, { B: 20, C: 3 });

		expect(Enum.keys(EXTENDED)).toEqual(['A', 'B', 'C']);
		expect(EXTENDED.B).toBe(20);
		expect(Enum.values(EXTENDED)).toEqual([1, 20, 3]);
	});

	it('should support Symbol keys in enums via Enum.*', () => {
		const sym = Symbol('test');
		const MyEnum = Enum.from({
			[sym]: 'symbol-value',
			standard: 'string-value'
		});

		expect(Enum.keys(MyEnum)).toContain(sym);
		expect(Enum.has(MyEnum, sym)).toBe(true);
		expect(Enum.entries(MyEnum).find(([key]) => key === sym)).toBeDefined();
	});

	it('should safely retrieve values via Enum.get() without prototype or method bleed', () => {
		const MyEnum = Enum.from({ A: 1, Zero: 0, False: false, Empty: '', Undef: undefined, Null: null });
		expect(Enum.get(MyEnum, 'A')).toBe(1);
		expect(Enum.get(MyEnum, 'Zero')).toBe(0);
		expect(Enum.get(MyEnum, 'False')).toBe(false);
		expect(Enum.get(MyEnum, 'Empty')).toBe('');
		expect(Enum.get(MyEnum, 'Undef')).toBeUndefined();
		expect(Enum.has(MyEnum, 'Undef')).toBe(true);

		// Non-existent keys
		expect(Enum.get(MyEnum, 'NonExistent')).toBeUndefined();
		expect(Enum.has(MyEnum, 'NonExistent')).toBe(false);

		// Prototype and method bleed protection
		expect(Enum.get(MyEnum, 'has')).toBeUndefined();
		expect(Enum.get(MyEnum, 'get')).toBeUndefined();
		expect(Enum.get(MyEnum, 'keys')).toBeUndefined();
		expect(Enum.get(MyEnum, 'toString')).toBeUndefined();
		expect(Enum.get(MyEnum, 'valueOf')).toBeUndefined();
	});

	it('should support Enum.get() on extended enums across prototype chain', () => {
		const BASE = Enum.from({ A: 1, B: 2 });
		const EXTENDED = Enum.extend(BASE, { C: 3 });

		expect(Enum.get(EXTENDED, 'A')).toBe(1);
		expect(Enum.get(EXTENDED, 'B')).toBe(2);
		expect(Enum.get(EXTENDED, 'C')).toBe(3);
		expect(Enum.get(EXTENDED, 'D')).toBeUndefined();
		expect(Enum.get(EXTENDED, 'has')).toBeUndefined();
	});

	it('should throw TypeError on duplicate keys in array definitions', () => {
		expect(() => enumify(['A', 'B', 'A'])).toThrow(TypeError);
		expect(() => enumify(['A', 'B', 'A'])).toThrow(/duplicate member key "A"/);
	});

	it('should throw TypeError on numeric keys in array definitions', () => {
		expect(() => enumify(['123'])).toThrow(TypeError);
		expect(() => enumify(['123'])).toThrow(/numeric keys are not supported/);
	});

	it('should support aliased enums in Enum.invert() with last-key-wins', () => {
		const Aliased = Enum.from({ Primary: 100, Secondary: 100, Other: 200 });
		const inverted = Enum.invert(Aliased);
		expect(inverted['200']).toBe('Other');
		expect(inverted['100']).toBeDefined();
		expect(['Primary', 'Secondary']).toContain(inverted['100']);
	});

	it('should support Symbol.hasInstance check', () => {
		const Status = Enum.from(['Active', 'Inactive']);
		expect(Status instanceof (Enum as any)).toBe(true);
		expect({} instanceof (Enum as any)).toBe(false);
	});

	it('should cleanly support enums with colliding member names (has, get, keys, values, hasOwn)', () => {
		const HttpVerbs = Enum.from(['get', 'post', 'has', 'keys', 'values', 'hasOwn']);

		// Member property values are preserved
		expect(HttpVerbs.get).toBe(0);
		expect(HttpVerbs.post).toBe(1);
		expect(HttpVerbs.has).toBe(2);
		expect(HttpVerbs.keys).toBe(3);
		expect(HttpVerbs.values).toBe(4);
		expect(HttpVerbs.hasOwn).toBe(5);

		// Static helpers remain 100% collision-free
		expect(Enum.has(HttpVerbs, 'get')).toBe(true);
		expect(Enum.has(HttpVerbs, 'has')).toBe(true);
		expect(Enum.has(HttpVerbs, 'hasOwn')).toBe(true);
		expect(Enum.has(HttpVerbs, 'missing')).toBe(false);

		expect(Enum.get(HttpVerbs, 'get')).toBe(0);
		expect(Enum.get(HttpVerbs, 'has')).toBe(2);
		expect(Enum.get(HttpVerbs, 'keys')).toBe(3);

		expect(Enum.keys(HttpVerbs)).toEqual(['get', 'post', 'has', 'keys', 'values', 'hasOwn']);
		expect(Enum.values(HttpVerbs)).toEqual([0, 1, 2, 3, 4, 5]);
		expect(Enum.count(HttpVerbs)).toBe(6);
		expect(Enum.includes(HttpVerbs, 2)).toBe(true);
		expect(Enum.keyOf(HttpVerbs, 2)).toBe('has');
	});
});

describe('Prototype Method Cleanliness (v5.0.0 Architecture)', () => {
	it('should confirm prototype methods are removed from enum instances', () => {
		const BASE = Enum.from({ A: 1, B: 2 });
		const EXTENDED = Enum.extend(BASE, { C: 3 });

		// Prototype methods are no longer attached to instances
		expect((BASE as any).keys).toBeUndefined();
		expect((BASE as any).values).toBeUndefined();
		expect((BASE as any).entries).toBeUndefined();
		expect((BASE as any).has).toBeUndefined();
		expect((BASE as any).get).toBeUndefined();
		expect((BASE as any).extend).toBeUndefined();
		expect((BASE as any).derive).toBeUndefined();
		expect((BASE as any).count).toBeUndefined();
		expect((BASE as any).invert).toBeUndefined();

		expect((EXTENDED as any).keys).toBeUndefined();
		expect((EXTENDED as any).values).toBeUndefined();
		expect((EXTENDED as any).entries).toBeUndefined();
		expect((EXTENDED as any).has).toBeUndefined();
		expect((EXTENDED as any).get).toBeUndefined();
		expect((EXTENDED as any).extend).toBeUndefined();
		expect((EXTENDED as any).derive).toBeUndefined();
		expect((EXTENDED as any).count).toBeUndefined();
		expect((EXTENDED as any).invert).toBeUndefined();

		// All operations must be performed via static Enum.* helpers
		expect(Enum.keys(EXTENDED)).toEqual(['A', 'B', 'C']);
		expect(Enum.values(EXTENDED)).toEqual([1, 2, 3]);
		expect(Enum.entries(EXTENDED)).toEqual([['A', 1], ['B', 2], ['C', 3]]);
		expect(Enum.count(EXTENDED)).toBe(3);
		expect(Enum.has(EXTENDED, 'A')).toBe(true);
		expect(Enum.has(EXTENDED, 'C')).toBe(true);
		expect(Enum.get(EXTENDED, 'A')).toBe(1);
		expect(Enum.get(EXTENDED, 'C')).toBe(3);
		expect(Enum.get(EXTENDED, 'D')).toBeUndefined();
		expect(Enum.invert(EXTENDED)).toEqual({ '1': 'A', '2': 'B', '3': 'C' });
	});

	it('should support Enum.extend with a plain object base retaining base members', () => {
		const plainBase = { Alpha: 10, Beta: 20 };
		const derived = Enum.extend(plainBase, { Gamma: 30 });

		expect(derived.Alpha).toBe(10);
		expect(derived.Beta).toBe(20);
		expect(derived.Gamma).toBe(30);
		expect(Enum.keys(derived)).toEqual(['Alpha', 'Beta', 'Gamma']);
		expect(Enum.values(derived)).toEqual([10, 20, 30]);
		expect(Enum.has(derived, 'Alpha')).toBe(true);
		expect(Enum.has(derived, 'Gamma')).toBe(true);
		expect(Enum.has(derived, 'Delta')).toBe(false);
	});

	it('should convert spoofed Enumify tag objects through enumify preserving iteration', () => {
		const spoofed = {
			[Symbol.toStringTag]: 'Enumify',
			Alpha: 10,
		};
		const derived = Enum.extend(spoofed, { Beta: 20 });
		expect(derived.Alpha).toBe(10);
		expect(derived.Beta).toBe(20);
		expect(Enum.keys(derived)).toEqual(['Alpha', Symbol.toStringTag, 'Beta']);
		expect(Enum.entries(derived)).toEqual([['Alpha', 10], [Symbol.toStringTag, 'Enumify'], ['Beta', 20]]);
		expect([...derived]).toEqual(Enum.entries(derived));
		expect(derived instanceof Enum).toBe(true);
		expect(spoofed instanceof Enum).toBe(false);
		expect(Enum.isEnum(derived)).toBe(true);
		expect(Enum.isEnum(spoofed)).toBe(false);
		expect(isEnum(derived)).toBe(true);
		expect(isEnum(spoofed)).toBe(false);
		expect(Enum.isEnum({})).toBe(false);
		expect(Enum.isEnum(null)).toBe(false);
		expect(Enum.isEnum('string')).toBe(false);
	});

	it('should support enumify across Module caller contexts without prototype leakage', () => {
		const invalidModuleContext = Object.create(null, {
			[Symbol.toStringTag]: { value: 'Module' },
			has: { value: () => true }
		});

		const result = enumify.call(invalidModuleContext, { A: 1, B: 2 });

		expect(result.A).toBe(1);
		expect(result.B).toBe(2);
		expect((result as any).keys).toBeUndefined();
		expect((result as any).values).toBeUndefined();
		expect((result as any).has).toBeUndefined();
		expect(Enum.keys(result)).toEqual(['A', 'B']);
		expect(Enum.values(result)).toEqual([1, 2]);
		expect(Enum.has(result, 'A')).toBe(true);
		expect(Enum.count(result)).toBe(2);
		expect(Object.getPrototypeOf(result)).not.toBe(invalidModuleContext);
	});

	it('should not cache member lists if any prototype level in the chain is not frozen', () => {
		const base = { A: 1 };
		const derived = Object.freeze(Object.create(base, {
			B: { value: 2, enumerable: true }
		}));

		expect(Enum.keys(derived)).toEqual(['A', 'B']);
		(base as any).C = 3;
		expect(Enum.keys(derived)).toEqual(['A', 'C', 'B']);
	});

	it('should merge multiple enums and plain objects left-to-right via Enum.merge', () => {
		const FIRST = Enum.extend(Enum.from({ A: 1, B: 2 }), { C: 3 });
		const SECOND = Enum.from({ B: 20, D: 4 });
		const MERGED = Enum.merge(FIRST, SECOND, { E: 5 });

		expect(Enum.isEnum(MERGED)).toBe(true);
		expect(() => { (MERGED as any).A = 999; }).toThrow(TypeError);
		expect(Enum.entries(MERGED)).toEqual([
			['A', 1],
			['B', 20],
			['C', 3],
			['D', 4],
			['E', 5],
		]);
		expect(Enum.hasOwn(MERGED, 'A')).toBe(true);
		expect(Enum.hasOwn(MERGED, 'C')).toBe(true);

		const ARR_MERGED = Enum.merge(['Alpha', 'Beta'] as const);
		expect(ARR_MERGED.Alpha).toBe(0);
		expect(ARR_MERGED.Beta).toBe(1);

		const dynamicSources: { A: number }[] = [{ A: 1 }];
		const LIST_MERGED = Enum.merge(...dynamicSources);
		expect(LIST_MERGED.A).toBe(1);

		const sparse = new Array<string>(2);
		sparse[1] = 'Ready';
		const SPARSE_MERGED = Enum.merge(sparse as any);
		expect(Enum.entries(SPARSE_MERGED)).toEqual([['Ready', 1]]);

		const LENGTH_MERGED = Enum.merge(['length'] as const, {});
		expect(Enum.entries(LENGTH_MERGED)).toEqual([['length', 0]]);
		expect(LENGTH_MERGED.length).toBe(0);

		const emptyDynamic: { A: string }[] = [];
		const DYNAMIC_TAIL = Enum.merge({ A: 42 }, ...emptyDynamic);
		const checkUnion: number | string = DYNAMIC_TAIL.A;
		expect(checkUnion).toBe(42);

		const undefDynamic: { A: string | undefined }[] = [{ A: undefined }];
		const UNDEF_TAIL = Enum.merge({ A: 42 }, ...undefDynamic);
		const checkUndefUnion: number | string | undefined = UNDEF_TAIL.A;
		expect(checkUndefUnion).toBeUndefined();
	});
});
