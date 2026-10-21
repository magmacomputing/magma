import { sym } from '#library/symbol.library.js';
import type { Obj, KeyOf, ValueOf, EntryOf, ResolveTypeGuards, TypeofTag } from '#library/type.library.js';

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
		const next = curr[sym.$Target];
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

/** Supported type guard tags including case-insensitive variants */
export type GuardTag =
	| TypeofTag
	| Capitalize<TypeofTag>
	| Uppercase<TypeofTag>
	| 'BigInt';

type AnyGuard = GuardTag | ((val: any) => boolean);

/**
 * Checks whether an object possesses a specific own property, unwrapping Proxies if present.
 * Safe against null, undefined, and non-object primitives.
 * 
 * @param obj - The target object to inspect
 * @param key - The property key to test
 * @returns True if the unwrapped target possesses key as an own property
 * @example
 * ```ts
 * if (hasOwn(config, 'timeZone')) { ... }
 * ```
 */
export function hasOwn<K extends PropertyKey>(
	obj: unknown,
	key: K,
): boolean;

/**
 * Asserts that an object possesses a specific own property whose value matches at least one of the
 * specified type tags (case-insensitive, e.g. `'string'`, `'String'`, `'Number'`) or predicate functions.
 * Safe against null, undefined, and non-object primitives.
 *
 * @param obj - The target object to inspect
 * @param key - The property key to verify
 * @param guards - One or more type tags or predicate functions
 * @returns True if the target possesses the own property and its value satisfies at least one guard
 * @example
 * ```ts
 * if (hasOwn(config, 'timeout', 'number')) {
 *   config.timeout.toFixed();
 * }
 * if (hasOwn(err, 'code', isString, isNumber)) {
 *   console.log(err.code);
 * }
 * ```
 */
export function hasOwn<K extends PropertyKey, G extends AnyGuard[]>(
	obj: unknown,
	key: K,
	...guards: [...G]
): obj is Record<K, ResolveTypeGuards<G>>;

export function hasOwn(
	obj: unknown,
	key: PropertyKey,
	...guards: AnyGuard[]
): boolean {
	if (obj === null || (typeof obj !== 'object' && typeof obj !== 'function'))
		return false;

	const target = unwrap(obj as object);
	if (!Object.hasOwn(target, key))
		return false;

	if (guards.length === 0)
		return true;

	const val = (target as any)[key];
	return matchGuards(val, guards);
}

/**
 * Asserts whether an object has one or more keys (using the `in` operator, unwrapping Proxies if present).
 * Safe against null, undefined, and non-object primitives.
 * Narrows `obj` to a record containing the specified keys.
 *
 * @param obj - The target object to inspect
 * @param keys - Property keys to verify, including inherited properties
 * @returns True if the target contains all specified keys; with no keys, true for objects and functions
 * @throws Errors from proxy traps or getters used while unwrapping or checking keys propagate to the caller.
 * @example
 * ```ts
 * if (hasKeys(config, 'dialect')) { ... }
 * if (hasKeys(options, 'from', 'to')) { ... }
 * ```
 */
export function hasKeys<K extends PropertyKey>(obj: unknown, ...keys: K[]): obj is Record<K, unknown> {
	if (obj === null || (typeof obj !== 'object' && typeof obj !== 'function'))
		return false;

	const target = unwrap(obj as object);
	return keys.length === 0 || keys.every(k => k in target);
}

/**
 * Asserts whether an object has at least one of the specified keys (using the `in` operator, unwrapping Proxies if present).
 * Safe against null, undefined, and non-object primitives.
 *
 * @param obj - The target object to inspect
 * @param keys - Candidate property keys to verify, including inherited properties
 * @returns True if the target contains at least one of the specified keys; false if no keys are provided or obj is not an object
 * @throws Errors from proxy traps or getters used while unwrapping or checking keys propagate to the caller.
 * @example
 * ```ts
 * if (hasAnyOf(arg, 'install', 'define')) { ... }
 * ```
 */
