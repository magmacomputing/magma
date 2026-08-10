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
			return (isIntegerLike(arg.value))											// String representation of a BigInt
				? BigInt(arg.value.slice(0, -1))										// get rid of trailing 'n'
				: BigInt(arg.value);
		default:
			return str as Exclude<T, string | number>;
	}
}

const RE_INTEGER = /^-?[0-9]+$/;

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
	switch (true) {
		case isInteger(str): {
			const big = str as bigint;
			if (big > BigInt(Number.MAX_SAFE_INTEGER) || big < BigInt(Number.MIN_SAFE_INTEGER)) return big;
			return Number(big);
		}

		case isNumber(str):
			return str;

		case isNumeric(str) && (!str?.toString().startsWith('0') || stripZero): {
			const numStr = String(str);
			if (RE_INTEGER.test(numStr)) {
				const big = BigInt(numStr);
				if (big > BigInt(Number.MAX_SAFE_INTEGER) || big < BigInt(Number.MIN_SAFE_INTEGER)) return big;
			}
			return asNumber(str);
		}

		default:
			return str as string;																	// non-numeric String → as-is
	}
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
