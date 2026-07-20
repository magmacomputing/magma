import { asString, nullishToValue } from '#library/coercion.library.js';
import { extract, ownEntries } from '#library/primitive.library.js';
import { stringify } from '#library/serialize.library.js';
import { isNumber, isDate, isObject, isDefined, isUndefined, isFunction } from '#library/assertion.library.js';
import type { Property } from '#library/type.library.js';

// adapted from https://jsbin.com/insert/4/edit?js,output
/**
 * Inserts a value into an array at its sorted position using binary search.
 * Supports both primitive values and objects (via a sorting key).
 * 
 * @param arr - The array to insert into (defaults to an empty array)
 * @param val - The value to insert
 * @param key - The property key to sort by if inserting objects
 * @returns The mutated array containing the inserted value
 * @example
 * ```ts
 * sortInsert([1, 3], 2); // [1, 2, 3]
 * ```
 */
export const sortInsert = <T, K extends keyof T>(arr: T[] = [], val: T, key?: K) => {
	const obj = isObject(val) && isDefined(key);							// array of Objects
	let low = 0, high = arr.length;

	while (low < high) {
		const mid = (low + high) >>> 1;												// divide by 2
		const source = obj
			? arr[mid]![key]																			// array of Object values
			: arr[mid]!																					// assume Primitive values
		const target = obj
			? val[key]
			: val

		if (source < target)
			low = mid + 1
		else high = mid
	}

	arr.splice(low, 0, val);																	// mutate original Array
	return arr;
}

/** sort Array-of-Objects by multiple keys */
export interface SortBy {
	field: string;
	dir?: 'asc' | 'desc';
	index?: number | '*';
	default?: any;
}

/**
 * Creates a comparison function for sorting an array of objects by multiple keys.
 * 
 * @param keys - The keys or sorting options to apply in priority order
 * @returns A comparison function suitable for `Array.prototype.sort()`
 * @example
 * ```ts
 * const arr = [{ a: 1, b: 'z' }, { a: 1, b: 'a' }];
 * arr.sort(sortBy('a', { field: 'b', dir: 'desc' }));
 * ```
 */
export function sortBy<T extends Property<T>>(...keys: (PropertyKey | SortBy)[]) {
	const sortOptions = keys																	// coerce string => SortBy
		.flat()																								// flatten Array-of-Array
		.map(key => isObject(key) ? key : { field: stringify(key) })	// build Array of sort-options

	return (left: T, right: T) => {
		let result = 0 as -1 | 0 | 1;													// 0 = same, -1 = left<right, +1 = left>right

		sortOptions.forEach(key => {
			if (result === 0) {																	// no need to look further if result !== 0
				const dir = key.dir === 'desc' ? -1 : 1;
				const field = key.field + (key.index ? `[${key.index}]` : '');
				const valueA = extract(left, field, nullishToValue(key.default, 0));
				const valueB = extract(right, field, nullishToValue(key.default, 0));

				switch (true) {
					case isNumber(valueA) && isNumber(valueB):
					case isDate(valueA) && isDate(valueB):
					case isObject(valueA) && isObject(valueB) && isNumber(valueA.valueOf()) && isNumber(valueB.valueOf()):
						result = (dir as any) * ((valueA as any) - (valueB as any));
						break;

					default:
						result = dir * asString(valueA)?.localeCompare(asString(valueB));
						break;
				}
			}
		})

		return result;
	}
}

/**
 * Sorts an array of objects in place by a series of keys.
 * 
 * @param array - The array to sort
 * @param keys - The keys or sorting options to apply
 * @returns The sorted array
 * @example
 * ```ts
 * const sorted = sortKey(users, 'lastName', 'firstName');
 * ```
 */
export function sortKey<T extends Property<any>>(array: T[], ...keys: (PropertyKey | SortBy)[]) {
	return array.sort(sortBy(...keys));
}

type GroupFn<T extends Property<T>> = (value: T, index?: number) => PropertyKey

/**
 * Groups an array of objects by the return value of a callback function.
 * 
 * @param arr - The array of objects to group
 * @param grpFn - The callback function returning the group key
 * @returns A record containing arrays of grouped objects
 * @example
 * ```ts
 * const groups = byKey([{ id: 1, type: 'A' }, { id: 2, type: 'A' }], itm => itm.type);
 * ```
 */
