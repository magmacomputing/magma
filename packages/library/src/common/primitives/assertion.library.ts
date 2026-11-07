import { sym } from '#library/symbol.library.js';
import { getType, protoType } from '#library/type.library.js';
import type { Type, Primitive, Nullish, Temporals, Property, GetType, ValueOf } from '#library/type.library.js';

/**
 * Asserts if a value matches one of the provided types from the Type system.
 * 
 * @param obj - The value to check
 * @param types - The list of valid Types
 * @returns True if the value matches one of the specified types
 * @example
 * ```ts
 * if (isType<string>(value, 'String', 'Number')) { ... }
 * ```
 */
export const isType = <T>(obj: unknown, ...types: Type[]): obj is T => types.includes(getType(obj));

/** Type-Guards: assert `<obj>` is of `<type>` */
export const isPrimitive = (obj?: unknown): obj is Primitive =>
	obj === null || (typeof obj !== 'object' && typeof obj !== 'function');
export const isReference = (obj?: unknown): obj is Object => !isPrimitive(obj);
/** Type guard to check if a value is iterable (excludes strings) */
export const isIterable = <T>(obj: unknown): obj is Iterable<T> => Symbol.iterator in Object(obj) && !isString(obj);

/** Type guard to check if a value is a string */
export const isString = (obj: unknown): obj is string => typeof obj === 'string';
/** Type guard to check if a value is a non-empty string with meaningful content */
export const isText = (obj: unknown): obj is string => typeof obj === 'string' && obj.trim().length > 0;
/** Type guard to check if a value is a finite number */
export const isNumber = (obj: unknown): obj is number => Number.isFinite(obj);

/** Regular expression matching integer digits string (`^\d+$`) */
export const RE_DIGITS = /^\d+$/;
/** Regular expression matching signed integer string (`^[+-]?[0-9]+$`) */
export const RE_INTEGER = /^[+-]?[0-9]+$/;
/** Regular expression matching BigInt literal notation (`123n` or `-123n`) */
export const RE_BIGINT_LITERAL = /^[+-]?[0-9]+n$/;
/** Regular expression matching regular expression string literal (`/.../`) */
export const RE_REGEXP_LITERAL = /^\/.*\/$/;
/** Regular expression matching HTTP or HTTPS protocol prefixes (`http://` or `https://`) */
export const RE_HTTP_URL = /^https?:\/\//i;
/** Regular expression matching file protocol prefix (`file://`) */
export const RE_FILE_URL = /^file:\/\//i;
/** Regular expression matching one or more whitespace characters (`\s+`) */
export const RE_WHITESPACE = /\s+/;
/** Global regular expression matching one or more whitespace characters (`\s+/g`) */
export const RE_WHITESPACES = /\s+/g;
/** Global regular expression matching Unicode combining diacritical marks */
export const RE_COMBINING_MARKS = /[\u0300-\u036f]/g;
/** Regular expression matching hexadecimal string */
export const RE_HEX = /^[0-9a-f]+$/i;
/** Regular expression matching 8-character hexadecimal string */
export const RE_HEX_8 = /^[0-9a-f]{8}$/i;
/** Regular expression matching Base64 string */
export const RE_BASE64 = /^[A-Za-z0-9+/]*={0,2}$/;
/** Regular expression matching Base64URL string */
export const RE_BASE64URL = /^[A-Za-z0-9_-]*$/;
/** Regular expression matching standard UUID format */
export const RE_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** Type guard to check if a value is an integer digits string (e.g. '123') */
export const isDigits = (obj: unknown): obj is string => typeof obj === 'string' && RE_DIGITS.test(obj);
/** Type guard to check if a string is an HTTP or HTTPS URL */
export const isHttpUrl = (obj: unknown): obj is string => typeof obj === 'string' && RE_HTTP_URL.test(obj);
/** Type guard to check if a string is a file URL */
export const isFileUrl = (obj: unknown): obj is string => typeof obj === 'string' && RE_FILE_URL.test(obj);
/** Type guard to check if a value consists entirely of whitespace characters */
export const isWhitespace = (obj: unknown): obj is string => typeof obj === 'string' && obj.length > 0 && obj.trim().length === 0;
/** Type guard to check if a value is a hexadecimal string */
export const isHex = (obj: unknown): obj is string => typeof obj === 'string' && RE_HEX.test(obj);
/** Type guard to check if a value is a Base64 string */
export const isBase64 = (obj: unknown): obj is string =>
	typeof obj === 'string' && obj.length % 4 !== 1 && (!obj.includes('=') || obj.length % 4 === 0) && RE_BASE64.test(obj);
