import { sym } from '#library/symbol.library.js';
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
	// Hardened against different Symbol instances across module boundaries
	while (curr && (Object.prototype.hasOwnProperty.call(curr, sym.$Target) || (curr as any).$Target)) {
		curr = curr[sym.$Target] ?? (curr as any).$Target;
	}
	return curr;
}

/** Tuple of enumerable entries with string | symbol keys */
export function ownEntries<T extends Obj>(json: T, all = false): EntryOf<T>[] {
	if (!json || typeof json !== 'object')
		return [] as EntryOf<T>[];

	const tgt = unwrap(json);
	if (!all) {
		const keys = Reflect.ownKeys(tgt).reverse();
		const entries: [PropertyKey, any][] = [];
		for (const k of keys) {
			const desc = Object.getOwnPropertyDescriptor(tgt, k);
			if (desc && desc.enumerable) entries.push([k, (tgt as any)[k]]);
		}
		return entries as EntryOf<T>[];
	}

	const entries: [PropertyKey, any][] = [];
	const seen = new Set<PropertyKey>();
	const limit = 50;
	let depth = 0;
	let proto: any = tgt;

	while (proto && proto !== Object.prototype && depth++ < limit) {
		const current = unwrap(proto);
		const keys = Reflect.ownKeys(current).reverse();

		for (const k of keys) {
			if (seen.has(k)) continue;
			const desc = Object.getOwnPropertyDescriptor(current, k);
			if (!desc || !desc.enumerable) continue;
			seen.add(k);
			entries.push([k, (current as any)[k]]);
		}

		proto = Object.getPrototypeOf(current);
	}

	return entries as EntryOf<T>[];
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
	if (path === undefined || path === null || path === '') return obj as T;
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
