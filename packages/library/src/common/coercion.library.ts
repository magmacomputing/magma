import { clone, stringify } from '#library/serialize.library.js';
import { asType } from '#library/type.library.js';
import { isIntegerLike, isArrayLike, isDefined, isInteger, isIterable, isNullish, isString, isUndefined, isNumber, isNumeric, isError, isObject } from '#library/assertion.library.js';

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
 * Coerces a String, Number, or BigInt to a Number.
 * 
 * @param str - The value to coerce
 * @returns The coerced Number
 * @example
 * ```ts
 * const num = asNumber(123n); // 123
 * ```
 */
export function asNumber(str?: string | number | bigint) {
	return parseFloat(str?.toString() ?? 'NaN');
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
	if (isInteger(str) || isNumber(str))											// native BigInt or finite number → boundary-check
		return toBounded(parseBigInt(str));

	const value = removeSign(str);														// only reached for string input

	if (isNumeric(str) && (!value.startsWith('0') || stripZero))
		return (isIntegerLike(value) || RE_INTEGER.test(value))	// BigInt literal or plain integer string
			? toBounded(parseBigInt(str as string))
			: asNumber(str);																			// floating-point string

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
