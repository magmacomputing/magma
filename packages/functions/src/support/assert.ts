import type { Tempo } from '@magmacomputing/tempo';
import type { Temporal } from './temporal.js';

/**
 * Checks if the given argument is an object with a Symbol.toStringTag property.
 * @internal
 */
function isObject(arg: any): arg is Record<string | symbol, any> {
	return arg != null && typeof arg === 'object' && Symbol.toStringTag in arg;
}

/**
 * Checks if the given argument is a Tempo instance.
 */
export function isTempo(arg: any): arg is Tempo {
	return isObject(arg) && arg[Symbol.toStringTag] === 'Tempo';
}

/**
 * Checks if the given argument is ANY valid Temporal object.
 */
export function isTemporal(arg: any): boolean {
	return isObject(arg) && String(arg[Symbol.toStringTag]).startsWith('Temporal.');
}

/**
 * Checks if the given argument is a Temporal.ZonedDateTime.
 */
export function isZonedDateTime(arg: any): arg is Temporal.ZonedDateTime {
	return isObject(arg) && arg[Symbol.toStringTag] === 'Temporal.ZonedDateTime';
}

/**
 * Checks if the given argument is a Temporal.Instant.
 */
export function isInstant(arg: any): arg is Temporal.Instant {
	return isObject(arg) && arg[Symbol.toStringTag] === 'Temporal.Instant';
}

/**
 * Checks if the given argument is a Temporal.PlainDate.
 */
export function isPlainDate(arg: any): arg is Temporal.PlainDate {
	return isObject(arg) && arg[Symbol.toStringTag] === 'Temporal.PlainDate';
}

/**
 * Checks if the given argument is a Temporal.PlainTime.
 */
export function isPlainTime(arg: any): arg is Temporal.PlainTime {
	return isObject(arg) && arg[Symbol.toStringTag] === 'Temporal.PlainTime';
}

/**
 * Checks if the given argument is a Temporal.PlainDateTime.
 */
export function isPlainDateTime(arg: any): arg is Temporal.PlainDateTime {
	return isObject(arg) && arg[Symbol.toStringTag] === 'Temporal.PlainDateTime';
}

/**
 * Checks if the given argument is a Temporal.Duration.
 */
export function isDuration(arg: any): arg is Temporal.Duration {
	return isObject(arg) && arg[Symbol.toStringTag] === 'Temporal.Duration';
}

/**
 * Checks if the given argument is a Tempo.Interval.
 */
export function isInterval(arg: any): boolean {
	return isObject(arg) && arg[Symbol.toStringTag] === 'Tempo.Interval';
}
