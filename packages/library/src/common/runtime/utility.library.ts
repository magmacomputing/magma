import { ownEntries } from '#library/primitive.library.js';
import { isDefined, isFunction, isPrimitive } from '#library/assertion.library.js';
import { sym } from '#library/symbol.library.js';
import type { Secure, ValueOf } from '#library/type.library.js';

/** General utility functions */

/**
 * Analyzes the Call Stack to determine the calling function's name.
 * 
 * @returns The name of the calling function, or undefined if unresolvable
 * @example
 * ```ts
 * function myFunc() { console.log(getCaller()); } // 'myFunc'
 * ```
 */
export const getCaller = () => {
	const stackTrace = new Error().stack											// only tested in latest FF and Chrome
		?.split('\n')
		?.map(itm => itm.trim())
		?.filter(itm => !itm.startsWith('Error'))
		?? []

	const callerFrame = stackTrace[2];
	if (!callerFrame) return undefined;

	const callerName = callerFrame.split(' ');
	if (!callerName[1]) return undefined;

	return (callerName[1] === 'new') ? callerName[2] : callerName[1].split('.')[0];
}

/**
 * Analyzes the Call Stack to determine the calling script's URI.
 * 
 * @param nbr - The stack depth to inspect (default: 1)
 * @returns The URI of the calling script
 * @example
 * ```ts
 * const scriptUrl = getScript();
 * ```
 */
export const getScript = (nbr = 1) => {
	const stackTrace = new Error().stack
		?.match(/([^ \n\(@])*([a-z]*:\/\/\/?)*?[a-z0-9\/\\]*\.js/ig)
		?.[nbr]
	return decodeURI(stackTrace ?? '');												// decodeURI is needed to handle spaces in file-names
}

/**
 * Introduces a wait-timer that will reject with an Error on timeout.
 * Best used with `Promise.race([myTask(), sleep()])`.
 * 
 * @param msg - The string to display on a timeout (default: 'sleep: timed out')
 * @param timeout - The number of milliseconds to sleep (default: 2000)
 * @returns A Promise that rejects after the specified timeout
 * @example
 * ```ts
 * await Promise.race([fetchData(), sleep('Fetch timeout', 5000)]);
 * ```
 */
export const sleep = (msg = 'sleep: timed out', timeout = 2000) =>
	new Promise<Error>((_, reject) => setTimeout(() => reject(new Error(msg)), timeout));

/** Javascript Runtimes */
export const CONTEXT = {
	'Unknown': 'unknown',
	'Browser': 'browser',
	'WebWorker': 'web-worker',
	'NodeJS': 'nodejs',
	'Deno': 'deno',
	'GoogleAppsScript': 'google-apps-script',
} as const
export type CONTEXT = ValueOf<typeof CONTEXT>
type Context = { global: any, type: CONTEXT }

/**
 * Determines the current JavaScript environment context.
 * Useful for branching logic based on the runtime environment.
 * 
 * @returns An object containing the global scope reference and the CONTEXT type enum
 * @example
 * ```ts
 * const { type } = getContext();
 * if (type === CONTEXT.Browser) { ... }
 * ```
 */
export const getContext = (): Context => {
	const global = globalThis as any;

	try {
		if (isDefined(global.SpreadsheetApp))
			return { global, type: CONTEXT.GoogleAppsScript };

		if (isDefined(global.window?.document))
			return { global, type: CONTEXT.Browser };

		if (isFunction(global.importScripts) || (isDefined(global.WorkerGlobalScope) && global instanceof global.WorkerGlobalScope))
			return { global, type: CONTEXT.WebWorker };

		if (isDefined(global.Deno))
			return { global, type: CONTEXT.Deno };

		if (isDefined(global.process?.versions?.node) && global.process?.release?.name === 'node')
			return { global, type: CONTEXT.NodeJS };
	} catch { }

	return { global, type: CONTEXT.Unknown };
}

/** Shared empty WeakSet sentinel to avoid allocations for default skip parameter */
const EMPTY_SKIP = new WeakSet<object>();

/**
 * Deep-freeze an Array | Object to make it immutable (with recursion guard).
 * 
 * @param obj - The object to freeze
 * @param options - Optional configuration
 * @param options.skip - Externally owned WeakSet of objects to skip during freezing; not mutated by this function (caller responsible for lifecycle)
 * @returns The frozen object with `Secure<T>` type
 * 
 * @remarks
 * - Internally maintains a `seen` WeakSet to track visited objects and prevent infinite recursion
 * - The `skip` parameter is an opt-out mechanism for caller-controlled exclusions
 * - Symbol `sym.$Extensible` objects are always skipped
 */
export function deepFreeze<const T extends object>(obj: T, options?: { skip?: WeakSet<object> }): Secure<T>;
export function deepFreeze<const T extends object>(obj: T, options?: { skip?: WeakSet<object> }, seen?: WeakSet<object>): Secure<T>;
export function deepFreeze<const T extends object>(obj: T, options?: { skip?: WeakSet<object> } | WeakSet<object>, seen: WeakSet<object> = new WeakSet<object>()): Secure<T> {
	// Support both old and new signatures for backward compatibility
	const skip = (options instanceof WeakSet) ? options : (options?.skip ?? EMPTY_SKIP);

	if (isPrimitive(obj) || seen.has(obj) || skip.has(obj))
		return obj as Secure<T>;

	if (obj instanceof Date || obj instanceof RegExp || obj instanceof Error || obj instanceof Map || obj instanceof Set || obj instanceof Promise)
		return obj as Secure<T>;

	if ((obj as any)?.[Symbol.toStringTag] === 'Enumify')
		return obj as Secure<T>;

	if ((obj as any)[sym.$Extensible])
		return obj as Secure<T>;

	seen.add(obj);

	ownEntries(obj as any).forEach(([key, val]) => {
		if (key !== '__proto__' && key !== 'constructor' && key !== 'prototype')
			deepFreeze(val, { skip }, seen);
	});

	return Object.freeze(obj) as Secure<T>;
}
