import { clone, stringify } from '#library/serialize.library.js';
import { asType } from '#library/type.library.js';
import { isIntegerLike, isArrayLike, isDefined, isInteger, isIterable, isNullish, isString, isUndefined, isNumber, isNumeric, isError, isObject } from '#library/assertion.library.js';
import { trimAll } from '#library/string.library.js';

/**
 * Coerces a value into an array. If the value is already an array-like or iterable,
 * it is converted to an array. An optional `fill` value can be provided to map over the elements.
 * 
 * @param arr - The value to coerce into an array
 * @param fill - Optional value to map over the elements
 * @returns An array containing the coerced values
 * @example
 * ```ts
 * const arr = asArray('hello'); // ['hello']
 * ```
 */
export function asArray<T>(arr: Exclude<ArrayLike<T>, string> | undefined): T[];
export function asArray<T>(arr: T | Exclude<Iterable<T> | undefined, string>): NonNullable<T>[];
export function asArray<T, K>(arr: Iterable<T> | ArrayLike<T>, fill: K): K[];
export function asArray<T, K>(arr: T | Iterable<T> | ArrayLike<T> = [], fill?: K): (T | K)[] {
	const mapFn = (val: unknown) => (isUndefined(fill) || isDefined(val)) ? val as unknown as K : clone(fill);

	return (isArrayLike<T>(arr) || (isIterable<T>(arr) && !isString(arr)))
		? Array.from<T, K>(arr as Iterable<T>, mapFn)
		: [arr as T] as (T | K)[];
}

/**
 * Coerces a value to a string using serialization if it is not nullish.
 * 
 * @param str - The value to coerce to a string
 * @returns The stringified value, or an empty string if nullish
 * @example
 * ```ts
 * const str = asString({ a: 1 }); // '{"a":1}'
 * ```
 */
export function asString<T>(str?: T) {
	return isNullish(str)
		? ''
		: isInteger(str)
			? str.toString() + 'n'
			: stringify(str);
}

/**
 * Coerces a value to a cleaned, non-empty string.
 * Returns the trimmed string if valid, otherwise returns undefined (or an optional fallback).
 * 
 * @param str - The value to normalize
 * @param fallback - Optional fallback if str is not a valid non-empty string
 * @param deepClean - If true, applies trimAll to normalize tabs, newlines, and collapsed spaces
 * @returns The cleaned string or fallback
 * @example
 * ```ts
 * asText('  hello  ');              // 'hello'
 * asText('   ');                    // undefined
 * asText(123);                      // undefined
 * asText('   ', 'en-US');           // 'en-US'
 * asText(' a \t b \n', null, true); // 'a b'
 * ```
 */
export function asText(str: unknown): string | undefined;
export function asText(str: unknown, fallback: undefined, deepClean?: boolean): string | undefined;
export function asText<T extends string>(str: unknown, fallback: T, deepClean?: boolean): string;
export function asText<T>(str: unknown, fallback: T, deepClean?: boolean): string | T;
export function asText<T = undefined>(str: unknown, fallback?: T, deepClean = false): string | T {
	if (isString(str)) {
		const cleaned = deepClean ? trimAll(str) : str.trim();
		if (cleaned.length > 0) return cleaned;
	}
	return fallback as T;
}

/**
 * Conditionally coalesces a value based on a predicate guard.
 * Returns the value (narrowed by the guard) if the guard returns true, otherwise returns the fallback.
 * 
 * @param value - The candidate value to test
 * @param guard - A predicate or type guard function
 * @param fallback - Optional fallback value if the guard returns false
 * @returns The value or fallback
 * @example
 * ```ts
 * when('hello', isString);              // 'hello'
 * when(123, isString);                  // undefined
 * when(123, isString, 'default');       // 'default'
 * when(rawIso, v => v !== 'INVALID');   // rawIso or undefined
 * ```
 */
export function when<T>(value: unknown, guard: (v: unknown) => v is T): T | undefined;
export function when<T>(value: unknown, guard: (v: unknown) => v is T, fallback: undefined): T | undefined;
export function when<T, U>(value: unknown, guard: (v: unknown) => v is T, fallback: U): T | U;
export function when<T>(value: T, guard: (v: T) => boolean): T | undefined;
export function when<T, U>(value: T, guard: (v: T) => boolean, fallback: U): T | U;
export function when<T, U = undefined>(value: unknown, guard: (v: unknown) => boolean, fallback?: U): T | U {
	return guard(value) ? (value as T) : (fallback as U);
}

/**
 * Coerces a value to a finite number.
 * Returns the finite number if valid, otherwise returns undefined (or an optional fallback).
 * 
 * @param val - The value to coerce
 * @param fallback - Optional fallback if val is not a finite number
 * @returns The coerced finite number or fallback
 * @example
 * ```ts
 * asNumber(123);             // 123
 * asNumber(123n);            // 123
 * asNumber('123.45');        // 123.45
 * asNumber('abc');           // undefined
 * asNumber('abc', 0);        // 0
 * asNumber(null, 1.0);       // 1.0
 * ```
 */
export function asNumber(val: unknown): number | undefined;
export function asNumber(val: unknown, fallback: undefined): number | undefined;
export function asNumber<T extends number>(val: unknown, fallback: T): number;
export function asNumber<T>(val: unknown, fallback: T): number | T;
export function asNumber<T = undefined>(val: unknown, fallback?: T): number | T {
	if (isNumber(val)) return val;
	if (isInteger(val)) {
		const num = Number(val);
		if (isNumber(num)) return num;
		return fallback as T;
	}
	if (isString(val)) {
		const trimmed = val.trim();
		if (trimmed.length > 0) {
			const parsed = Number(trimmed);
			if (isNumber(parsed)) return parsed;
		}
	}
	return fallback as T;
}

