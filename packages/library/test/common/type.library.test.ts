import type { Singular, AssertEqual } from '#library/type.library.js';

describe('Type Library (Compile-Time)', () => {
	it('should correctly resolve Singular types at compile-time', () => {
		const testCats: AssertEqual<Singular<'cats'>, 'cat'> = true;
		const testBus: AssertEqual<Singular<'bus'>, 'bus'> = true;
		const testS: AssertEqual<Singular<'s'>, 's'> = true;

		expect(testCats).toBe(true);
		expect(testBus).toBe(true);
		expect(testS).toBe(true);
	});
});
