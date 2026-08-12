import { sym } from '#library/symbol.library.js';
import type { Obj, KeyOf, ValueOf, EntryOf } from '#library/type.library.js';

/**
 * primitive.library.ts
 * 
 * Deep-core utilities used to break circular dependencies in the library.  
 * These functions have NO dependencies on array, object, or reflection libraries.
 */

/** 
 * Traverse a Proxy chain and return the underlying raw target object.
 * Hardened against prototype-climbing bugs and cyclic $Target chains.
 * 
 * @param obj - The object to unwrap
 * @returns The underlying raw target object
 * @example
 * ```ts
 * const raw = unwrap(proxyObj);
 * ```
 */
export function unwrap<T extends object>(obj: T): T {
	let curr = obj as any;
	let depth = 0;
	const maxDepth = 50; // Guard against infinite loops on cyclic or self-referential $Target chains

	// Use direct reads so proxy get-traps can surface synthetic $Target values.
	while (curr) {
		const next = curr[sym.$Target] ?? (curr as any).$Target;
		if (!next || depth >= maxDepth) break;
		curr = next;
		depth++;
	}
	return curr;
}

/**
 * Returns an array of all enumerable [key, value] entries for an object,
 * including properties inherited from the prototype chain if `all` is true.
 * 
 * @param json - The object to extract entries from
 * @param all - Whether to include properties from the prototype chain
 * @returns An array of [key, value] tuples
 * @example
 * ```ts
 * const entries = ownEntries({ a: 1, b: 2 });
 * ```
 */
export function ownEntries<T extends Obj>(json: T, all = false): EntryOf<T>[] {
	if (!json || typeof json !== 'object')
		return [] as EntryOf<T>[];

	const tgt = unwrap(json);
	if (!all) {
		const keys = Reflect.ownKeys(tgt);
		const entries: [PropertyKey, any][] = [];
		for (const k of keys) {
			const desc = Object.getOwnPropertyDescriptor(tgt, k);
			if (desc && desc.enumerable) entries.push([k, (tgt as any)[k]]);
		}
		return entries as EntryOf<T>[];
	}

	const levels: any[] = [];
	const limit = 50;
	let depth = 0;
	let curr: any = tgt;

	while (curr && curr !== Object.prototype && depth++ < limit) {
		levels.push(unwrap(curr));
		curr = Object.getPrototypeOf(curr);
	}

	const entries: [PropertyKey, any][] = [];
	const seen = new Set<PropertyKey>();

	for (const level of levels.reverse()) {
		const keys = Reflect.ownKeys(level);

		for (const k of keys) {
			if (seen.has(k)) continue;

			const desc = Object.getOwnPropertyDescriptor(level, k);
			if (!desc || !desc.enumerable) continue;

			seen.add(k);
			entries.push([k, (tgt as any)[k]]);
		}
	}

	return entries as EntryOf<T>[];
}

/**
 * Returns an array of all enumerable property keys for an object.
 * 
 * @param json - The object to extract keys from
 * @param all - Whether to include keys from the prototype chain
 * @returns An array of property keys
 * @example
 * ```ts
 * const keys = ownKeys({ a: 1, b: 2 });
 * ```
 */
export function ownKeys<T extends Obj>(json: T, all = false): KeyOf<T>[] {
	return ownEntries(json, all).map(([key]) => key as KeyOf<T>);
}

/**
 * Returns an array of all enumerable property values for an object.
 * 
 * @param json - The object to extract values from
 * @param all - Whether to include values from the prototype chain
 * @returns An array of property values
 * @example
 * ```ts
 * const values = ownValues({ a: 1, b: 2 });
 * ```
 */
export function ownValues<T extends Obj>(json: T, all = false): ValueOf<T>[] {
	return ownEntries(json, all).map(([_, value]) => value as ValueOf<T>);
}

const RE_BRACKET_PATH = /\[([^\[\]]*)\]/g;

/**
 * Gets a nested value from an object using dot or bracket notation.
 * 
 * @param obj - The object to extract the value from
 * @param path - The path to the value using dot or bracket notation
 * @param dflt - The default value to return if the path does not exist
 * @returns The extracted value or the default value
 * @example
 * ```ts
 * const val = extract(user, 'profile.address.zip', '00000');
 * ```
 */
export function extract<T>(obj: any, path: string | number, dflt?: T): T {
	if (path === undefined || path === null || path === '') return obj as T;
	if (obj === null || typeof obj !== 'object') return dflt as T;

	return path
		.toString()
		.replace(RE_BRACKET_PATH, '.$1.')
		.split('.')
		.filter(field => field.length > 0)
		.reduce((acc, field) => acc?.[field] ?? null, obj) ?? dflt;
}

/**
 * Returns an array with no repeated elements.
 * 
 * @param arr - The array to extract distinct elements from
 * @returns A new array containing only distinct elements
 * @example
 * ```ts
 * const unique = distinct([1, 1, 2, 3]);
 * ```
 */
export function distinct<T>(arr: T[]): T[];
/** 
 * Returns a mapped array with no repeated elements.
 * 
 * @param arr - The array to extract distinct elements from
 * @param mapfn - Optional mapping function to apply before checking for distinctness
 * @param thisArg - Optional this context for the mapping function
 * @returns A new array containing only distinct elements
 * @example
 * ```ts
 * const uniqueIds = distinct(users, user => user.id);
 * ```
 */
export function distinct<T, S>(arr: T[], mapfn: (value: T, index: number, array: T[]) => S, thisArg?: any): S[];
export function distinct<T>(arr: T[], mapfn?: (value: any, index: number, array: any[]) => any, thisArg?: any) {
	return mapfn
		? distinct(arr.map(mapfn, thisArg))
		: Array.from(new Set(arr));
}
