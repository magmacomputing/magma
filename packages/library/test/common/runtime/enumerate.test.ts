import { enumify } from '#library/enumerate.library.js';

describe('enumify stealth proxy', () => {
  it('should expose all keys from the prototype chain in Object.keys()', () => {
    const BASE = enumify({ A: 1, B: 2 });
    const EXTENDED = BASE.extend({ C: 3 });

    expect(EXTENDED.keys()).toEqual(['A', 'B', 'C']);
  });

  it('should correctly handle JSON.stringify() for extended enums', () => {
    const BASE = enumify({ A: 1, B: 2 });
    const EXTENDED = BASE.extend({ C: 3 });

    const json = JSON.parse(JSON.stringify(EXTENDED));
    expect(json).toEqual({ A: 1, B: 2, C: 3 });
  });

  it('should still support enum methods on extended enums', () => {
    const BASE = enumify({ A: 1, B: 2 });
    const EXTENDED = BASE.extend({ C: 3 });

    expect(EXTENDED.count()).toBe(3);
    expect(EXTENDED.keys()).toEqual(['A', 'B', 'C']);
    expect(EXTENDED.values()).toEqual([1, 2, 3]);
    expect(EXTENDED.has('A')).toBe(true);
    expect(EXTENDED.has('C')).toBe(true);
  });

  it('should handle multiple levels of extension', () => {
    const BASE = enumify({ A: 1 });
    const MID = BASE.extend({ B: 2 });
    const TOP = MID.extend({ C: 3 });

    expect(TOP.keys()).toEqual(['A', 'B', 'C']);
    expect(TOP.count()).toBe(3);
    expect(JSON.parse(JSON.stringify(TOP))).toEqual({ A: 1, B: 2, C: 3 });
  });

  it('should allow shadowing of inherited keys', () => {
    const BASE = enumify({ A: 1, B: 2 });
    const EXTENDED = BASE.extend({ B: 20, C: 3 });

    expect(EXTENDED.keys()).toEqual(['A', 'B', 'C']);
    expect(EXTENDED.B).toBe(20);
    expect(EXTENDED.values()).toEqual([1, 20, 3]);
  });

	it('should support Symbol keys in enums', () => {
		const sym = Symbol('test');
		const MyEnum = enumify({
			[sym]: 'symbol-value',
			standard: 'string-value'
		});

		expect(MyEnum.keys()).toContain(sym);
		expect(MyEnum.has(sym)).toBe(true);
		expect(MyEnum.entries().find(([key]) => key === sym)).toBeDefined();
	});

	it('should safely retrieve values via get() without prototype or method bleed', () => {
		const MyEnum = enumify({ A: 1, Zero: 0, False: false, Empty: '', Undef: undefined, Null: null });
		expect(MyEnum.get('A')).toBe(1);
		expect(MyEnum.get('Zero')).toBe(0);
		expect(MyEnum.get('False')).toBe(false);
		expect(MyEnum.get('Empty')).toBe('');
		expect(MyEnum.get('Undef')).toBeUndefined();
		expect(MyEnum.has('Undef')).toBe(true);

		// Non-existent keys
		expect(MyEnum.get('NonExistent')).toBeUndefined();
		expect(MyEnum.has('NonExistent')).toBe(false);

		// Prototype and method bleed protection
		expect(MyEnum.get('has')).toBeUndefined();
		expect(MyEnum.get('get')).toBeUndefined();
		expect(MyEnum.get('keys')).toBeUndefined();
		expect(MyEnum.get('toString')).toBeUndefined();
		expect(MyEnum.get('valueOf')).toBeUndefined();
	});

	it('should support get() on extended enums across prototype chain', () => {
		const BASE = enumify({ A: 1, B: 2 });
		const EXTENDED = BASE.extend({ C: 3 });

		expect(EXTENDED.get('A')).toBe(1);
		expect(EXTENDED.get('B')).toBe(2);
		expect(EXTENDED.get('C')).toBe(3);
		expect(EXTENDED.get('D')).toBeUndefined();
		expect(EXTENDED.get('has')).toBeUndefined();
	});

	describe('caller-context branching', () => {
		it('should use safe enum prototype when called with invalid Module context', () => {
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

		it('should inherit and expose expected enum methods during normal enum extend flow', () => {
			const BASE = enumify({ A: 1, B: 2 });
			const EXTENDED = BASE.extend({ C: 3 });

			expect(EXTENDED.A).toBe(1);
			expect(EXTENDED.B).toBe(2);
			expect(EXTENDED.C).toBe(3);
			expect(EXTENDED.keys()).toEqual(['A', 'B', 'C']);
			expect(EXTENDED.values()).toEqual([1, 2, 3]);
			expect(EXTENDED.entries()).toEqual([['A', 1], ['B', 2], ['C', 3]]);
			expect(EXTENDED.has('A')).toBe(true);
			expect(EXTENDED.has('C')).toBe(true);
			expect(EXTENDED.count()).toBe(3);
			expect(EXTENDED.invert()).toEqual({ '1': 'A', '2': 'B', '3': 'C' });
			expect(typeof EXTENDED.extend).toBe('function');
		});
	});
});

