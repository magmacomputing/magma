import type { Singular, CountOf, AssertEqual } from '#library/type.library.js';

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
