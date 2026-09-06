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
 *   3. Global Tempo.use() still works after the same plugin was installed in a sandbox
 *   4. A sandbox skips re-installing a globally-installed plugin (ScopedSet.has() finds it in parent)
 */
describe('Sandbox Plugin Isolation (ScopedSet)', () => {

	beforeEach(() => {
		Tempo.init();
	});

	it('sandbox state carries a ScopedSet for its installed tracker', () => {
		const X = Tempo.create({});
		const state = (X as any)[$Internal]();
		expect(state.installed.constructor.name).toBe('ScopedSet');
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

		Tempo.use([plugin]);
		expect(calls).toBe(2);			// global must also install it — NOT skipped
	});

	it('sandbox sees globally-installed plugins via ScopedSet parent chain and skips re-install', () => {
		let calls = 0;
		const plugin = (_T: any) => { calls++; };

		Tempo.use([plugin]);
		expect(calls).toBe(1);			// global installed it

		const X = Tempo.create({});
		X.extend([plugin]);
		expect(calls).toBe(1);			// ScopedSet.has() found it in parent → skipped ✓
	});

	it('globally-registered plugin is visible on the sandbox class (prototype inheritance)', () => {
		const globalPlugin = (T: any) => { (T as any).fromGlobal = 42; };
		Tempo.use([globalPlugin]);

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

	it('disposes sandbox cleanly and clears discovery slot and state', () => {
		const discoveryKey = 'test-disposable-sandbox';
		const X = Tempo.create({ discovery: discoveryKey });
		const slot = Symbol.for(discoveryKey);

		expect((globalThis as any)[slot]).toBeDefined();
		expect((X as any).isDisposed).toBe(false);

		// Dispose sandbox
		(X as any)[Symbol.dispose]();

		expect((X as any).isDisposed).toBe(true);
		expect((globalThis as any)[slot]).toBeUndefined();

		// Idempotent dispose
		expect(() => (X as any)[Symbol.dispose]()).not.toThrow();
	});

	it('preserves newer sandbox data when multiple sandboxes share the same Symbol.for discovery key', () => {
		const sharedKey = 'shared-discovery-key';
		const slot = Symbol.for(sharedKey);

		// Sandbox 1 created
		const sb1 = Tempo.create({ discovery: sharedKey, timeZone: 'Pacific/Auckland' });
		const data1 = (globalThis as any)[slot];
		expect(data1).toBeDefined();

		// Sandbox 2 created with same shared key, replacing slot
		const sb2 = Tempo.create({ discovery: sharedKey, timeZone: 'Asia/Tokyo' });
		const data2 = (globalThis as any)[slot];
		expect(data2).toBeDefined();
		expect(data2).not.toBe(data1);

		// Dispose Sandbox 1
		(sb1 as any)[Symbol.dispose]();
		expect((sb1 as any).isDisposed).toBe(true);

		// Sandbox 2 data should still be intact in globalThis[slot]
		expect((globalThis as any)[slot]).toBe(data2);

		// Dispose Sandbox 2
		(sb2 as any)[Symbol.dispose]();
		expect((sb2 as any).isDisposed).toBe(true);
		expect((globalThis as any)[slot]).toBeUndefined();
	});

	it('Tempo.create with callback executes synchronous block and automatically disposes sandbox', () => {
		const discoveryKey = 'test-auto-sandbox-sync';
		const slot = Symbol.for(discoveryKey);
		let leakedSandbox: any = null;

		const result = Tempo.create({ discovery: discoveryKey }, (sb) => {
			leakedSandbox = sb;
			expect((globalThis as any)[slot]).toBeDefined();
			expect((sb as any).isDisposed).toBe(false);
			return 'sync-done';
		});

		expect(result).toBe('sync-done');
		expect((leakedSandbox as any).isDisposed).toBe(true);
		expect((globalThis as any)[slot]).toBeUndefined();
	});

	it('Tempo.create with callback handles default options when only callback is passed', () => {
		let leakedSandbox: any = null;
		const result = Tempo.create((sb) => {
			leakedSandbox = sb;
			expect((sb as any).isDisposed).toBe(false);
			return 42;
		});

		expect(result).toBe(42);
		expect((leakedSandbox as any).isDisposed).toBe(true);
	});

	it('Tempo.create with callback handles async block and disposes sandbox after settlement', async () => {
		const discoveryKey = 'test-auto-sandbox-async';
		const slot = Symbol.for(discoveryKey);
		let leakedSandbox: any = null;

		const result = await Tempo.create({ discovery: discoveryKey }, async (sb) => {
			leakedSandbox = sb;
			await new Promise(resolve => setTimeout(resolve, 10));
			expect((globalThis as any)[slot]).toBeDefined();
			return 'async-done';
		});

		expect(result).toBe('async-done');
		expect((leakedSandbox as any).isDisposed).toBe(true);
		expect((globalThis as any)[slot]).toBeUndefined();
	});

	it('Tempo.create with callback disposes sandbox even if callback throws', () => {
		const discoveryKey = 'test-auto-sandbox-err';
		const slot = Symbol.for(discoveryKey);
		let leakedSandbox: any = null;

		expect(() => {
			Tempo.create({ discovery: discoveryKey }, (sb) => {
				leakedSandbox = sb;
				throw new Error('Sandbox error');
			});
		}).toThrow('Sandbox error');

		expect((leakedSandbox as any).isDisposed).toBe(true);
		expect((globalThis as any)[slot]).toBeUndefined();
	});

	it('Tempo.create supports native using keyword for block-scoped disposal', () => {
		const discoveryKey = 'test-using-sandbox';
		const slot = Symbol.for(discoveryKey);
		let leakedSandbox: any = null;

		{
			using sb = Tempo.create({ discovery: discoveryKey });
			leakedSandbox = sb;
			expect((globalThis as any)[slot]).toBeDefined();
			expect((sb as any).isDisposed).toBe(false);
		}

		expect((leakedSandbox as any).isDisposed).toBe(true);
		expect((globalThis as any)[slot]).toBeUndefined();
	});
});

