import { hasOwn, isObject, isReference, isPrimitive } from '../../src/support/index.js';

describe('Assert & Type Helpers (@magmacomputing/tempo-fns/support)', () => {
	describe('hasOwn', () => {
		it('returns true for own properties', () => {
			const obj = { foo: 'bar', answer: 42 };
			expect(hasOwn(obj, 'foo')).toBe(true);
			expect(hasOwn(obj, 'answer')).toBe(true);
		});

		it('returns false for inherited or prototype properties', () => {
			const obj = { foo: 'bar' };
			expect(hasOwn(obj, 'toString')).toBe(false);
			expect(hasOwn(obj, 'valueOf')).toBe(false);
			expect(hasOwn(obj, '__proto__')).toBe(false);
		});

		it('returns false for non-existent properties', () => {
			const obj = { foo: 'bar' };
			expect(hasOwn(obj, 'baz')).toBe(false);
		});

		it('safely returns false for null, undefined, and primitives', () => {
			expect(hasOwn(null, 'foo')).toBe(false);
			expect(hasOwn(undefined, 'foo')).toBe(false);
			expect(hasOwn(42, 'toFixed')).toBe(false);
			expect(hasOwn('string', 'length')).toBe(false);
			expect(hasOwn(true, 'valueOf')).toBe(false);
		});

		it('works with symbols', () => {
			const sym = Symbol('test');
			const obj = { [sym]: 123 };
			expect(hasOwn(obj, sym)).toBe(true);
			expect(hasOwn(obj, Symbol('other'))).toBe(false);
		});
	});
});
