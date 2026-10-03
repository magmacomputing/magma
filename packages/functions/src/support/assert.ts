import type { Tempo } from '@magmacomputing/tempo';
import type { Temporal } from './temporal.js';

/**
 * Validates whether an argument is a finite number.
 */
export const isNumber = (val: any): val is number =>
	typeof val === 'number' && Number.isFinite(val);

/**
 * Validates whether an argument is a string.
 */
export const isString = (val: any): val is string =>
	typeof val === 'string';

/**
 * Validates whether an argument is a non-empty string with meaningful content.
 */
export const isText = (val: any): val is string =>
	isString(val) && val.trim().length > 0;

/**
 * Validates whether an argument is a boolean.
 */
export const isBoolean = (val: any): val is boolean =>
	val === true || val === false;

/**
 * Validates whether an argument is a callable function.
 */
export const isFunction = (val: any): val is Function =>
	typeof val === 'function';

/**
 * Validates whether an argument is null or undefined.
 */
export const isNullish = (val: any): val is null | undefined =>
	val === null || val === undefined;

/**
 * Validates whether an argument is undefined.
 */
export const isUndefined = (val: any): val is undefined =>
	val === undefined;

/**
 * Validates whether an argument is defined (neither null nor undefined).
 */
export const isDefined = <T>(val: T | null | undefined): val is T =>
	!isNullish(val);

/**
 * Validates whether an argument is a valid Date instance.
 */
export const isDate = (val: any): val is Date =>
	val instanceof Date && isNumber(val.getTime());

/**
 * Validates whether an argument is a primitive value.
 */
export const isPrimitive = (val?: unknown): boolean =>
	val === null || (typeof val !== 'object' && !isFunction(val));

/**
 * Validates whether an argument is a non-null object reference (excluding functions).
 */
export const isObject = (val: any): val is Record<string | symbol, any> =>
	isDefined(val) && typeof val === 'object' && !Array.isArray(val);

/**
 * Validates whether an argument is a non-null object or function reference.
 */
export const isReference = (val: any): val is object =>
	!isPrimitive(val);

/**
 * Determines whether an object has a property with the specified name as its own property.
 */
export function hasOwn<K extends PropertyKey>(obj: unknown, key: K): obj is Record<K, unknown> {
	if (obj === null || (typeof obj !== 'object' && typeof obj !== 'function'))
		return false;
	return Object.hasOwn(obj, key);
}

/**
 * Checks if the given argument is an object with a Symbol.toStringTag property.
 * @internal
 */
const isTagged = (arg: any): arg is Record<string | symbol, any> =>
	isDefined(arg) && typeof arg === 'object' && Symbol.toStringTag in arg;

/**
 * Checks if the given argument is a Tempo instance.
 */
export function isTempo(arg: any): arg is Tempo {
	return isTagged(arg) && arg[Symbol.toStringTag] === 'Tempo';
}

/**
 * Checks if the given argument is ANY valid Temporal object.
 */
export function isTemporal(arg: any): boolean {
	return isTagged(arg) && String(arg[Symbol.toStringTag]).startsWith('Temporal.');
}

/**
 * Checks if the given argument is a Temporal.ZonedDateTime.
 */
export function isZonedDateTime(arg: any): arg is Temporal.ZonedDateTime {
	return isTagged(arg) && arg[Symbol.toStringTag] === 'Temporal.ZonedDateTime';
}

/**
 * Checks if the given argument is a Temporal.Instant.
 */
export function isInstant(arg: any): arg is Temporal.Instant {
	return isTagged(arg) && arg[Symbol.toStringTag] === 'Temporal.Instant';
}

/**
 * Checks if the given argument is a Temporal.PlainDate.
 */
export function isPlainDate(arg: any): arg is Temporal.PlainDate {
	return isTagged(arg) && arg[Symbol.toStringTag] === 'Temporal.PlainDate';
}

/**
 * Checks if the given argument is a Temporal.PlainTime.
 */
export function isPlainTime(arg: any): arg is Temporal.PlainTime {
	return isTagged(arg) && arg[Symbol.toStringTag] === 'Temporal.PlainTime';
}

/**
 * Checks if the given argument is a Temporal.PlainDateTime.
 */
export function isPlainDateTime(arg: any): arg is Temporal.PlainDateTime {
	return isTagged(arg) && arg[Symbol.toStringTag] === 'Temporal.PlainDateTime';
}

/**
 * Checks if the given argument is a Temporal.Duration.
 */
export function isDuration(arg: any): arg is Temporal.Duration {
	return isTagged(arg) && arg[Symbol.toStringTag] === 'Temporal.Duration';
}

/**
 * Checks if the given argument is a Tempo.Interval.
 */
export function isInterval(arg: any): boolean {
	return isTagged(arg) && arg[Symbol.toStringTag] === 'Tempo.Interval';
}
