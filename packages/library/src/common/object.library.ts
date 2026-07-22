import { ownKeys, ownEntries } from '#library/primitive.library.js';
import { isObject, isArray, isFunction, isDefined, isNullish, isMap, isSet } from '#library/assertion.library.js';
import { getType } from '#library/type.library.js';
import type { Extend, Property } from '#library/type.library.js';

/**
 * Serializes an object to JSON and removes quotes around property names.
 * Useful for generating loosely formatted string representations of objects.
 * 
 * @param obj - The object to un-quote
 * @returns A stringified JSON representation without quotes around keys
 * @example
 * ```ts
 * unQuoteObj({ a: 1 }); // '{a: 1}'
 * ```
 */
export const unQuoteObj = (obj: any) => {
	return JSON.stringify(obj)
		?.replace(/"([^"]+)":/g, '$1: ')
		?.replace(/,/g, ', ')
}

/**
 * Recursively copies enumerable properties of an object into a new object.
 * Returns the original value if it is not an object or is nullish.
 * 
 * @param obj - The object to copy
 * @returns A new object with the copied properties
 * @example
 * ```ts
 * const copy = asObject({ a: 1 });
 * ```
 */
export const asObject = <T>(obj?: Record<PropertyKey, any>) => {
	if (isNullish(obj) || !isObject(obj))
		return obj as T;

	const temp: any = isArray(obj) ? [] : {};

	ownKeys(obj)
		.forEach(key => temp[key] = asObject(obj[key]));

	return temp as T;
}

/**
 * Performs a deep comparison between two values to determine if they are equivalent.
 * Supports primitives, arrays, maps, sets, and plain objects.
 * 
 * @param a - The first value to compare
 * @param b - The second value to compare
 * @returns True if the values are deeply equal
 * @example
 * ```ts
 * isEqual({ a: 1 }, { a: 1 }); // true
 * ```
 */
export const isEqual = (a: any, b: any): boolean => {
	if (a === b) return true;
	if (isNullish(a) || isNullish(b)) return a === b;
	if (getType(a) !== getType(b)) return false;

	if (isArray(a) && isArray(b)) {
		const left = a as any[], right = b as any[];
		return left.length === right.length && left.every((v, i) => isEqual(v, right[i]));
	}

	if (isMap(a) && isMap(b)) {
		const left = a as Map<any, any>, right = b as Map<any, any>;
		return left.size === right.size &&
			Array.from(left.keys()).every(k => right.has(k) && isEqual(left.get(k), right.get(k)));
	}

	if (isSet(a) && isSet(b)) {
		const left = a as Set<any>, right = b as Set<any>;
		return left.size === right.size &&
			Array.from(left).every(v => right.has(v));
	}

	if (isObject(a) && isObject(b)) {
		const left = a as any, right = b as any;
		const keys = new Set<PropertyKey>();
		const keys1 = (isFunction(left.keys) && Object.getPrototypeOf(left) !== Object.prototype) ? Array.from<PropertyKey>(left.keys()) : ownKeys(left);
		const keys2 = (isFunction(right.keys) && Object.getPrototypeOf(right) !== Object.prototype) ? Array.from<PropertyKey>(right.keys()) : ownKeys(right);

		keys1.forEach(k => keys.add(k));
		keys2.forEach(k => keys.add(k));

		if (keys.size !== keys1.length || keys.size !== keys2.length) return false;

		return [...keys].every(k => isEqual(left[k], right[k]));
	}

	return false;
}

/**
 * Finds all method names on an object.
 * 
 * @param obj - The object to inspect
 * @param all - Whether to traverse the prototype chain (default: false)
 * @returns An array of property keys corresponding to functions
 * @example
 * ```ts
 * const methods = getMethods(myClassInstance);
 * ```
 */
export const getMethods = (obj: any, all = false) => {
	const properties = new Set<PropertyKey>();
	let currentObj = obj;

	do {
		Object
			.getOwnPropertyNames(currentObj)
			.map(key => properties.add(key))
	} while (all && (currentObj = Object.getPrototypeOf(currentObj)));

	return [...properties.keys()]
		.filter(key => isFunction(obj[key]));
}

/**
 * Extracts a new object containing only the properties with defined (non-undefined) values.
 * 
 * @param obj - The object to extract from
 * @returns A new object without undefined values
 * @example
 * ```ts
 * const clean = ifDefined({ a: 1, b: undefined }); // { a: 1 }
 * ```
 */
