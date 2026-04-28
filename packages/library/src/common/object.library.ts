import { ownKeys, ownEntries } from '#library/primitive.library.js';
import { isObject, isArray, isReference, isFunction, isDefined, isNullish, isMap, isSet } from '#library/assertion.library.js';
import type { Extend, Property } from '#library/type.library.js';

/** remove quotes around property names */
export const unQuoteObj = (obj: any) => {
	return JSON.stringify(obj)
		?.replace(/"([^"]+)":/g, '$1: ')
		?.replace(/,/g, ', ')
}

/** copy enumerable properties to a new Object */
export const asObject = <T>(obj?: Record<PropertyKey, any>) => {
	if (isNullish(obj) || !isObject(obj))
		return obj as T;

	const temp: any = isArray(obj) ? [] : {};

	ownKeys(obj)
		.forEach(key => temp[key] = asObject(obj[key]));

	return temp as T;
}

/** deep-compare object and array values for equality */
export const isEqual = (a: any, b: any): boolean => {
	if (a === b) return true;
	if (isNullish(a) || isNullish(b)) return a === b;
	if (typeof a !== typeof b) return false;

	if (isArray(a) && isArray(b)) {
		const left = a as any[], right = b as any[];
		return left.length === right.length && left.every((v, i) => isEqual(v, right[i]));
	}

	if (isMap(a) && isMap(b))
		return a.size === b.size && Array.from(a.keys()).every(k => b.has(k) && isEqual(a.get(k), b.get(k)));

	if (isSet(a) && isSet(b))
		return a.size === b.size && Array.from(a).every(v => b.has(v));

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

/** find all methods on an Object */
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

/** extract only defined values from Object */
export function ifDefined<T extends Property<any>>(obj: T) {
	return ownEntries(obj)
		.reduce((acc, [key, val]) => {
			if (isDefined<any>(val))
				acc[key] = val;
			return acc as T;
		}, {} as T)
}

/** extract a subset of keys from an object */
export const pick = <T extends Property<T>, K extends string>(obj: T, ...keys: K[]): Partial<T> => {
	const ownKeys = Object.getOwnPropertyNames(obj);

	return keys.reduce((acc, key) => {
		if (ownKeys.includes(key))
			acc[key] = obj[key];
		return acc;
	}, {} as T);
}

/** extract a named key from an array of objects */
export const pluck = <T, K extends keyof T>(objs: T[], key: K): T[K][] =>
	objs.map(obj => obj[key]);

/** extend an object with the properties of another */
export const extend = <T extends {}, U>(obj: T, ...objs: U[]) =>
	Object.assign(obj, ...objs) as T;

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