/** Type guard to check if a value is a Base64URL string */
export const isBase64Url = (obj: unknown): obj is string =>
	typeof obj === 'string' && obj.length % 4 !== 1 && RE_BASE64URL.test(obj);
/** Type guard to check if a value is a valid UUID string */
export const isUuid = (obj: unknown): obj is string => typeof obj === 'string' && RE_UUID.test(obj);

/**
 * Tests if a value can be safely converted to a numeric value.
 * Handles strings, numbers, and BigInts, verifying finite properties and valid formats.
 * 
 * @param str - The value to test
 * @returns True if the value can be evaluated numerically
 * @example
 * ```ts
 * isNumeric('123'); // true
 * isNumeric('abc'); // false
 * ```
 */
export function isNumeric(str?: any): boolean {
	const type = typeof str;
	switch (type) {
		case 'number': return Number.isFinite(str);
		case 'bigint': return true;
		case 'string': {
			const val = str.trim();
			if (val.length === 0) return false;
			return RE_BIGINT_LITERAL.test(val) || isNumber(Number(val));
		}
		default: return false;
	}
}
/** Type guard to check if a value is a BigInt */
export const isBigInt = (obj: unknown): obj is bigint => typeof obj === 'bigint';
/** Type guard to check if a value is a safe integer number */
export const isInteger = (obj: unknown): obj is number => Number.isInteger(obj);
/** Type guard to check if a value is a BigInt literal string (e.g. '123n') */
export const isBigIntLike = (obj: unknown): obj is string => typeof obj === 'string' && RE_BIGINT_LITERAL.test(obj.trim());
export const isIntegerLike = isBigIntLike;
export const isDigit = (obj: unknown): obj is number | bigint => typeof obj === 'number' ? Number.isFinite(obj) : typeof obj === 'bigint';
export const isBoolean = (obj: unknown): obj is boolean => typeof obj === 'boolean';
export const isArray = <T = any>(obj: unknown): obj is T[] => Array.isArray(obj);
export const isArrayLike = <T = any>(obj: any): obj is ArrayLike<T> => protoType(obj) === 'Object' && 'length' in obj && Object.keys(obj).every(key => key === 'length' || isNumber(Number(key)));
export const isObject = <T = any>(obj: unknown): obj is Property<T> => isType<Property<T>>(obj, 'Object');
export const isPlainObject = <T = Property<any>>(obj: unknown): obj is T => {
	if (obj === null || typeof obj !== 'object') return false;
	const proto = Object.getPrototypeOf(obj);
	return proto === Object.prototype || proto === null;
};
export const isDate = (obj: unknown): obj is Date => isType<Date>(obj, 'Date');
export const isRegExp = (obj: unknown): obj is RegExp => isType<RegExp>(obj, 'RegExp');
export const isRegExpLike = (obj: unknown): obj is string => typeof obj === 'string' && RE_REGEXP_LITERAL.test(obj);
export const isSymbol = (obj: unknown): obj is symbol => typeof obj === 'symbol';
export const isSymbolFor = (obj: unknown): obj is symbol => typeof obj === 'symbol' && Symbol.keyFor(obj) !== undefined;
export const isPropertyKey = (obj: unknown): obj is PropertyKey => {
	const t = typeof obj;
	return t === 'string' || t === 'number' || t === 'symbol';
};

/**
 * Keys considered unsafe for object assignment or prototype manipulation
 */
const UNSAFE_KEYS = ['__proto__', 'constructor', 'prototype'] as const;

