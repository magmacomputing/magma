import { Tempo } from '#tempo';
import { getRuntime } from '#tempo/support/support.runtime.js';
import { $Internal } from '#tempo/support';
import { ScopedSet } from '#library/scopedset.class.js';

/**
 * Sandbox Plugin Isolation (ScopedSet)
 *
 * Validates that plugins extended into a sandboxed Tempo class (via Tempo.create())
 * are isolated from the global scope via a `ScopedSet` whose `has()` delegates
 * to the global `rt.installed`, but whose `add()` writes only to own-local storage.
 *
 * Key invariants:
 *   1. A globally-registered plugin IS visible to sandboxes (inherited via ScopedSet parent chain)
 *   2. A sandbox-registered plugin does NOT bleed into the global rt.installed
 *   3. Global Tempo.extend() still works after the same plugin was installed in a sandbox
 *   4. A sandbox skips re-installing a globally-installed plugin (ScopedSet.has() finds it in parent)
 */
describe('Sandbox Plugin Isolation (ScopedSet)', () => {

	beforeEach(() => {
		Tempo.init();
	});

	it('sandbox state carries a ScopedSet for its installed tracker', () => {
		const X = Tempo.create({});
		const state = (X as any)[$Internal]();
		expect(state.installed).toBeInstanceOf(ScopedSet);
	});

	it('global state has no scoped installed tracker (falls back to rt.installed)', () => {
		const state = (Tempo as any)[$Internal]();
		// Global state leaves installed undefined — extend() falls back to rt.installed
		expect(state.installed).toBeUndefined();
	});

	it('sandbox plugin does NOT bleed into the global rt.installed', () => {
		const sandboxPlugin = (T: any) => { (T as any).sandboxOnly = true; };

		const X = Tempo.create({});
		X.extend([sandboxPlugin]);

		// Global rt.installed should be unaffected
		expect(getRuntime().installed.has(sandboxPlugin)).toBe(false);
		// And the global class should not have the static property
		expect((Tempo as any).sandboxOnly).toBeUndefined();
	});

	it('global extend still fires after the same plugin was installed in a sandbox', () => {
		let calls = 0;
		const plugin = (_T: any) => { calls++; };

		const X = Tempo.create({});
		X.extend([plugin]);
		expect(calls).toBe(1);			// sandbox installed it

		Tempo.extend([plugin]);
		expect(calls).toBe(2);			// global must also install it — NOT skipped
	});

	it('sandbox sees globally-installed plugins via ScopedSet parent chain and skips re-install', () => {
		let calls = 0;
		const plugin = (_T: any) => { calls++; };

		Tempo.extend([plugin]);
		expect(calls).toBe(1);			// global installed it

		const X = Tempo.create({});
		X.extend([plugin]);
		expect(calls).toBe(1);			// ScopedSet.has() found it in parent → skipped ✓
	});

	it('globally-registered plugin is visible on the sandbox class (prototype inheritance)', () => {
		const globalPlugin = (T: any) => { (T as any).fromGlobal = 42; };
		Tempo.extend([globalPlugin]);

		const X = Tempo.create({});
		// The sandbox class extends from Tempo, so static properties attached
		// to Tempo are accessible through the prototype chain on X
		expect((X as any).fromGlobal).toBe(42);
	});

	it('two independent sandboxes are isolated from each other', () => {
		let callsA = 0, callsB = 0;
		const pluginA = (_T: any) => { callsA++; };
		const pluginB = (_T: any) => { callsB++; };

		const A = Tempo.create({});
		const B = Tempo.create({});

		A.extend([pluginA]);
		expect(callsA).toBe(1);
		expect(callsB).toBe(0);

		B.extend([pluginB]);
		expect(callsA).toBe(1);
		expect(callsB).toBe(1);

		// Neither plugin should be in the global installed set
		expect(getRuntime().installed.has(pluginA)).toBe(false);
		expect(getRuntime().installed.has(pluginB)).toBe(false);
	});

	it('ScopedSet semantics: has() propagates, add() does not', () => {
		const parent = new Set<string>(['global-plugin']);
		const scoped = new ScopedSet<string>(parent);

		// Inherited from parent
		expect(scoped.has('global-plugin')).toBe(true);

		// Own-local add
		scoped.add('sandbox-plugin');
		expect(scoped.has('sandbox-plugin')).toBe(true);

		// Parent is NOT mutated
		expect(parent.has('sandbox-plugin')).toBe(false);

		// Own-local delete
		scoped.delete('sandbox-plugin');
		expect(scoped.has('sandbox-plugin')).toBe(false);

		// Parent-derived value survives delete (only own is cleared)
		expect(scoped.has('global-plugin')).toBe(true);
	});
});
