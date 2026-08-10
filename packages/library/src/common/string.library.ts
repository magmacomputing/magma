import { asNumber, asString, nullishToValue } from '#library/coercion.library.js';
import { stringify } from '#library/serialize.library.js';
import { isString, isObject, isNumeric, assertCondition, assertString } from '#library/assertion.library.js';
import type { SingularUnit } from '#library/type.library.js';

const RE_TAB = /\t/g;
const RE_NEWLINE = /(\r\n|\n|\r)/g;
const RE_MULTI_SPACE = /\s{2,}/g;
const RE_WORD_START = /\w\S*/g;
const RE_SPACE = / /g;
const RE_PARAM_MARKER = /\$\{(\d+)\}/g;
const RE_FORMAT_SPECIFIER = /%[sj]/g;
const RE_TEMPLATE_PLACEHOLDER = /\${(.*?)}/g;

// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// This section needs to be Function declarations so that they are hoisted
// (because they are referenced in prototype.library)

/**
 * Cleans a string by removing standard control characters (tab, line-feed, carriage-return) 
 * and trimming redundant spaces. Allows for an optional RegExp to specify additional matches to remove.
 * 
 * @param str - The string to clean
 * @param pat - Optional RegExp pattern to remove from the string
 * @returns The cleaned string
 * @example
 * ```ts
 * trimAll('  hello \t world \n'); // 'hello world'
 * ```
 */
export function trimAll(str: string | number, pat?: RegExp) {
	return str
		.toString()																							// coerce to String
		.replace(pat!, '')																			// remove regexp, if supplied
		.replace(RE_TAB, ' ')																		// replace <tab> with <space>
		.replace(RE_NEWLINE, ' ')																// replace <return> & <newline>
		.replace(RE_MULTI_SPACE, ' ')														// trim multiple <space>
		.trim()																									// leading/trailing <space>
}

/**
 * Converts a string to proper case, where the first letter of every word is capitalized.
 * 
 * @param str - The strings to convert (can be multiple arguments or an array)
 * @returns The proper-cased string
 * @example
 * ```ts
 * toProperCase('hello world'); // 'Hello World'
 * ```
 */
export function toProperCase<T extends string>(...str: T[]) {
	return str
		.flat()																									// in case {str} was already an array
		.map(text => text.replace(RE_WORD_START,
			word => word.charAt(0).toUpperCase() + word.substring(1).toLowerCase()))
		.join(' ') as T
}

/**
 * Converts a string to title case, where only the first letter of the entire string is capitalized.
 * This is locale-aware if a locale is provided.
 * 
 * @param str - The string to convert
 * @param locale - Optional locale for capitalization rules
 * @returns The title-cased string
 * @example
 * ```ts
 * toTitleCase('HELLO WORLD'); // 'Hello world'
 * ```
 */
export function toTitleCase(str: string, locale?: string): string {
	try {
		return str.charAt(0).toLocaleUpperCase(locale) + str.slice(1).toLocaleLowerCase(locale);
	} catch {
		return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
	}
}

// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
const PAT = /[A-Z\xC0-\xD6\xD8-\xDE]?[a-z\xDF-\xF6\xF8-\xFF]+|[A-Z\xC0-\xD6\xD8-\xDE]+(?![a-z\xDF-\xF6\xF8-\xFF])|\d+/g;
/**
 * Converts a string to camelCase format.
 * Handles spaces, punctuation, and mixed casing.
 * 
 * @param sentence - The string to convert
 * @returns The camel-cased string
 * @example
 * ```ts
 * toCamelCase('Hello World'); // 'helloWorld'
 * ```
 */
export const toCamelCase = <T extends string>(sentence: T) => {
	let [word, ...rest] = sentence.match(PAT) ?? [''];

	if (isNumeric(word)) {
		word = rest[0];
		rest.splice(0, 1);
	}

	return (sentence.startsWith('_') ? '_' : '') + word.toLocaleLowerCase() + toProperCase(...rest).replace(RE_SPACE, '') as T;
}

const HEX = 16;
/**
 * Generates a random alphanumeric string of a specified length.
 * 
 * @param len - The desired length of the string (default: 36)
 * @returns A random string
 * @example
 * ```ts
 * const str = randomString(10);
 * ```
 */
export const randomString = (len = 36) => {
	let str = '';

	do																												// generate random strings
		str += Math.floor(Math.random() * 10 ** 16).toString(HEX).substring(2, 15);
	while (str.length < len)

	return str.substring(0, len);
}

/**
 * Formats a string using sprintf-style `%s` and `%j` parameter replacements.
 * Also supports positional `${digit}` markers.
 * 
 * @param fmt - The format string (or an object to stringify)
 * @param msg - The arguments to inject into the format string
 * @returns The formatted string
 * @example
 * ```ts
 * sprintf('Hello %s', 'World'); // 'Hello World'
 * ```
 */
export function sprintf(fmt: string, ...msg: any[]): string;// either a format-string, followed by arguments
export function sprintf(...msg: any[]): string;							// or just an array of arguments
export function sprintf(fmt: {}, ...msg: any[]) {
	let sfmt = isString(fmt) ? (fmt as string) : '';

	if (!isString(fmt))																				// might be an Object
		msg.unshift(JSON.stringify(fmt));												// push to start of msg[]

	let cnt = 0;																							// if the format does not contain a corresponding '${digit}' then re-construct the parameters
	sfmt = sfmt.replace(RE_FORMAT_SPECIFIER, _ => `\${${cnt++}}`);			// flip all the %s or %j to a ${digit} parameter

	const params = Array.from(sfmt.matchAll(RE_PARAM_MARKER))
		.map(match => Number(match[1]))													// which parameters are in the fmt
	msg.forEach((_, idx) => {
		if (!params.includes(idx))															// if more args than params
			sfmt += `${sfmt.length === 0 ? '' : sfmt.endsWith(':') ? ' ' : ', '}\${${idx}}`	//  append a dummy params to fmt
	})

	// 2024-02-21  some Objects do not have a .toString method
	return sfmt.replace(RE_PARAM_MARKER, (_, idx) => msg[idx]?.toString?.() || stringify(msg[idx]));
}

