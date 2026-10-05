import { markExtensible } from '#library/symbol.library.js';
import { sym } from './support.symbol.js';
import type { Plugin } from '../plugin/plugin.type.js';
import type { TermPlugin } from '../plugin/term/term.type.js';
import type { Internal } from '../tempo.type.js';

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
 * `globalThis` (the `$Bridge` symbol).  The slot is defined as non-enumerable,
 * non-configurable and non-writable so external code cannot replace or delete the
 * runtime object.  All mutation goes through the controlled methods on this class.
 *
 * ## Multi-bundle / HMR compatibility
 * `getRuntime()` checks `globalThis[$Bridge]` before creating a new instance.  When
 * two bundle copies of the library are loaded (monorepo, HMR, etc.), both find the
 * same runtime and therefore share the same arrays / sets — the same guarantee that
 * was previously achieved by scattering `Symbol.for(…)` writes across many slots.
 *
 * ## Scoped runtimes (Experimental)
 * `TempoRuntime.createScoped()` returns a fresh, isolated runtime that is *not* stored on `globalThis`, enabling clean test isolation without globalThis manipulation.  **Note**: Scoped runtimes are currently an experimental internal feature and are not yet fully threaded through all core utilities.  Scoped runtimes are not pinned to `globalThis`, lack the `defineProperty` descriptor protections of the primary instance, and instead rely solely on the lexical reference returned (contrasting with the hardened `getRuntime()` and `globalThis[$Bridge]` behavior). Implementation examples of this test-scoping pattern can be found in [plugin_registration.test.ts](../test/plugin_registration.test.ts) and [duration.core.test.ts](../test/duration.core.test.ts).
 */
export class TempoRuntime {
	constructor() {
		(this as any)[sym.$RuntimeBrand] = true;
		markExtensible(this);
		markExtensible(this.extensions);
	}

	/** raw extension-plugin storage array — consumed by REGISTRY */
	readonly extensions: (Plugin | TermPlugin | any)[] = [];
	/** raw named-module map — consumed by REGISTRY */
	readonly modules: Record<string, any> = {};
	/** set of installed plugin identifiers — consumed by REGISTRY.
	 * For sandbox states this will be a `ScopedSet` parented to this global set. */
	readonly installed: Set<any> = new Set();
	/** decentralized reset hooks — fired on every registryReset() call */
	readonly resetHooks: Set<() => void> = new Set();

	/** persistent global configuration state — mirrors Tempo.#global */
	state?: Internal.State | undefined;
	/** centralized diagnostic logger — shared across all Tempo modules */
	logger?: any | undefined;
	/** cache for next-available 'usr' Token key */
	usrCount: number = 0;

	// ─── Register hook ────────────────────────────────────────────────────────
	readonly #hooks: Map<symbol, (val: any) => void> = new Map();

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
	 * Replaces existing terms with the same key to support HMR and test module cache resets.
	 */
	addTerm(state: Internal.State, term: TermPlugin): void {
		if (!term || typeof term.key !== 'string') return;
		if (!state.pluginsDb) state.pluginsDb = { terms: [], plugins: [] };
		if (!state.pluginsDb.terms) state.pluginsDb.terms = [];
		markExtensible(state.pluginsDb);
		markExtensible(state.pluginsDb.terms);

		const idx = state.pluginsDb.terms.findIndex(t => t.key === term.key);
		if (idx >= 0) {
			if (Object.isExtensible(state.pluginsDb.terms)) {
				state.pluginsDb.terms[idx] = term;
			} else {
				const nextTerms = [...state.pluginsDb.terms];
				nextTerms[idx] = term;
				state.pluginsDb.terms = markExtensible(nextTerms);
			}
		} else {
			if (Object.isExtensible(state.pluginsDb.terms)) {
				state.pluginsDb.terms.push(term);
			} else {
				state.pluginsDb.terms = markExtensible([...state.pluginsDb.terms, term]);
			}
		}
	}

	/**
	 * Record a Plugin in the discovery database.
	 * Guards against duplicate entries.
	 * Replaces existing plugins with the same name to support HMR and test module cache resets.
	 */
	addPlugin(state: Internal.State, plugin: any): void {
		if (!plugin) return;
		if (!state.pluginsDb) state.pluginsDb = { terms: [], plugins: [] };
		if (!state.pluginsDb.plugins) state.pluginsDb.plugins = [];
		markExtensible(state.pluginsDb);
		markExtensible(state.pluginsDb.plugins);

		if (plugin.name) {
			const idx = state.pluginsDb.plugins.findIndex(p => p.name === plugin.name);
			if (idx >= 0) {
				if (Object.isExtensible(state.pluginsDb.plugins)) {
					state.pluginsDb.plugins[idx] = plugin;
				} else {
					const nextPlugins = [...state.pluginsDb.plugins];
					nextPlugins[idx] = plugin;
					state.pluginsDb.plugins = markExtensible(nextPlugins);
				}
				return;
			}
		}
		if (!state.pluginsDb.plugins.includes(plugin)) {
			if (Object.isExtensible(state.pluginsDb.plugins)) {
				state.pluginsDb.plugins.push(plugin);
			} else {
				state.pluginsDb.plugins = markExtensible([...state.pluginsDb.plugins, plugin]);
			}
		}
	}

	/**
	 * Record an Extension in the raw storage.
	 * Guards against duplicate entries and ensures validation.
	 */
	addExtension(extension: any): void {
		if (!extension) return;
		markExtensible(this.extensions);
		if (!this.extensions.includes(extension)) {
			if (Object.isExtensible(this.extensions)) {
				this.extensions.push(extension);
			} else {
				(this as any).extensions = markExtensible([...this.extensions, extension]);
			}
		}
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

let localFallbackRuntime: TempoRuntime | undefined;

/**
 * Return the singleton `TempoRuntime`.
 *
 * On the first call the runtime is created and pinned to `globalThis` under the $Bridge
 * symbol with a hardened property descriptor (non-enumerable, non-configurable,
 * non-writable).  Subsequent calls — even from other bundle copies — retrieve the same
 * object via `globalThis[$Bridge]`, preserving the single-source-of-truth guarantee.
 */
export function getRuntime(): TempoRuntime {
	const existing = (globalThis as any)[sym.$Bridge];
	if (existing && existing[sym.$RuntimeBrand] === true)
		return existing;

	if (localFallbackRuntime)
		return localFallbackRuntime;

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
	} else {
		const desc = Object.getOwnPropertyDescriptor(globalThis, sym.$Bridge);
		if (desc && desc.configurable !== false) {
			Object.defineProperty(globalThis, sym.$Bridge, {
				value: rt,
				enumerable: false,
				configurable: false,
				writable: false,
			});
		} else {																								// Cannot overwrite a non-configurable global
			localFallbackRuntime = rt;														// use local fallback
		}
	}

	return rt;
}

/**
 * @internal
 * Force-reset the runtime state for testing.
 * This clears the internal state and license trackers to ensure test isolation.
 */
export function resetRuntime(): void {
	const rt = getRuntime();
	rt.state = undefined;
	rt.usrCount = 0;
}
