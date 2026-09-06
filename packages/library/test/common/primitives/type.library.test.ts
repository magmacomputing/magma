import { protoType, getType, type Singular, type CountOf, type AssertEqual } from '#library/type.library.js';

describe('Type Library (Compile-Time)', () => {
	it('should correctly resolve Singular types at compile-time', () => {
		const testCats: AssertEqual<Singular<'cats'>, 'cat'> = true;
		const testBus: AssertEqual<Singular<'bus'>, 'bus'> = true;
		const testS: AssertEqual<Singular<'s'>, 's'> = true;

		expect(testCats).toBe(true);
		expect(testBus).toBe(true);
		expect(testS).toBe(true);
	});

	it('should correctly resolve CountOf union cardinality and fallbacks', () => {
		const testArray: AssertEqual<CountOf<string[]>, 1> = true;
		const testObject: AssertEqual<CountOf<{ a: 1; b: 2 }>, 1> = true;

		expect(testArray).toBe(true);
		expect(testObject).toBe(true);
	});
});

describe('Type Library (Runtime)', () => {
	it('should correctly determine types of standard values', () => {
		expect(protoType([])).toBe('Array');
		expect(protoType({})).toBe('Object');
		expect(protoType(123)).toBe('Number');
		expect(protoType('hello')).toBe('String');
		expect(protoType(null)).toBe('Null');
		expect(protoType(undefined)).toBe('Undefined');
	});

	it('should safely handle objects with throwing Symbol.toStringTag getters', () => {
		const badObject = {
			get [Symbol.toStringTag]() {
				throw new Error('toStringTag exploded!');
			}
		};
		expect(() => protoType(badObject)).not.toThrow();
		expect(protoType(badObject)).toBe('Object');
		expect(getType(badObject)).toBe('Object');
	});

	it('should safely handle revoked proxies without crashing', () => {
		const { proxy, revoke } = Proxy.revocable({ a: 1 }, {});
		revoke();

		expect(() => protoType(proxy)).not.toThrow();
		expect(protoType(proxy)).toBe('Object');
		expect(getType(proxy)).toBe('Object');
	});

	it('should correctly resolve types with getType() across primitives, classes, and functions', () => {
		expect(getType(true)).toBe('Boolean');
		expect(getType(100n)).toBe('BigInt');
		expect(getType(Symbol('sym'))).toBe('Symbol');
		expect(getType('str')).toBe('String');
		expect(getType(42)).toBe('Number');
		expect(getType(null)).toBe('Null');
		expect(getType(undefined)).toBe('Undefined');
		expect(getType([])).toBe('Array');
		expect(getType({})).toBe('Object');

		class TestModel {}
		expect(getType(TestModel)).toBe('Class');

		const normalFn = () => {};
		expect(getType(normalFn)).toBe('Function');

		const asyncFn = async () => {};
		expect(getType(asyncFn)).toBe('AsyncFunction');

		function* genFn() { yield 1; }
		expect(getType(genFn)).toBe('GeneratorFunction');

		const arrayLike = { 0: 'a', 1: 'b', length: 2 };
		expect(getType(arrayLike)).toBe('ArrayLike');
	});
});