/**
 * Applies a plural suffix to a word if the quantity is not exactly 1 or -1.
 * 
 * @param val - The numerical quantity or an object containing values
 * @param word - The singular word
 * @param plural - The explicitly provided plural form (defaults to word + 's')
 * @returns The appropriate singular or plural string
 * @example
 * ```ts
 * plural(2, 'apple'); // 'apples'
 * ```
 */
export const plural = (val: string | number | Record<string, string>, word: string, plural = word + 's') => {
	const _plural = (num: string | number | object, word: string, plural = word + 's') =>
		[1, -1].includes(Number(num)) ? word : plural;

	return isObject(val)
		? (num: string, word: string) => _plural(num, word, (val as Record<string, string>)[word])
		: _plural(val, word, plural)
}

/**
 * Strips a plural 's' suffix from a string if it ends with 's' and is longer than 3 characters.
 * 
 * @param val - The plural string
 * @returns The singular string
 * @example
 * ```ts
 * singular('apples'); // 'apple'
 * ```
 */
export const singular = <T extends string>(val: T): SingularUnit<T> =>
	(val.endsWith('s') && val.length > 3 ? val.slice(0, -1) : val) as any;

/**
 * Interpolates an object's values into a Template Literal string containing `${key}` placeholders.
 * 
 * @remarks
 * **WARNING:** Should not be used with untrusted templateString inputs if any form of evaluation is expected.
 * This implementation only supports simple `${key}` substitutions from templateData.
 * 
 * @param templateString - The string containing `${key}` placeholders
 * @returns A function that takes a data object and returns the interpolated string
 * @example
 * ```ts
 * const greet = makeTemplate('Hello ${name}');
 * greet({ name: 'World' }); // 'Hello World'
 * ```
 */
export const makeTemplate = (templateString: any) =>
	(templateData: any) =>
		String(templateString).replace(RE_TEMPLATE_PLACEHOLDER, (_, key) => {
			const val = (templateData as any)[key.trim()];
			return val !== undefined ? String(val) : '';
		});

/**
 * Coerces a value to a string, converts it to lowercase, and trims whitespace.
 * 
 * @param str - The value to convert
 * @returns The lowercased and trimmed string
 * @example
 * ```ts
 * toLower(' HELLO '); // 'hello'
 * ```
 */
export const toLower = <T>(str: T) => isString(str) ? asString(str).toLowerCase().trim() : str;

/**
 * Coerces a value to a string, converts it to uppercase, and trims whitespace.
 * 
 * @param str - The value to convert
 * @returns The uppercased and trimmed string
 * @example
 * ```ts
 * toUpper(' hello '); // 'HELLO'
 * ```
 */
export const toUpper = <T>(str: T) => isString(str) ? asString(str).toUpperCase().trim() : str;

/**
 * Asserts that a string's length is within specified minimum and maximum bounds.
 * Throws an error if the string is invalid or outside the bounds.
 * 
 * @param str - The string to validate
 * @param min - The minimum allowed length
 * @param max - The maximum allowed length (defaults to min)
 * @returns The validated string typed with its length constraint
 * @example
 * ```ts
 * strlen('abc', 1, 5); // 'abc'
 * ```
 */
type StrLen<Min, Max = Min> = string & { __value__: never };
export const strlen = <Min extends number, Max extends number>(str: unknown, min: Min, max?: Max) => {
	assertString(str);
	assertCondition(str.length >= min && str.length <= (max ?? min), 'string length is not between specified min and max')

	return str as StrLen<Min, Max>;
}

/**
 * Pads a string or number with a leading fill character to reach a specified length.
 * 
 * @param nbr - The input value to pad
 * @param len - The target length (default: 2)
 * @param fill - The fill character (default: space for strings, zero for numbers)
 * @returns The left-padded string
 * @example
 * ```ts
 * pad(5, 2); // '05'
 * ```
 */
export const pad = (nbr: string | number | bigint = 0, len = 2, fill?: string | number) =>
	nbr.toString().padStart(len, nullishToValue(fill, isNumeric(nbr) ? '0' : ' ').toString());

/**
 * Pads a numeric or string value with non-breaking spaces.
 * Useful for right-aligning displays in monospace environments.
 * 
 * @param str - The value to pad
 * @param pad - The target length (default: 6)
 * @returns The right-aligned padded string
 */
export const padString = (str: string | number | bigint, pad = 6) =>
	(isNumeric(str) ? asNumber(str).toFixed(2).toString() : str.toString() ?? '').padStart(pad, '\u00A0');

/** 
 * Reconstructs a string from an array of char codes.
 * Useful for hiding strings from minifiers and reverse-engineers.
 * 
 * @param codes - The array of character codes
 * @returns The reconstructed string
 * @example
 * ```ts
 * reveal([104, 105]); // 'hi'
 * ```
 */
export const reveal = (codes: number[]): string => codes.map(c => String.fromCharCode(c)).join('');

/**
 * Converts a string into an array of char codes.
 * Useful as a developer utility to generate arrays to paste into `reveal()`.
 * 
 * @param str - The string to conceal
 * @returns An array of character codes
 * @example
 * ```ts
 * conceal('hi'); // [104, 105]
 * ```
 */
export const conceal = (str: string): number[] => str.split('').map(c => c.charCodeAt(0));