export function byKey<T extends Property<any>>(arr: T[], grpFn: GroupFn<T>): Record<PropertyKey, T[]>;
/**
 * Groups an array of objects by a sequence of key fields.
 * 
 * @param arr - The array of objects to group
 * @param keys - The sequence of object keys to group by
 * @returns A record containing arrays of grouped objects
 * @example
 * ```ts
 * const groups = byKey(users, 'department', 'role');
 * ```
 */
export function byKey<T extends Property<any>>(arr: T[], ...keys: (keyof T)[]): Record<PropertyKey, T[]>;
export function byKey<T extends Property<any>>(arr: T[], fnKey: GroupFn<T> | keyof T, ...keys: (keyof T)[]) {
	if (isFunction(fnKey))
		return Object.groupBy(arr, fnKey);

	const keyed = [fnKey]																		// mapFn is a keyof T
		.concat(keys)																					// append any trailing keyof T[]
		.flat();																								// flatten Array-of-Array

	return Object.groupBy(arr, itm =>												// group an array into an object with named keys
		keyed
			.map(key => isUndefined(itm[key]) ? '' : stringify(itm[key]))
			.join('.')
	)
}

/**
 * Groups an array of objects by a callback function, retaining only the last entry per group.
 * 
 * @param arr - The array of objects to group
 * @param grpFn - The callback function returning the group key
 * @returns A record containing the last object from each group
 * @example
 * ```ts
 * const latest = byLkp(events, ev => ev.id);
 * ```
 */
export function byLkp<T extends Property<any>>(arr: T[], grpFn: GroupFn<T>): Record<PropertyKey, T>;
/**
 * Groups an array of objects by key fields, retaining only the last entry per group.
 * 
 * @param arr - The array of objects to group
 * @param keys - The sequence of object keys to group by
 * @returns A record containing the last object from each group
 * @example
 * ```ts
 * const latest = byLkp(events, 'type');
 * ```
 */
export function byLkp<T extends Property<any>>(arr: T[], ...keys: (keyof T)[]): Record<keyof T, T>;
export function byLkp<T extends Property<any>>(arr: T[], fnKey: GroupFn<T> | keyof T, ...keys: (keyof T)[]) {
	const group = isFunction(fnKey)
		? byKey(arr, fnKey)																		// group by the callback function
		: byKey(arr, fnKey, ...keys);													// group by the list of keys

	return ownEntries(group)
		.reduce((acc, [key, grp]) => Object.assign(acc, { [key]: grp?.pop() }), {} as Record<PropertyKey, T>)
}

/**
 * Clears an array in-place, removing all elements and filling with null before truncation.
 * 
 * @param arr - The array to clear
 * @returns The cleared array
 * @example
 * ```ts
 * const arr = [1, 2, 3];
 * clear(arr); // arr is now []
 * ```
 */
export function clear<T>(arr: T[]) {
	arr.fill(null as any).length = 0;
	return arr;
}

/**
 * Generates the cartesian product of multiple arrays.
 * 
 * @param args - The arrays to combine
 * @returns An array of combinations (each combination is an array)
 * @example
 * ```ts
 * cartesian([1, 2], ['a', 'b']); // [[1, 'a'], [1, 'b'], [2, 'a'], [2, 'b']]
 * ```
 */
export function cartesian<T>(...args: T[][]): T[][] {
	const [a, b = [], ...c] = args;
	const cartFn = (a: any[], b: any[]) => ([] as any[]).concat(...a.map(d => b.map(e => ([] as any[]).concat(d, e))));

	return b.length
		? cartesian(cartFn(a, b), ...c)
		: (a || []) as T[][];
}

/**
 * Executes a callback with the provided array and returns the array.
 * Useful for side-effects (e.g., logging) in the middle of a function chain.
 * 
 * @param arr - The array to tap into
 * @param fn - The callback to execute
 * @returns The original array
 * @example
 * ```ts
 * tap([1, 2, 3], console.log).map(x => x * 2);
 * ```
 */
export function tap<T>(arr: T[], fn: (value: T[]) => void) {
	fn(arr);
	return arr;
}