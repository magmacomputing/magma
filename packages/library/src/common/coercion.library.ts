import { clone, stringify } from '#library/serialize.library.js';
import { asType } from '#library/type.library.js';
import { isIntegerLike, isArrayLike, isDefined, isInteger, isIterable, isNullish, isString, isUndefined, isNumber, isNumeric, isError, isObject } from '#library/assertion.library.js';

/** Coerce {value} into {value[]} ( if not already ), with optional {fill} Object */
export function asArray<T>(arr: Exclude<ArrayLike<T>, string> | undefined): T[];
export function asArray<T>(arr: T | Exclude<Iterable<T> | undefined, string>): NonNullable<T>[];
export function asArray<T, K>(arr: Iterable<T> | ArrayLike<T>, fill: K): K[];
export function asArray<T, K>(arr: T | Iterable<T> | ArrayLike<T> = [], fill?: K): (T | K)[] {
	const mapFn = (val: unknown) => (isUndefined(fill) || isDefined(val)) ? val as unknown as K : clone(fill);

	return (isArrayLike<T>(arr) || (isIterable<T>(arr) && !isString(arr)))
		? Array.from<T, K>(arr as Iterable<T>, mapFn)
		: [arr as T] as (T | K)[];
}

/** stringify if not nullish */
export function asString<T>(str?: T) {
	return isNullish(str)
		? ''
		: isInteger(str)
			? str.toString() + 'n'
			: stringify(str);
}

/** convert String | Number | BigInt to Number */
export function asNumber(str?: string | number | bigint) {
	return parseFloat(str?.toString() ?? 'NaN');
}

/** convert String | Number to BigInt */
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

/** return as Number if possible, else original String */
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
			if (/^-?[0-9]+$/.test(numStr)) {
				const big = BigInt(numStr);
				if (big > BigInt(Number.MAX_SAFE_INTEGER) || big < BigInt(Number.MIN_SAFE_INTEGER)) return big;
			}
			return asNumber(str);
		}

		default:
			return str as string;																	// non-numeric String → as-is
	}
}

export const nullishToZero = <T>(obj: T) => obj ?? 0;
export const nullishToEmpty = <T>(obj: T) => obj ?? '';
export const nullishToValue = <T, R>(obj: T, value: R) => obj ?? value;

/** coerce an unknown value into an Error instance */
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