export function hasAnyOf<K extends readonly PropertyKey[]>(
	obj: unknown,
	...keys: K
): obj is { [P in K[number]]: Record<P, unknown> }[K[number]] {
	if (obj === null || (typeof obj !== 'object' && typeof obj !== 'function') || keys.length === 0)
		return false;

	const target = unwrap(obj as object);
	return keys.some(k => k in target);
}

/**
 * Asserts whether an object possesses NONE of the specified keys (using the `in` operator, unwrapping Proxies if present).
 * Safe against null, undefined, and non-object primitives (returns true for non-objects).
 *
 * @param obj - The target object to inspect
 * @param keys - Property keys that must not exist on the target
 * @returns True if none of the specified keys exist on the target
 * @throws Errors from proxy traps or getters used while unwrapping or checking keys propagate to the caller.
 * @example
 * ```ts
 * if (hasNoneOf(item, 'name', 'key', 'install')) { ... }
 * ```
 */
export function hasNoneOf(obj: unknown, ...keys: PropertyKey[]): boolean {
	if (obj === null || (typeof obj !== 'object' && typeof obj !== 'function'))
		return true;

	const target = unwrap(obj as object);
	return !keys.some(k => k in target);
}

/**
 * Asserts that an object contains a specified key, optionally validating and narrowing its value type.
 * Safe against null, undefined, and non-object primitives.
 *
 * @param obj - The target object to inspect
 * @param key - The property key to verify, including inherited properties
 * @returns True if the target contains the key
 * @example
 * ```ts
 * if (hasKey(config, 'timeout')) { ... }
 * ```
 */
export function hasKey<K extends PropertyKey>(
	obj: unknown,
	key: K,
): obj is Record<K, unknown>;

/**
 * Asserts that an object contains a specified key whose value matches at least one of the specified
 * type tags (case-insensitive, e.g. `'string'`, `'String'`, `'Number'`) or predicate functions.
 *
 * @param obj - The target object to inspect
 * @param key - The property key to verify
 * @param guards - One or more type tags or predicate functions
 * @returns True if the target contains the key and its value satisfies at least one guard
 * @example
 * ```ts
 * if (hasKey(err, 'code', 'String', 'number')) {
 *   console.log(err.code); // string | number
 * }
 * if (hasKey(err, 'code', isString, isNumber)) {
 *   console.log(err.code); // string | number
 * }
 * ```
 */
export function hasKey<K extends PropertyKey, G extends AnyGuard[]>(
	obj: unknown,
	key: K,
	...guards: [...G]
): obj is Record<K, ResolveTypeGuards<G>>;

export function hasKey(
	obj: unknown,
	key: PropertyKey,
	...guards: AnyGuard[]
): boolean {
	if (obj === null || (typeof obj !== 'object' && typeof obj !== 'function'))
		return false;

	const target = unwrap(obj as object);
	if (!(key in target))
		return false;

	if (guards.length === 0)
		return true;

	const val = (target as any)[key];
	return matchGuards(val, guards);
}

function matchGuards(val: unknown, guards: AnyGuard[]): boolean {
	for (let i = 0; i < guards.length; i++) {
		const guard = guards[i];
		if (typeof guard === 'function') {
			if (guard(val)) return true;
		} else if (typeof guard === 'string') {
			if (checkSingleType(val, guard.trim().toLowerCase()))
				return true;
		}
	}
	return false;
}

function checkSingleType(val: unknown, tag: string): boolean {
	switch (tag) {
		case 'string':
		case 'number':
		case 'boolean':
		case 'function':
		case 'bigint':
		case 'symbol':
		case 'undefined':
			return typeof val === tag;
		case 'array':
			return Array.isArray(val);
		case 'null':
			return val === null;
		case 'object':
			return val !== null && !Array.isArray(val) && typeof val === 'object';
		case 'any':
		case 'unknown':
			return true;
		default:
			return false;
	}
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
