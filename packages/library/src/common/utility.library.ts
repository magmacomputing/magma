import { ownValues } from '#library/primitive.library.js';
import { isDefined, isPrimitive } from '#library/assertion.library.js';
import { sym } from '#library/symbol.library.js';
import type { Secure, ValueOf } from '#library/type.library.js';

/** General utility functions */

/** analyze the Call Stack to determine calling Function's name */
export const getCaller = () => {
	const stackTrace = new Error().stack											// only tested in latest FF and Chrome
		?.split('\n')
		?.map(itm => itm.trim())
		?.filter(itm => !itm.startsWith('Error'))
		?? []

	const callerName = stackTrace[2].split(' ');

	return (callerName[1] === 'new') ? callerName[2] : callerName[1].split('.')[0];
}

/** analyze the Call Stack to determine calling Function's name */
export const getScript = (nbr = 1) => {
	const stackTrace = new Error().stack
		?.match(/([^ \n\(@])*([a-z]*:\/\/\/?)*?[a-z0-9\/\\]*\.js/ig)
		?.[nbr]
	return decodeURI(stackTrace ?? '');											// decodeURI is needed to handle spaces in file-names
}

/**
 * introduce a wait-timer that will Error() on timeout.  
 * best used with Promise.race([xxx(), sleep()]  
 * @param msg			string to display on a timeout 
 * @param timeout	how many milliseconds to sleep (default 2-seconds)  
 * @returns				Promise\<void>  
 * @see Context.Browser
 */
export const sleep = (msg = 'sleep: timed out', timeout = 2000) =>
	new Promise<Error>((_, reject) => setTimeout(() => reject(new Error(msg)), timeout));

/** Javascript Runtimes */
export const CONTEXT = {
	'Unknown': 'unknown',
	'Browser': 'browser',
	'NodeJS': 'nodejs',
	'Deno': 'deno',
	'GoogleAppsScript': 'google-apps-script',
} as const
export type CONTEXT = ValueOf<typeof CONTEXT>
type Context = { global: any, type: CONTEXT }

/** determine JavaScript environment context */
export const getContext = (): Context => {
	const global = globalThis as any;

	if (isDefined(global.SpreadsheetApp))
		return { global, type: CONTEXT.GoogleAppsScript };

	if (isDefined(global.window?.document))
		return { global, type: CONTEXT.Browser };

	if (isDefined(global.process?.versions?.node))
		return { global, type: CONTEXT.NodeJS };

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
 * @returns The frozen object with Secure<T> type
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
	
	if (isPrimitive(obj) || Object.isFrozen(obj) || seen.has(obj) || skip.has(obj))
		return obj as Secure<T>;

	if ((obj as any)?.[Symbol.toStringTag] === 'Enumify')
		return obj as Secure<T>;

	if ((obj as any)[sym.$Extensible])
		return obj as Secure<T>;

	seen.add(obj);

	ownValues(obj as any).forEach(val => deepFreeze(val, { skip }, seen));

	return Object.freeze(obj) as Secure<T>;
}
