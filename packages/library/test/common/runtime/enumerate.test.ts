import { enumify, Enum } from '#library/enumerate.library.js';

describe('Enum (Static Reflection & v5 Architecture)', () => {
	it('should enumerate keys, values, and entries across prototypal extension via Enum.*', () => {
		const BASE = enumify({ A: 1, B: 2 });
		const EXTENDED = Enum.extend(BASE, { C: 3 });

		expect(Enum.keys(EXTENDED)).toEqual(['A', 'B', 'C']);
		expect(Enum.values(EXTENDED)).toEqual([1, 2, 3]);
		expect(Enum.entries(EXTENDED)).toEqual([['A', 1], ['B', 2], ['C', 3]]);
		expect(Enum.count(EXTENDED)).toBe(3);
	});

	it('should correctly handle JSON.stringify() for extended enums', () => {
		const BASE = enumify({ A: 1, B: 2 });
		const EXTENDED = Enum.extend(BASE, { C: 3 });

		const json = JSON.parse(JSON.stringify(EXTENDED));
		expect(json).toEqual({ A: 1, B: 2, C: 3 });
	});

	it('should distinguish own vs inherited properties via Enum.hasOwn() and Enum.has()', () => {
		const BASE = enumify({ A: 1, B: 2 });
		const EXTENDED = Enum.extend(BASE, { C: 3 });

		expect(Enum.has(EXTENDED, 'A')).toBe(true);
		expect(Enum.hasOwn(EXTENDED, 'A')).toBe(false);
		expect(Enum.has(EXTENDED, 'C')).toBe(true);
		expect(Enum.hasOwn(EXTENDED, 'C')).toBe(true);
	});

	it('should handle multiple levels of extension', () => {
		const BASE = enumify({ A: 1 });
		const MID = Enum.extend(BASE, { B: 2 });
		const TOP = Enum.extend(MID, { C: 3 });

		expect(Enum.keys(TOP)).toEqual(['A', 'B', 'C']);
		expect(Enum.count(TOP)).toBe(3);
		expect(JSON.parse(JSON.stringify(TOP))).toEqual({ A: 1, B: 2, C: 3 });
	});

	it('should allow shadowing of inherited keys', () => {
		const BASE = enumify({ A: 1, B: 2 });
		const EXTENDED = Enum.extend(BASE, { B: 20, C: 3 });

		expect(Enum.keys(EXTENDED)).toEqual(['A', 'B', 'C']);
		expect(EXTENDED.B).toBe(20);
		expect(Enum.values(EXTENDED)).toEqual([1, 20, 3]);
	});

	it('should support Symbol keys in enums via Enum.*', () => {
		const sym = Symbol('test');
		const MyEnum = enumify({
			[sym]: 'symbol-value',
			standard: 'string-value'
		});

		expect(Enum.keys(MyEnum)).toContain(sym);
		expect(Enum.has(MyEnum, sym)).toBe(true);
		expect(Enum.entries(MyEnum).find(([key]) => key === sym)).toBeDefined();
	});

	it('should safely retrieve values via Enum.get() without prototype or method bleed', () => {
		const MyEnum = enumify({ A: 1, Zero: 0, False: false, Empty: '', Undef: undefined, Null: null });
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
		const BASE = enumify({ A: 1, B: 2 });
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
		const Aliased = enumify({ Primary: 100, Secondary: 100, Other: 200 });
		const inverted = Enum.invert(Aliased);
		expect(inverted['200']).toBe('Other');
		expect(inverted['100']).toBeDefined();
		expect(['Primary', 'Secondary']).toContain(inverted['100']);
	});

	it('should support Symbol.hasInstance check', () => {
		const Status = enumify(['Active', 'Inactive']);
		expect(Status instanceof (Enum as any)).toBe(true);
		expect({} instanceof (Enum as any)).toBe(false);
	});

	it('should cleanly support enums with colliding member names (has, get, keys, values, hasOwn)', () => {
		const HttpVerbs = enumify(['get', 'post', 'has', 'keys', 'values', 'hasOwn']);

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

describe('Legacy v4.x Prototype Methods (Deprecated - To be removed in v5.0.0)', () => {
	it('should support legacy prototype methods on base and extended enums', () => {
		const BASE = enumify({ A: 1, B: 2 });
		const EXTENDED = BASE.extend({ C: 3 });

		expect(EXTENDED.keys()).toEqual(['A', 'B', 'C']);
		expect(EXTENDED.values()).toEqual([1, 2, 3]);
		expect(EXTENDED.entries()).toEqual([['A', 1], ['B', 2], ['C', 3]]);
		expect(EXTENDED.count()).toBe(3);
		expect(EXTENDED.has('A')).toBe(true);
		expect(EXTENDED.has('C')).toBe(true);
		expect(EXTENDED.get('A')).toBe(1);
		expect(EXTENDED.get('C')).toBe(3);
		expect(EXTENDED.get('D')).toBeUndefined();
		expect(EXTENDED.invert()).toEqual({ '1': 'A', '2': 'B', '3': 'C' });
		expect(typeof EXTENDED.extend).toBe('function');
	});

	it('should support legacy prototype methods with caller-context branching', () => {
		const invalidModuleContext = Object.create(null, {
			[Symbol.toStringTag]: { value: 'Module' },
			has: { value: () => true }
		});

		const result = enumify.call(invalidModuleContext, { A: 1, B: 2 });

		expect(result.A).toBe(1);
		expect(result.B).toBe(2);
		expect(result.keys()).toEqual(['A', 'B']);
		expect(result.values()).toEqual([1, 2]);
		expect(result.has('A')).toBe(true);
		expect(result.count()).toBe(2);
		expect(Object.getPrototypeOf(result)).not.toBe(invalidModuleContext);
	});
});