export function ifDefined<T extends Property<any>>(obj: T) {
	return ownEntries(obj)
		.reduce((acc, [key, val]) => {
			if (isDefined<any>(val))
				acc[key] = val;
			return acc as T;
		}, {} as T)
}

/**
 * Creates a new object composed of the picked object properties.
 * 
 * @param obj - The source object
 * @param keys - The property names to pick
 * @returns A new object containing only the picked properties
 * @example
 * ```ts
 * const subset = pick({ a: 1, b: 2, c: 3 }, 'a', 'c'); // { a: 1, c: 3 }
 * ```
 */
export const pick = <T extends Property<T>, K extends string>(obj: T, ...keys: K[]): Partial<T> => {
	const ownKeys = Object.getOwnPropertyNames(obj);

	return keys.reduce((acc, key) => {
		if (ownKeys.includes(key))
			acc[key] = obj[key];
		return acc;
	}, {} as T);
}

/**
 * Extracts a specified named key from an array of objects.
 * 
 * @param objs - The array of objects
 * @param key - The property key to extract
 * @returns An array of the extracted property values
 * @example
 * ```ts
 * const ids = pluck([{ id: 1 }, { id: 2 }], 'id'); // [1, 2]
 * ```
 */
export const pluck = <T, K extends keyof T>(objs: T[], key: K): T[K][] =>
	objs.map(obj => obj[key]);

/**
 * Extends a target object with the properties of one or more source objects.
 * Uses `Object.assign` internally.
 * 
 * @param obj - The target object
 * @param objs - The source objects
 * @returns The extended target object
 * @example
 * ```ts
 * const ext = extend({ a: 1 }, { b: 2 }); // { a: 1, b: 2 }
 * ```
 */
export const extend = <T extends {}, U>(obj: T, ...objs: U[]) =>
	Object.assign(obj, ...objs) as T;

/**
 * Recursively deeply merges multiple objects into a single new object.
 * Does not mutate the source objects.
 * 
 * @param objects - The objects to merge
 * @returns A new deeply merged object
 * @example
 * ```ts
 * const merged = deepMerge({ a: { x: 1 } }, { a: { y: 2 } }); // { a: { x: 1, y: 2 } }
 * ```
 */
export const deepMerge = <T extends Record<PropertyKey, any>>(...objects: Partial<T>[]): T => {
	return objects.reduce((prev, obj) => {
		if (!isObject(obj)) return prev;

		Object.entries(obj).forEach(([key, value]) => {
			if (key === '__proto__' || key === 'constructor' || key === 'prototype') return;
			const pVal = prev[key];
			if (isObject(pVal) && isObject(value)) {
				prev[key as keyof T] = deepMerge(pVal, value) as any;
			} else {
				prev[key as keyof T] = value as any;
			}
		});

		return prev;
	}, {} as any) as T;
}

/**
 * Returns the count of enumerable own properties on an object.
 * 
 * @param obj - The object to count properties of
 * @returns The number of properties
 * @example
 * ```ts
 * const count = countProperties({ a: 1, b: 2 }); // 2
 * ```
 */
export const countProperties = (obj = {}) =>
	ownKeys(obj).length

/** 
 * helper to define objects with fixed literal properties  
 * and a loose index signature for further extensions.  
 * @example
 * ```
 * const obj = looseIndex<string,string>()({ foo: 'bar', bar: 'foo' });
 * type obj = typeof obj
 * ```
 */
export function looseIndex<K extends PropertyKey = string, V = any>(): <const T extends object>(obj: T | (() => T)) => Extend<T, K, V>;
export function looseIndex<const T extends object>(obj: T | (() => T)): Extend<T, string, any>;
export function looseIndex(arg?: any): any {
	if (isDefined(arg)) return isFunction(arg) ? arg() : arg;
	return (obj: any) => isFunction(obj) ? obj() : obj;
}

/** loose object with symbols values */
looseIndex.stringSymbol = looseIndex<string, symbol>();
/** loose object with symbol keys and RegExp values */
looseIndex.symbolRegExp = looseIndex<symbol, RegExp>();
/** loose object with symbol keys and string values */
looseIndex.symbolString = looseIndex<symbol, string>();
/** loose object with string keys and string values */
looseIndex.stringString = looseIndex<string, string>();