/** Property keys rejected to guard against prototype pollution */
export type UnsafeKey = ValueOf<typeof UNSAFE_KEYS>;

/**
 * Asserts if a property key is safe against prototype pollution and prototype hijacking.
 * Returns false for '__proto__', 'constructor', and 'prototype'.
 * 
 * @param key - The property key to check
 * @returns True if the key is safe to assign or merge
 * @example
 * ```ts
 * isSafeKey('name'); // true
 * isSafeKey('__proto__'); // false
 * ```
 */
export const isSafeKey = (key: PropertyKey): key is Exclude<PropertyKey, UnsafeKey> =>
	!UNSAFE_KEYS.includes(key as any);

export const isNull = (obj: unknown): obj is null => obj === null;
export const isNullish = (obj: unknown): obj is Nullish => obj === null || obj === undefined;
export const isNotNullish = <T>(obj: T): obj is NonNullable<T> => obj !== null && obj !== undefined;
export const isUndefined = (obj: unknown): obj is undefined => obj === undefined;
export const isDefined = <T>(obj: T): obj is Exclude<T, undefined> => obj !== undefined;

export const isClass = (obj: unknown): obj is Function => isType<Function>(obj, 'Class');
type NarrowFunction<T = Function> = T extends (...args: any[]) => any
	? T
	: [T] extends [Function]
	? Function
	: (...args: any[]) => T;

export const isFunction = <T = Function>(obj: unknown): obj is NarrowFunction<T> =>
	isType<Function>(obj, 'Function', 'AsyncFunction', 'GeneratorFunction', 'AsyncGeneratorFunction');
export const isCallable = (obj: unknown): obj is Function => typeof obj === 'function';
export const isPromise = <T = any>(obj: unknown): obj is Promise<T> => isType<Promise<T>>(obj, 'Promise');
export const isMap = <T = any, K = any>(obj: unknown): obj is Map<K, T> => isType<Map<K, T>>(obj, 'Map');
export const isSet = <T = any>(obj: unknown): obj is Set<T> => isType<Set<T>>(obj, 'Set');
export const isError = <E extends Error = Error>(err: unknown, constructor?: new (...args: any[]) => E): err is E => isType<E>(err, 'Error') && (constructor ? err instanceof constructor : true);

export const isTemporal = (obj: unknown): obj is Temporals => protoType(obj).startsWith('Temporal.') || (isNotNullish((globalThis as any).Temporal) && (
	(obj as any) instanceof (globalThis as any).Temporal.Instant ||
	(obj as any) instanceof (globalThis as any).Temporal.ZonedDateTime ||
	(obj as any) instanceof (globalThis as any).Temporal.PlainDate ||
	(obj as any) instanceof (globalThis as any).Temporal.PlainTime ||
	(obj as any) instanceof (globalThis as any).Temporal.PlainDateTime ||
	(obj as any) instanceof (globalThis as any).Temporal.Duration ||
	(obj as any) instanceof (globalThis as any).Temporal.PlainYearMonth ||
	(obj as any) instanceof (globalThis as any).Temporal.PlainMonthDay
));