const RE_INTEGER = /^[+-]?[0-9]+$/;
const RE_SIGN_START = /^[+-]/;
const MAX_SAFE_INTEGER_BIGINT = BigInt(Number.MAX_SAFE_INTEGER);
const MIN_SAFE_INTEGER_BIGINT = BigInt(Number.MIN_SAFE_INTEGER);

/**
 * @param str - The value with optional plus|minus prefix
 * @returns The string value without the sign prefix
 */
function removeSign(str: string | number | bigint) {
	return String(str).trim().replace(RE_SIGN_START, '');
}

/**
 * Parses any `string | number | bigint` to a canonical signed `bigint`.
 * Handles optional sign prefix, trailing `n` suffix (BigInt literal), and float truncation.
 * Does **not** apply a safe-integer boundary check — that is `toBounded`'s responsibility.
 */
function parseBigInt(str: string | number | bigint): bigint {
	if (isInteger(str)) return str;														// already a bigint
	if (isNumber(str)) return BigInt(Math.trunc(str));				// truncate float, no string round-trip

	const raw = String(str).trim();
	const clean = removeSign(str);
	if (clean.length === 0) return BigInt(raw);

	const sign = raw.startsWith('-') ? -1n : 1n;							// preserve sign before stripping
	const trim = isIntegerLike(clean) ? -1 : undefined;				// strip trailing 'n' (undefined = keep full string)
	return sign * BigInt(clean.slice(0, trim));
}

/**
 * Applies the safe-integer boundary check to a `bigint`.
 * Returns a `number` when the value fits within `Number.MAX_SAFE_INTEGER` bounds,
 * otherwise preserves the `bigint` to avoid precision loss.
 */
function toBounded(big: bigint): number | bigint {
	return (big > MAX_SAFE_INTEGER_BIGINT || big < MIN_SAFE_INTEGER_BIGINT)
		? big
		: Number(big);
}

/**
 * Coerces a String or Number to a BigInt.
 * 
 * @param str - The value to coerce
 * @returns The coerced BigInt
 * @example
 * ```ts
 * const big = asInteger(123.45); // 123n
 * ```
 */
export function asInteger<T extends string | number | bigint>(str?: T) {
	const arg = asType(str);

	switch (arg.type) {
		case 'BigInt':
			return arg.value;																			// already a BigInt
		case 'Number':
			return BigInt(Math.trunc(arg.value));									// cast as BigInt
		case 'String':
			return parseBigInt(arg.value);												// normalise sign + optional trailing 'n'
		default:
			return str as Exclude<T, string | number>;
	}
}

/**
 * Returns the value as a Number or BigInt if possible, otherwise returns the original string.
 * 
 * @param str - The string, number, or bigint to process
 * @param stripZero - Whether to strip leading zeros when evaluating numeric strings
 * @returns The numeric coercion or the original string
 * @example
 * ```ts
 * const num = ifNumeric('123'); // 123
 * ```
 */
export const ifNumeric = (str: string | number | bigint, stripZero = false) => {
	if (isInteger(str)) return toBounded(str);
	if (isNumber(str)) {
		if (!Number.isInteger(str)) return str;
		return toBounded(BigInt(str));
	}

	const value = removeSign(str);														// only reached for string input

	if (isNumeric(str) && (!value.startsWith('0') || stripZero))
		return (isIntegerLike(value) || RE_INTEGER.test(value))	// BigInt literal or plain integer string
			? toBounded(parseBigInt(str as string))
			: asNumber(str, 0);																		// floating-point string

	return str;																								// non-numeric or leading-zero string → as-is
}

/**
 * Returns the value if defined, otherwise 0.
 * 
 * @param obj - The value to check
 * @returns The value or 0
 * @example
 * ```ts
 * const val = nullishToZero(null); // 0
 * ```
 */
export const nullishToZero = <T>(obj: T) => obj ?? 0;

/**
 * Returns the value if defined, otherwise an empty string.
 * 
 * @param obj - The value to check
 * @returns The value or an empty string
 * @example
 * ```ts
 * const val = nullishToEmpty(undefined); // ''
 * ```
 */
export const nullishToEmpty = <T>(obj: T) => obj ?? '';

/**
 * Returns the value if defined, otherwise the fallback value.
 * 
 * @param obj - The value to check
 * @param value - The fallback value
 * @returns The original value or the fallback value
 * @example
 * ```ts
 * const val = nullishToValue(null, 'default'); // 'default'
 * ```
 */
export const nullishToValue = <T, R>(obj: T, value: R) => obj ?? value;

/**
 * Coerces an unknown value into a proper Error instance.
 * Preserves the name, message, stack, and code if available.
 * 
 * @param err - The unknown error value
 * @returns An Error instance
 * @example
 * ```ts
 * const err = asError('Something went wrong');
 * ```
 */
export function asError(err: unknown): Error & { code?: string | number } {
	if (isError(err)) return err as Error & { code?: string | number };

	const error = new Error(isObject(err) && isString(err.message) ? err.message : String(err));
	if (isObject(err)) {
		error.name = isString(err.name) ? err.name : 'Error';
		if ('code' in err && (isString(err.code) || isNumber(err.code))) (error as any).code = err.code;
		if ('stack' in err && isString(err.stack)) error.stack = err.stack;
	}
	return error as Error & { code?: string | number };
}
