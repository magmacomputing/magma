import { protoType, getType, cast } from '#library/type.library.js';
import { enumify } from '#library/enumerate.library.js';
import { looseIndex } from '#library/object.library.js';
import type { Singular, CountOf, AssertEqual, Cast, KeyOf, ValueOf, IndexOf, EntryOf } from '#library/type.library.js';

describe('Type Library (Compile-Time)', () => {
	it('should correctly resolve KeyOf, ValueOf, IndexOf, and correlated EntryOf', () => {
		// Plain non-enum objects
		type Plain = { a: 1; b: 'hello' };
		const testPlainKey: AssertEqual<KeyOf<Plain>, 'a' | 'b'> = true;
		const testPlainVal: AssertEqual<ValueOf<Plain>, 1 | 'hello'> = true;
		const testPlainIdx: AssertEqual<IndexOf<Plain>, 1 | 'hello'> = true;
		const testPlainEntry: AssertEqual<EntryOf<Plain>, ['a', 1] | ['b', 'hello']> = true;
		expect(testPlainKey).toBe(true);
		expect(testPlainVal).toBe(true);
		expect(testPlainIdx).toBe(true);
		expect(testPlainEntry).toBe(true);

		// Plain object with function properties (non-enum)
		type WithMethod = { name: string; values: () => number[] };
		const testMethodVal: AssertEqual<ValueOf<WithMethod>, string | (() => number[])> = true;
		const testMethodEntry: AssertEqual<EntryOf<WithMethod>, ['name', string] | ['values', () => number[]]> = true;
		expect(testMethodVal).toBe(true);
		expect(testMethodEntry).toBe(true);

		// Loose enums: unwinding the loose index signature & extracting correlated entry pairs
		const testEnum = looseIndex<string, string>()(enumify({
			North: 'north',
			South: 'south',
		}, false));
		type TestEnum = typeof testEnum;
		const testEnumKey: AssertEqual<KeyOf<TestEnum>, 'North' | 'South'> = true;
		const testEnumVal: AssertEqual<ValueOf<TestEnum>, 'north' | 'south'> = true;
		const testEnumIdx: AssertEqual<IndexOf<TestEnum>, 'north' | 'south'> = true;
		const testEnumEntry: AssertEqual<EntryOf<TestEnum>, ['North', 'north'] | ['South', 'south']> = true;
		expect(testEnumKey).toBe(true);
		expect(testEnumVal).toBe(true);
		expect(testEnumIdx).toBe(true);
		expect(testEnumEntry).toBe(true);
	});

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

	it('should correctly resolve Cast<T, Target> types at compile-time', () => {
		const testValid: AssertEqual<Cast<string, string>, string> = true;
		const testFallback: AssertEqual<Cast<number, string>, string> = true;

		expect(testValid).toBe(true);
		expect(testFallback).toBe(true);
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

	it('should ergonomically cast runtime values using cast<T>()', () => {
		const raw: unknown = 'test-value';
		const casted = cast<string>(raw);
		expect(casted).toBe('test-value');

		const obj: any = { count: 42 };
		const typedObj = cast<{ count: number }>(obj);
		expect(typedObj.count).toBe(42);
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

		class TestModel { }
		expect(getType(TestModel)).toBe('Class');

		const normalFn = () => { };
		expect(getType(normalFn)).toBe('Function');

		const asyncFn = async () => { };
		expect(getType(asyncFn)).toBe('AsyncFunction');

		function* genFn() { yield 1; }
		expect(getType(genFn)).toBe('GeneratorFunction');

		const arrayLike = { 0: 'a', 1: 'b', length: 2 };
		expect(getType(arrayLike)).toBe('ArrayLike');
	});

	it('should return Function for a callable proxy whose get trap throws', () => {
		const throwingCallableProxy = new Proxy(() => { }, {
			get() {
				throw new Error('Hostile get trap error');
			}
		});

		expect(getType(throwingCallableProxy)).toBe('Function');
	});
});