export const isInstant = (obj: unknown): obj is Temporal.Instant => isType<Temporal.Instant>(obj, 'Temporal.Instant') || (isNotNullish((globalThis as any).Temporal?.Instant) && (obj as any) instanceof (globalThis as any).Temporal.Instant) || (isNotNullish(obj) && (obj as any)[Symbol.toStringTag] === 'Temporal.Instant') || (isNotNullish(obj) && isFunction((obj as any).toZonedDateTimeISO) && isUndefined((obj as any).timeZoneId) && isUndefined((obj as any).timeZone));
export const isZonedDateTime = (obj: unknown): obj is Temporal.ZonedDateTime => isType<Temporal.ZonedDateTime>(obj, 'Temporal.ZonedDateTime') || (isNotNullish((globalThis as any).Temporal?.ZonedDateTime) && (obj as any) instanceof (globalThis as any).Temporal.ZonedDateTime) || (isNotNullish(obj) && (obj as any)[Symbol.toStringTag] === 'Temporal.ZonedDateTime') || (isNotNullish(obj) && isFunction((obj as any).toInstant) && (isNotNullish((obj as any).timeZoneId) || isNotNullish((obj as any).timeZone)));
export const isPlainDate = (obj: unknown): obj is Temporal.PlainDate => isType<Temporal.PlainDate>(obj, 'Temporal.PlainDate') || (isNotNullish((globalThis as any).Temporal?.PlainDate) && (obj as any) instanceof (globalThis as any).Temporal.PlainDate) || (isNotNullish(obj) && (obj as any)[Symbol.toStringTag] === 'Temporal.PlainDate') || (isNotNullish(obj) && isFunction((obj as any).toZonedDateTime) && isUndefined((obj as any).timeZoneId) && isUndefined((obj as any).timeZone) && isNotNullish((obj as any).daysInMonth) && isUndefined((obj as any).hour) && isUndefined((obj as any).minute) && isUndefined((obj as any).second) && isUndefined((obj as any).nanosecond));
export const isPlainTime = (obj: unknown): obj is Temporal.PlainTime => isType<Temporal.PlainTime>(obj, 'Temporal.PlainTime') || (isNotNullish((globalThis as any).Temporal?.PlainTime) && (obj as any) instanceof (globalThis as any).Temporal.PlainTime) || (isNotNullish(obj) && (obj as any)[Symbol.toStringTag] === 'Temporal.PlainTime') || (isNotNullish(obj) && isFunction((obj as any).toPlainDateTime) && isUndefined((obj as any).daysInMonth));
export const isPlainDateTime = (obj: unknown): obj is Temporal.PlainDateTime => isType<Temporal.PlainDateTime>(obj, 'Temporal.PlainDateTime') || (isNotNullish((globalThis as any).Temporal?.PlainDateTime) && (obj as any) instanceof (globalThis as any).Temporal.PlainDateTime) || (isNotNullish(obj) && (obj as any)[Symbol.toStringTag] === 'Temporal.PlainDateTime') || (isNotNullish(obj) && isFunction((obj as any).toZonedDateTime) && isUndefined((obj as any).timeZoneId) && isUndefined((obj as any).timeZone) && (isNotNullish((obj as any).hour) || isNotNullish((obj as any).minute) || isNotNullish((obj as any).second) || isNotNullish((obj as any).nanosecond)));
export const isDuration = (obj: unknown): obj is Temporal.Duration => isType<Temporal.Duration>(obj, 'Temporal.Duration') || (isNotNullish((globalThis as any).Temporal?.Duration) && (obj as any) instanceof (globalThis as any).Temporal.Duration) || (isNotNullish(obj) && (obj as any)[Symbol.toStringTag] === 'Temporal.Duration');
export const isDurationLike = (obj: unknown): obj is Temporal.DurationLike | string | Temporal.Duration => isString(obj) || isDuration(obj) || (isObject(obj) && (
	'years' in obj || 'months' in obj || 'weeks' in obj || 'days' in obj ||
	'hours' in obj || 'minutes' in obj || 'seconds' in obj ||
	'milliseconds' in obj || 'microseconds' in obj || 'nanoseconds' in obj ||
	'yy' in obj || 'mm' in obj || 'ww' in obj || 'dd' in obj ||
	'hh' in obj || 'mi' in obj || 'ss' in obj ||
	'ms' in obj || 'us' in obj || 'ns' in obj
));
export const isZonedDateTimeLike = (obj: unknown): obj is Temporal.ZonedDateTimeLike | string | Temporal.ZonedDateTime => isString(obj) || isZonedDateTime(obj) || (isObject(obj) && (
	'year' in obj || 'month' in obj || 'day' in obj || 'hour' in obj || 'minute' in obj || 'second' in obj ||
	'millisecond' in obj || 'microsecond' in obj || 'nanosecond' in obj || 'monthCode' in obj || 'offset' in obj || 'timeZone' in obj || 'calendar' in obj
));
export const isPlainYearMonth = (obj: unknown): obj is Temporal.PlainYearMonth => isType<Temporal.PlainYearMonth>(obj, 'Temporal.PlainYearMonth') || (isNotNullish((globalThis as any).Temporal?.PlainYearMonth) && (obj as any) instanceof (globalThis as any).Temporal.PlainYearMonth);
export const isPlainMonthDay = (obj: unknown): obj is Temporal.PlainMonthDay => isType<Temporal.PlainMonthDay>(obj, 'Temporal.PlainMonthDay') || (isNotNullish((globalThis as any).Temporal?.PlainMonthDay) && (obj as any) instanceof (globalThis as any).Temporal.PlainMonthDay);

