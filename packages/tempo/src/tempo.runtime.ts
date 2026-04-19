import type { TermPlugin, Extension, Plugin } from './plugin/plugin.type.js';

/**
 * The single hardened globalThis bridge symbol for the TempoRuntime singleton.
 * Using a namespaced, versioned key avoids collisions with any other library.
 */
const BRIDGE = Symbol.for('magmacomputing/tempo/runtime');

/**
 * # TempoRuntime
 * Centralized, hardened container for all Tempo inter-module state.
 *
 * Previously, Tempo spread its inter-module state across many `globalThis[Symbol.*]`
 * slots (one per datum: `$terms`, `$extends`, `$modules`, `$installed`, `$reset`,
 * `$Plugins`, `$Register`).  That approach "pollutes the global scope" and makes each
 * slot a possible tamper target.
 *
 * `TempoRuntime` replaces all of those slots with a **single** well-known entry on
 * `globalThis` (the BRIDGE symbol above).  The slot is defined as non-enumerable,
 * non-configurable and non-writable so external code cannot replace or delete the
 * runtime object.  All mutation goes through the controlled methods on this class.
 *
 * ## Multi-bundle / HMR compatibility
 * `getRuntime()` checks `globalThis[BRIDGE]` before creating a new instance.  When
 * two bundle copies of the library are loaded (monorepo, HMR, etc.), both find the
 * same runtime and therefore share the same arrays / sets — the same guarantee that
 * was previously achieved by scattering `Symbol.for(…)` writes across many slots.
 *
 * ## Scoped runtimes
 * `TempoRuntime.createScoped()` returns a fresh, independent runtime that is NOT
 * stored on `globalThis`.  Pass it explicitly to internal helpers that accept an
 * optional `runtime` parameter when you need full isolation (e.g. in tests or
 * sandboxed sub-applications).
 */
export class TempoRuntime {
	/** raw term-plugin storage array — consumed by REGISTRY in tempo.register.ts */
	readonly terms: TermPlugin[] = [];
	/** raw extension-plugin storage array — consumed by REGISTRY */
	readonly extensions: Extension[] = [];
	/** raw named-module map — consumed by REGISTRY */
	readonly modules: Record<string, any> = {};
	/** set of installed plugin identifiers — consumed by REGISTRY */
	readonly installed: Set<any> = new Set();
	/** decentralized reset hooks — fired on every registryReset() call */
	readonly resetHooks: Set<() => void> = new Set();
	/**
	 * Persistent plugin/term discovery database.
	 * Replaces the `globalThis[sym.$Plugins]` slot.
	 * Kept as a plain object (not a secureRef) so callers can push() into the arrays.
	 */
	readonly pluginsDb: { terms: TermPlugin[]; plugins: Plugin[] } = { terms: [], plugins: [] };

	/** The single reactive registration callback (replaces `globalThis[sym.$Register]`). */
	#registerHook: ((val: any) => void) | undefined;

	// ─── Register hook ────────────────────────────────────────────────────────

	/**
	 * Install (or replace) the reactive registration callback.
	 * Returns the previous callback so callers can chain or restore it.
	 */
	setRegisterHook(cb: (val: any) => void): ((val: any) => void) | undefined {
		if (this.#registerHook !== undefined && this.#registerHook !== cb)
			console.warn('TempoRuntime: replacing existing register hook');
		const prev = this.#registerHook;
		this.#registerHook = cb;
		return prev;
	}

	/** Invoke the reactive registration callback (no-op if none is set). */
	fireRegisterHook(val: any): void {
		this.#registerHook?.(val);
	}

	// ─── Validated mutation helpers ───────────────────────────────────────────

	/**
	 * Record a Term in the discovery database.
	 * Validates the shape before storing so malformed entries cannot corrupt state.
	 */
	addTerm(term: TermPlugin): void {
		if (!term || typeof term.key !== 'string') return;
		if (!this.pluginsDb.terms.some(t => t.key === term.key))
			this.pluginsDb.terms.push(term);
	}

	/**
	 * Record a Plugin in the discovery database.
	 * Guards against duplicate entries.
	 */
	addPlugin(plugin: any): void {
		if (!plugin) return;
		if (!this.pluginsDb.plugins.includes(plugin))
			this.pluginsDb.plugins.push(plugin);
	}

	// ─── Factory helpers ──────────────────────────────────────────────────────

	/**
	 * Create a fresh, **scoped** runtime that is NOT stored on `globalThis`.
	 * Use this for test isolation or sandboxed sub-applications.
	 */
	static createScoped(): TempoRuntime {
		return new TempoRuntime();
	}
}

/**
 * Return the singleton `TempoRuntime`.
 *
 * On the first call the runtime is created and pinned to `globalThis` under the BRIDGE
 * symbol with a hardened property descriptor (non-enumerable, non-configurable,
 * non-writable).  Subsequent calls — even from other bundle copies — retrieve the same
 * object via `globalThis[BRIDGE]`, preserving the single-source-of-truth guarantee.
 *
 * A non-enumerable getter for the legacy `sym.$Plugins` slot is also installed the first
 * time so that `Tempo.init()` (which reads `globalThis[sym.$Plugins]` to re-apply
 * persistent plugin registrations) continues to find the live `pluginsDb` without any
 * changes to the Tempo class itself.
 */
export function getRuntime(): TempoRuntime {
	const existing = (globalThis as any)[BRIDGE];
	if (existing instanceof TempoRuntime) return existing;

	const rt = new TempoRuntime();

	// Pin as a single hardened slot: the only thing Tempo puts on globalThis for
	// its own internal bookkeeping.
	Object.defineProperty(globalThis, BRIDGE, {
		value: rt,
		enumerable: false,
		configurable: false,
		writable: false,
	});

	// Backward-compat: expose pluginsDb via the legacy sym.$Plugins slot so that
	// code that reads globalThis[Symbol.for('$TempoPlugin')] (e.g. Tempo.init's
	// #setDiscovery call) still finds the live plugin database.
	const LEGACY_PLUGINS = Symbol.for('$TempoPlugin');
	if (!Object.getOwnPropertyDescriptor(globalThis, LEGACY_PLUGINS)) {
		Object.defineProperty(globalThis, LEGACY_PLUGINS, {
			get() { return (globalThis as any)[BRIDGE]?.pluginsDb; },
			enumerable: false,
			configurable: false,
		});
	}

	return rt;
}
