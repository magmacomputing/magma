import sym from './tempo.symbol.js';
import type { TermPlugin, Extension, Plugin } from '../plugin/plugin.type.js';

/**
 * # TempoRuntime
 * @internal
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
 * ## Scoped runtimes (Experimental)
 * `TempoRuntime.createScoped()` returns a fresh, isolated runtime that is *not* stored on `globalThis`, enabling clean test isolation without globalThis manipulation.  **Note**: Scoped runtimes are currently an experimental internal feature and are not yet fully threaded through all core utilities.  Scoped runtimes are not pinned to `globalThis`, lack the `defineProperty` descriptor protections of the primary instance, and instead rely solely on the lexical reference returned (contrasting with the hardened `getRuntime()` and `globalThis[BRIDGE]` behavior). Implementation examples of this test-scoping pattern can be found in [plugin_registration.test.ts](../test/plugin_registration.test.ts) and [duration.core.test.ts](../test/duration.core.test.ts).
 */
export class TempoRuntime {
	constructor() {
		(this as any)[sym.$RuntimeBrand] = true;
	}
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
	readonly #hooks: Map<symbol, (val: any) => void> = new Map();


	// ─── Register hook ────────────────────────────────────────────────────────

	/** Set a registration hook for a given symbol. Returns the previous hook. */
	setHook(key: symbol, cb: (val: any) => void): ((val: any) => void) | undefined {
		const prev = this.#hooks.get(key);
		this.#hooks.set(key, cb);
		return prev;
	}

	/** Get a registration hook for a given symbol. */
	getHook(key: symbol): ((val: any) => void) | undefined {
		return this.#hooks.get(key);
	}

	/** Invoke the hook for a given symbol. */
	emit(key: symbol, val: any): void {
		this.#hooks.get(key)?.(val);
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
	 * @internal @experimental
	 * Create a fresh, **scoped** runtime that is NOT stored on `globalThis`.
	 * NOTE: Scoped runtimes are currently experimental and not yet fully threaded
	 * through all internal helpers. Use for manual state isolation only.
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
 */
export function getRuntime(): TempoRuntime {
	const existing = (globalThis as any)[sym.$Bridge];
	if (existing && existing[sym.$RuntimeBrand] === true) return existing;

	const rt = new TempoRuntime();

	// Pin as a single hardened slot if it doesn't already exist.
	// This avoids Redefinition errors if multiple bundles are loaded.
	if (!existing) {
		Object.defineProperty(globalThis, sym.$Bridge, {
			value: rt,
			enumerable: false,
			configurable: false,
			writable: false,
		});
	}

	return rt;
}