/** Type guard to check if a value is an Intl.Locale instance */
export const isLocale = (obj: unknown): obj is Intl.Locale =>
	typeof Intl !== 'undefined' && typeof Intl.Locale === 'function' && obj instanceof Intl.Locale;

/** assert value for secure() */
export const isExtensible = (obj: any): obj is any => isNotNullish(obj?.[sym.$Extensible]);
export const isTarget = (obj: any): obj is any => isNotNullish(obj?.[sym.$Target]);

/**
 * Type guard to check if a value has been stamped with a specific brand Symbol.
 * Cross-realm safe and safe against primitives / nullish values.
 * 
 * @param val - The value to check
 * @param brand - The brand Symbol
 * @returns True if val is an object or function stamped with the brand
 */
export const isBranded = <T = any>(val: unknown, brand: symbol): val is T => {
	if (!val || (typeof val !== 'object' && typeof val !== 'function')) return false;
	try {
		return (val as any)[brand] === true;
	} catch {
		return false;
	}
};

/** Type guard to check if a value is an AbortSignal (cross-realm safe) */
export const isAbortSignal = (obj: unknown): obj is AbortSignal =>
	isReference(obj) &&
	'aborted' in obj &&
	isCallable((obj as AbortSignal).addEventListener) &&
	isCallable((obj as AbortSignal).removeEventListener);

/** Type guard to check if a value is an AbortController */
export const isAbortController = (obj: unknown): obj is AbortController =>
	isReference(obj) && 'signal' in obj && isCallable((obj as AbortController).abort);

/**
 * Checks if a value is effectively empty.
 * Returns true for nullish values, empty objects, empty strings, NaN, empty arrays,
 * empty sets/maps, empty typed arrays/buffers, and invalid dates.
 * 
 * @param obj - The value to check
 * @returns True if the value is empty
 * @example
 * ```ts
 * isEmpty([]); // true
 * isEmpty({ a: 1 }); // false
 * ```
 */
export const isEmpty = <T>(obj?: T) => false
	|| isNullish(obj)
	|| (isObject(obj) && Reflect.ownKeys(obj).length === 0)
	|| (isString(obj) && obj.trim().length === 0)
	|| (typeof obj === 'number' && Number.isNaN(obj))
	|| (isArray(obj) && obj.length === 0)
	|| (isSet(obj) && obj.size === 0)
	|| (isMap(obj) && obj.size === 0)
	|| (ArrayBuffer.isView(obj) && obj.byteLength === 0)
	|| (isDate(obj) && Number.isNaN(obj.getTime()));

/**
 * Asserts a condition is true, otherwise throws an Error.
 * 
 * @param condition - The boolean condition that must be true
 * @param message - The error message to throw if the condition is false
 * @throws {Error} If the condition evaluates to false
 * @example
 * ```ts
 * assertCondition(user.isLoggedIn, 'User must be logged in');
 * ```
 */
export function assertCondition(condition: boolean, message?: string): asserts condition {
	if (!condition)
		throw new Error(message);
}

/**
 * Asserts a value is a string, otherwise throws an Error.
 * 
 * @param str - The value to assert as a string
 * @throws {Error} If the value is not a string
 */
export function assertString(str: unknown): asserts str is string { assertCondition(isString(str), `Invalid string: ${str}`) };

/**
 * A TypeScript exhaustiveness check that throws an error if reached at runtime.
 * 
 * @param val - The value that should never exist
 * @throws {Error} Always throws an error
 */
export function assertNever(val: never): asserts val is never { throw new Error(`Unexpected object: ${val}`) };

