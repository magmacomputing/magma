import { sym } from '#library/symbol.library.js';
import { isEmpty } from '#library/assertion.library.js';
import type { Obj, KeyOf, ValueOf, EntryOf } from '#library/type.library.js';

/**
 * primitive.library.ts
 * 
 * Deep-core utilities used to break circular dependencies in the library.  
 * These functions have NO dependencies on array, object, or reflection libraries.
 */

/** 
 * ## unwrap
 * Traverse a Proxy chain and return the underlying raw target object.
 * Hardened against prototype-climbing bugs.
 */
export function unwrap<T extends object>(obj: T): T {
	let curr = (obj as any)?.[sym.$Target] ?? obj;
	while (Object.prototype.hasOwnProperty.call(curr, sym.$Target)) {
		curr = curr[sym.$Target];
	}
	return curr;
}

/** Tuple of enumerable entries with string | symbol keys */
export function ownEntries<T extends Obj>(json: T, all = false): EntryOf<T>[] {
	if (!json || typeof json !== 'object')
		return [] as EntryOf<T>[];

	const getOwn = (obj: any): [PropertyKey, any][] => {
		const tgt = unwrap(obj);
		return Reflect.ownKeys(tgt)
			.filter(key => Object.getOwnPropertyDescriptor(tgt, key)?.enumerable)
			.map(key => [key, tgt[key]]);
	}

	if (!all) return getOwn(json) as EntryOf<T>[];

	const levels: [PropertyKey, any][][] = [];
	const limit = 50;
	let depth = 0;
	let proto: any = json;

	do {
		const t = unwrap(proto);
		const lvl = getOwn(proto);
		if (lvl.length) levels.push(lvl);
		proto = Object.getPrototypeOf(t);
	} while (proto && proto !== Object.prototype && ++depth < limit);

	return [...new Map(levels.reverse().flat()).entries()] as EntryOf<T>[];
}

/** Array of all enumerable PropertyKeys */
export function ownKeys<T extends Obj>(json: T, all = false): KeyOf<T>[] {
	return ownEntries(json, all).map(([key]) => key as KeyOf<T>);
}

/** Array of all enumerable object values */
export function ownValues<T extends Obj>(json: T, all = false): ValueOf<T>[] {
	return ownEntries(json, all).map(([_, value]) => value as ValueOf<T>);
}

/** Get nested value using dot or bracket notation */
export function extract<T>(obj: any, path: string | number, dflt?: T): T {
	if (isEmpty(path)) return obj as T;
	if (obj === null || typeof obj !== 'object') return dflt as T;

	return path
		.toString()
		.replace(/\[([^\[\]]*)\]/g, '.$1.')
		.split('.')
		.filter(field => field.length > 0)
		.reduce((acc, field) => acc?.[field] ?? null, obj) ?? dflt;
}

/** Return an array with no repeated elements */
export function distinct<T>(arr: T[]): T[];
/** return a mapped array with no repeated elements */
export function distinct<T, S>(arr: T[], mapfn: (value: T, index: number, array: T[]) => S, thisArg?: any): S[];
export function distinct<T>(arr: T[], mapfn?: (value: any, index: number, array: any[]) => any, thisArg?: any) {
	return mapfn
		? distinct(arr.map(mapfn, thisArg))
		: Array.from(new Set(arr));
}
