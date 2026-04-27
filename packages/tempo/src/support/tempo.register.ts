import { clearCache } from '#library/function.library.js';
import { isDefined, isObject, isUndefined } from '#library/assertion.library.js';
import { ownKeys } from '#library/primitive.library.js';
import { unwrap } from '#library/primitive.library.js';
import type { Property } from '#library/type.library.js';

import { getRuntime } from './tempo.runtime.js';
import { setProperty } from './tempo.util.js';

// Import the live enums and their mutable state from the enum module
import { STATE, REGISTRIES, DEFAULTS } from './tempo.enum.js';

const rt = getRuntime();

/** @internal Return the runtime's reset-hook set */
const resetHooks = (): Set<() => void> => rt.resetHooks;

/** @internal Register a hook to be called when the registry is reset */
export function onRegistryReset(hook: () => void) {
	resetHooks().add(hook);
}

/** Reset all extendable registries to their original built-in defaults */
export function registryReset() {
	ownKeys(STATE).forEach(name => {
		const state = STATE[name as keyof typeof STATE] as Property<any>;
		const defaults = DEFAULTS[name as keyof typeof DEFAULTS] as Property<any>;
		const target = unwrap(REGISTRIES[name] as any);

		// 1. Purge all own-properties from state and target (if configurable)
		[state, target].filter(obj => obj != null).forEach(obj => {
			Reflect.ownKeys(obj).forEach(key => {
				const desc = Object.getOwnPropertyDescriptor(obj, key);
				if (desc?.configurable) delete obj[key];
			});
		});

		// 2. Restore defaults using property descriptors to preserve accessors/configurability
		Reflect.ownKeys(defaults).forEach(key => {
			const desc = Object.getOwnPropertyDescriptor(defaults, key);

			if (desc) {
				[state, target].filter(obj => obj != null).forEach(obj => {
					if (Object.isExtensible(obj)) {
						Object.defineProperty(obj, key, desc);
					} else {
						console.warn(`[tempo] registryReset: Cannot define property '${String(key)}' on non-extensible object`, obj);
					}
				});
			}
		});

		if (target) clearCache(target);
		clearCache(state);
	});

	rt.pluginsDb.terms.length = 0;
	rt.pluginsDb.plugins.length = 0;
	rt.extensions.length = 0;

	// Trigger all registered reset hooks
	const hooks = resetHooks();
	hooks.forEach(hook => hook());
}

/** update a global registry with new discoverable data */
export function registryUpdate(name: keyof typeof STATE, data: Record<string, any>) {
	const registry = REGISTRIES[name];
	const state = STATE[name] as Property<any>;
	const target = unwrap(registry) as Property<any>;

	if (!isDefined(target) || target === registry)
		return;

	Object.entries(data).forEach(([key, val]) => {
		const current = target[key];

		if (isUndefined(current)) {															// only add if key does not exist
			setProperty(target, key, val);
			if (isDefined(state)) state[key] = val;
		} else if (Array.isArray(current) && Array.isArray(val)) {					// append to existing arrays (e.g. MONTH_DAY.locales)
			val.forEach(v => { if (!current.includes(v)) current.push(v) });
		} else if (isObject(current) && isObject(val)) {							// deep merge for objects (e.g. MONTH_DAY.timezones)
			Object.entries(val).forEach(([innerKey, innerVal]) => {
				const innerCurrent = current[innerKey];
				if (isUndefined(innerCurrent)) {
					setProperty(current, innerKey, innerVal);
				} else if (Array.isArray(innerCurrent) && Array.isArray(innerVal)) {
					innerVal.forEach(v => { if (!innerCurrent.includes(v)) innerCurrent.push(v) });
				}
			});
		}
	});

	clearCache(target);
}

