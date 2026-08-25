export type JSONCReviver = (this: any, key: string, value: any) => any;

export interface JSONCOptions<T = any> {
	reviver?: JSONCReviver;
	fallback?: T;
	safe?: boolean;
}

/**
 * Strips single-line (`//`) and multi-line (`/* ... *\/`) comments and trailing commas from a JSONC string.
 * Preserves URLs and slashes within quoted strings.
 * 
 * @param text - The JSONC formatted string to strip
 * @returns Cleaned JSON string ready for `JSON.parse`
 * @example
 * ```ts
 * const cleanJson = stripJSONC('{\n  // comment\n  "key": "value",\n}');
 * ```
 */
export function stripJSONC(text: string): string {
	if (typeof text !== 'string')
		throw new TypeError('Expected string input to stripJSONC');

	let inString = false;
	let stringChar = '';
	let escaped = false;
	let result = '';
	const len = text.length;

	for (let i = 0; i < len; i++) {
		const char = text[i];
		const next = text[i + 1];

		if (inString) {
			result += char;
			if (escaped)
				escaped = false;
			else if (char === '\\')
				escaped = true;
			else if (char === stringChar)
				inString = false;
			continue;
		}

		if (char === '"' || char === "'") {
			inString = true;
			stringChar = char;
			result += char;
			continue;
		}

		// Single-line comment: // ...
		if (char === '/' && next === '/') {
			i += 2;
			while (i < len && text[i] !== '\n' && text[i] !== '\r')
				i++;
			if (i < len) result += text[i];
			continue;
		}

		// Multi-line comment: /* ... */
		if (char === '/' && next === '*') {
			i += 2;
			while (i < len && !(text[i] === '*' && text[i + 1] === '/'))
				i++;
			i++; // skip closing '/'
			continue;
		}

		result += char;
	}

	// Quote-aware removal of trailing commas before } or ]
	let inQuote = false;
	let quoteChar = '';
	let esc = false;
	let output = '';
	const rLen = result.length;

	for (let i = 0; i < rLen; i++) {
		const char = result[i];

		if (inQuote) {
			output += char;
			if (esc)
				esc = false;
			else if (char === '\\')
				esc = true;
			else if (char === quoteChar)
				inQuote = false;
			continue;
		}

		if (char === '"' || char === "'") {
			inQuote = true;
			quoteChar = char;
			output += char;
			continue;
		}

		if (char === ',') {
			let j = i + 1;
			while (j < rLen && (result[j] === ' ' || result[j] === '\t' || result[j] === '\n' || result[j] === '\r'))
				j++;
			if (j < rLen && (result[j] === '}' || result[j] === ']'))
				continue;
		}

		output += char;
	}

	return output;
}

/**
 * Zero-dependency parser for JSON and JSONC (JSON with comments & trailing commas).
 * Supports standard reviver callbacks or options objects for safe parsing with fallbacks.
 * 
 * @param text - The JSON or JSONC string to parse
 * @param optionsOrReviver - Optional reviver function or JSONCOptions object
 * @returns The parsed JavaScript object or fallback value
 * @example
 * ```ts
 * const config = parseJSONC<{ mode: string }>('{\n  // Mode setting\n  "mode": "fallback",\n}');
 * const safe = parseJSONC(malformedText, { fallback: { mode: 'default' } });
 * ```
 */
export function parseJSONC<T = any>(
	text: string,
	options: { safe: true; fallback?: undefined; reviver?: JSONCReviver }
): T | undefined;
export function parseJSONC<T = any>(
	text: string,
	options: { fallback: T; safe?: boolean; reviver?: JSONCReviver }
): T;
export function parseJSONC<T = any>(
	text: string,
	optionsOrReviver?: JSONCReviver | JSONCOptions<T>
): T;
export function parseJSONC<T = any>(
	text: string,
	optionsOrReviver?: JSONCReviver | JSONCOptions<T>,
): T | undefined {
	const isFn = typeof optionsOrReviver === 'function';
	const reviver = isFn ? optionsOrReviver : optionsOrReviver?.reviver;
	const isSafe = !isFn && (optionsOrReviver?.safe === true || (optionsOrReviver != null && 'fallback' in optionsOrReviver));
	const fallback = !isFn ? optionsOrReviver?.fallback : undefined;

	try {
		return JSON.parse(stripJSONC(text), reviver);
	} catch (error) {
		if (isSafe) return fallback as T;
		throw error;
	}
}

/**
 * Tests if a given value is a valid JSON or JSONC formatted string without throwing.
 * 
 * @param text - The value to evaluate
 * @returns True if the input is a valid JSON or JSONC string
 * @example
 * ```ts
 * isJSON('{"valid": true}'); // true
 * isJSON('not json'); // false
 * ```
 */
export function isJSON(text: unknown): text is string {
	if (typeof text !== 'string' || text.trim().length === 0) return false;
	try {
		JSON.parse(stripJSONC(text));
		return true;
	} catch {
		return false;
	}
}

/**
 * Creates a raw JSON representation that is embedded verbatim (unquoted) during serialization.
 * Leverages native `JSON.rawJSON` (ES2024 / Node 21+) when available, with a fallback for older environments.
 * 
 * @param text - The raw JSON string
 * @returns The raw JSON object
 * @example
 * ```ts
 * const raw = rawJSON('12345678901234567890');
 * ```
 */
export function rawJSON(text: string): object {
	if (typeof text !== 'string')
		throw new TypeError('Expected string input to rawJSON');

	if (typeof (JSON as any).rawJSON === 'function')
		return (JSON as any).rawJSON(text);

	throw new Error('Native JSON.rawJSON is not supported in this environment');
}

/**
 * Asserts whether a value is a raw JSON object produced by `rawJSON` or `JSON.rawJSON`.
 * 
 * @param obj - The value to inspect
 * @returns True if the value is a raw JSON object
 * @example
 * ```ts
 * isRawJSON(rawJSON('123')); // true
 * ```
 */
export function isRawJSON(obj: unknown): boolean {
	if (typeof (JSON as any).isRawJSON === 'function')
		return (JSON as any).isRawJSON(obj);

	return typeof obj === 'object' && obj !== null && 'rawJSON' in obj && typeof (obj as any).rawJSON === 'string';
}

/**
 * Returns a JSON-clean copy of an object by stringifying and re-parsing.
 * This inherently removes unsupported values like functions and `undefined`.
 * 
 * @param obj - The object to clean
 * @returns A clean, JSON-compatible object
 * @example
 * ```ts
 * const clean = cleanify({ a: 1, b: undefined }); // { a: 1 }
 * ```
 */
export function cleanify<T>(obj: T): T {
	try {
		return JSON.parse(JSON.stringify(obj)) as T;						// run any toString() methods
	} catch (error) {
		console.warn('Could not clean object:', (error as Error)?.message ?? error);
		throw error;
	}
}
