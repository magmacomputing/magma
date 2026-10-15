import { asArray, asNumber, ifNumeric } from '#library/coercion.library.js';
import type { TValues } from '#library/type.library.js';

/**
 * Maximum 32-bit signed integer timer delay supported by Node.js and the HTML timer specification (2^31 - 1).
 */
export const TIMEOUT_MAX = 2 ** 31 - 1;

/**
 * Converts a number or array of numbers into a contiguous hexadecimal string.
 * Flattens nested arrays and filters out non-integers.
 * 
 * @param num - The number(s) to convert
 * @param len - Optional maximum length of the resulting string
 * @returns The hexadecimal string representation
 * @example
 * ```ts
 * toHex([255, 16]); // 'ff10'
 * ```
 */
export const toHex = (num: TValues<number> = [], len?: number) =>
	asArray(num)																							// ensure array
		.flat(1_000_000)																				// flatten any arrays to arbitrary depth
		.filter(Number.isInteger)																// ensure integers	
		.map(val => (val + 0x100).toString(16).slice(-2))
		.join('')
		.toLowerCase()
		.substring(0, len ?? Number.MAX_SAFE_INTEGER)

/**
 * Appends an ordinal suffix (st, nd, rd, th) to a number.
 * 
 * @param idx - The number to format (defaults to 0)
 * @returns The number formatted as a string with its ordinal suffix
 * @example
 * ```ts
 * suffix(1); // '1st'
 * suffix(23); // '23rd'
 * ```
 */
export const suffix = (idx: number = 0) => {
	const str = String(idx);

	switch (true) {
		case str.endsWith('1') && !str.endsWith('11'):
			return str + 'st';
		case str.endsWith('2') && !str.endsWith('12'):
			return str + 'nd';
		case str.endsWith('3') && !str.endsWith('13'):
			return str + 'rd';
		default:
			return str + 'th';
	}
}

/**
 * Splits a number or string by a delimiter and parses the chunks.
 * 
 * @param nbr - The value to split
 * @param chr - The delimiter character (default: '.')
 * @param zero - Whether to strip leading zeros during numeric conversion (default: true)
 * @returns An array of parsed numeric or string chunks
 * @example
 * ```ts
 * split('12.34'); // [12, 34]
 * ```
 */
export function split<T extends number>(nbr: T, chr?: string, zero?: boolean): number[];
export function split<T extends string>(nbr: T, chr?: string, zero?: boolean): (string | number)[];
export function split<T extends string | number>(nbr?: T, chr: string = '.', zero: boolean = true): any[] {
	return nbr?.toString().split(chr).map(val => ifNumeric(val, zero))
		|| []
}

/**
 * Formats a number to a fixed number of decimal places.
 * 
 * @param nbr - The number or string to format
 * @param max - The maximum number of decimal places (default: 2)
 * @returns The fixed-precision string representation
 * @example
 * ```ts
 * fix(12.3456, 2); // '12.35'
 * ```
 */
export const fix = (nbr: string | number = 0, max = 2) =>
	asNumber(nbr, 0).toFixed(max);

/**
 * Removes the colon from an HH:MI time string and returns it as a number.
 * 
 * @param hhmi - The time string (e.g., '14:30')
 * @returns The numeric representation (e.g., 1430)
 * @example
 * ```ts
 * asTime('14:30'); // 1430
 * ```
 */
export const asTime = (hhmi: string | number) =>
	Number(String(hhmi).replace(':', ''));

const ROMAN_MATRIX: readonly (readonly [number, string])[] = [
	[1000, 'M'],
	[900, 'CM'],
	[500, 'D'],
	[400, 'CD'],
	[100, 'C'],
	[90, 'XC'],
	[50, 'L'],
	[40, 'XL'],
	[10, 'X'],
	[9, 'IX'],
	[5, 'V'],
	[4, 'IV'],
	[1, 'I'],
]

const ROMAN_VALUES: Record<string, number> = {
	I: 1,
	V: 5,
	X: 10,
	L: 50,
	C: 100,
	D: 500,
	M: 1000,
}

const RE_ROMAN_NUMERALS = /^M{0,3}(CM|CD|D?C{0,3})(XC|XL|L?X{0,3})(IX|IV|V?I{0,3})$/;

/**
 * Converts a positive integer into its Roman numeral string representation.
 * 
 * @param num - The number to convert
 * @returns The Roman numeral string
 * @example
 * ```ts
 * toRoman(2026); // 'MMXXVI'
 * toRoman(14); // 'XIV'
 * ```
 */
export function toRoman(num: number): string {
	if (!Number.isInteger(num) || num < 1 || num > 3999)
		return '';

	let n = num;
	let result = '';

	for (const [value, symbol] of ROMAN_MATRIX) {
		while (n >= value) {
			result += symbol;
			n -= value;
		}
	}

	return result;
}

/**
 * Converts a Roman numeral string into its numeric integer value.
 *
 * @param roman - The Roman numeral string to convert (case-insensitive)
 * @returns The integer value (1-3999), or NaN if invalid
 * @example
 * ```ts
 * fromRoman('MMXXVI'); // 2026
 * fromRoman('XIV'); // 14
 * fromRoman('IIII'); // NaN
 * ```
 */
export function fromRoman(roman: string): number {
	const str = roman?.trim?.().toUpperCase();
	if (!str || !RE_ROMAN_NUMERALS.test(str))
		return NaN;

	let total = 0;
	for (let i = 0; i < str.length; i++) {
		const current = ROMAN_VALUES[str[i]] ?? 0;
		const next = ROMAN_VALUES[str[i + 1]] ?? 0;

		total += current < next ? -current : current;
	}

	return total;
}


