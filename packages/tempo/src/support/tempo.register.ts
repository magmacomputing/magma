import { clearCache } from '#library/function.library.js';
import { isDefined, isUndefined } from '#library/type.library.js';
import { ownKeys } from '#library/primitive.library.js';
import { secureRef } from '#library/proxy.library.js';
import lib from '#library/symbol.library.js';
import type { Property } from '#library/type.library.js';

import { getRuntime } from './tempo.runtime.js';

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
		const target = REGISTRIES[name]?.[lib.$Target] as Property<any>;
		const defaults = DEFAULTS[name as keyof typeof DEFAULTS] as Property<any>;

		// 1. Purge all own-properties from state and target (if configurable)
		[state, target].filter(isDefined).forEach(obj => {
			Reflect.ownKeys(obj).forEach(key => {
				const desc = Object.getOwnPropertyDescriptor(obj, key);
				if (desc?.configurable) delete obj[key];
			});
		});

		// 2. Restore defaults using property descriptors to preserve accessors/configurability
		Reflect.ownKeys(defaults).forEach(key => {
			const desc = Object.getOwnPropertyDescriptor(defaults, key);

			if (desc) {
				[state, target].filter(isDefined).forEach(obj => {
					Object.defineProperty(obj, key, desc);
				});
			}
		});

		if (target) clearCache(target);
		clearCache(state);
	});

	rt.terms.length = 0;
	rt.extensions.length = 0;

	for (const key in rt.modules) delete rt.modules[key];
	rt.installed.clear();

	// Trigger all registered reset hooks
	const hooks = resetHooks();
	hooks.forEach(hook => hook());
}

/** update a global registry with new discoverable data */
export function registryUpdate(name: keyof typeof STATE, data: Record<string, any>) {
	const registry = REGISTRIES[name];
	if (!isDefined(registry) || !isDefined(registry[lib.$Target])) return;

	const target = registry[lib.$Target] as Property<any>;
	const state = STATE[name] as Property<any>;

	Object.entries(data).forEach(([key, val]) => {
		if (isUndefined(target[key])) {													// only add if key does not exist
			Object.defineProperty(target, key, {
				value: val,
				enumerable: true,
				writable: true,
				configurable: true
			});
			if (isDefined(state)) state[key] = val;
		}
	});

	clearCache(target);
}

