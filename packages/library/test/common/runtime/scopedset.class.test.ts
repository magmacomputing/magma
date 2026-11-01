import { ScopedSet, isScopedSet } from '#library/scopedset.class.js';

describe('common/runtime/scopedset.class', () => {
	it('identifies as an authentic ScopedSet via @Branded', () => {
		const parent = new Set(['a', 'b']);
		const scoped = new ScopedSet(parent);

		expect(scoped.isScopedSet).toBe(true);
		expect(ScopedSet.isScopedSet(scoped)).toBe(true);
		expect(isScopedSet(scoped)).toBe(true);
		expect(scoped instanceof ScopedSet).toBe(true);
		expect(Object.prototype.toString.call(scoped)).toBe('[object ScopedSet]');

		const spoofed = { [Symbol.toStringTag]: 'ScopedSet' };
		expect(ScopedSet.isScopedSet(spoofed)).toBe(false);
		expect(isScopedSet(spoofed)).toBe(false);
		expect(spoofed instanceof ScopedSet).toBe(false);
	});

	it('delegates has to parent but keeps add/delete local', () => {
		const parent = new Set(['x', 'y']);
		const scoped = new ScopedSet(parent);

		expect(scoped.has('x')).toBe(true);
		expect(scoped.has('z')).toBe(false);

		scoped.add('z');
		expect(scoped.has('z')).toBe(true);
		expect(parent.has('z')).toBe(false);
		expect(scoped.size).toBe(1);

		expect(scoped.delete('z')).toBe(true);
		expect(scoped.has('z')).toBe(false);
		expect(scoped.has('x')).toBe(true);
	});
});
