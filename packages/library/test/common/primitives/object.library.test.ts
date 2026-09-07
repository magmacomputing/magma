import { asObject, ifDefined, deepMerge, unQuoteObj, countProperties, pick, pluck, extend } from '#library/object.library.js';

describe('Object Library', () => {
	describe('asObject', () => {
		it('should clone plain objects recursively', () => {
			const original = { a: 1, b: { c: 2 } };
			const cloned = asObject(original);
			expect(cloned).toEqual(original);
			expect(cloned).not.toBe(original);
			expect((cloned as any).b).not.toBe(original.b);
		});

		it('should exclude dangerous prototype keys (__proto__, constructor, prototype)', () => {
			const payload = JSON.parse('{"a": 1, "__proto__": {"polluted": true}, "constructor": {"polluted": true}, "prototype": {"polluted": true}}');
			const copy = asObject(payload);
			expect((copy as any).a).toBe(1);
			expect(Object.prototype.hasOwnProperty.call(copy ?? {}, '__proto__')).toBe(false);
			expect((copy as any)?.polluted).toBeUndefined();
			expect(({} as any).polluted).toBeUndefined();
		});

		it('should return primitives and nullish values as-is', () => {
			expect(asObject(null as any)).toBe(null);
			expect(asObject(undefined as any)).toBe(undefined);
			expect(asObject(42 as any)).toBe(42);
			expect(asObject('test' as any)).toBe('test');
		});
	});

	describe('ifDefined', () => {
		it('should omit undefined and nullish properties', () => {
			const input = { a: 1, b: undefined, c: null, d: false };
			const result = ifDefined(input);
			expect(result).toEqual({ a: 1, d: false });
		});

		it('should exclude dangerous prototype keys', () => {
			const payload = JSON.parse('{"valid": 10, "__proto__": {"polluted": true}, "constructor": {"evil": true}}');
			const result = ifDefined(payload);
			expect(result.valid).toBe(10);
			expect(Object.prototype.hasOwnProperty.call(result ?? {}, '__proto__')).toBe(false);
			expect((result as any)?.polluted).toBeUndefined();
			expect(({} as any).polluted).toBeUndefined();
		});
	});

	describe('deepMerge', () => {
		it('should merge nested objects cleanly', () => {
			const res = deepMerge<any>({ a: { x: 1 } }, { a: { y: 2 } }, { b: 3 });
			expect(res).toEqual({ a: { x: 1, y: 2 }, b: 3 });
		});

		it('should guard against prototype pollution', () => {
			const payload = JSON.parse('{"__proto__": {"admin": true}}');
			const merged = deepMerge({}, payload);
			expect(({} as any).admin).toBeUndefined();
			expect((merged as any).admin).toBeUndefined();
		});
	});

	describe('unQuoteObj', () => {
		it('should format object keys without quotes', () => {
			expect(unQuoteObj({ a: 1 })).toBe('{a: 1}');
		});
	});

	describe('countProperties', () => {
		it('should return number of own properties', () => {
			expect(countProperties({ a: 1, b: 2, c: 3 })).toBe(3);
		});
	});

	describe('pick', () => {
		it('should pick specified keys', () => {
			expect(pick({ a: 1, b: 2, c: 3 }, 'a', 'c')).toEqual({ a: 1, c: 3 });
		});
	});

	describe('pluck', () => {
		it('should pluck key from array of objects', () => {
			expect(pluck([{ id: 1 }, { id: 2 }], 'id')).toEqual([1, 2]);
		});
	});

	describe('extend', () => {
		it('should extend target object', () => {
			expect(extend({ a: 1 }, { b: 2 })).toEqual({ a: 1, b: 2 });
		});
	});
});
