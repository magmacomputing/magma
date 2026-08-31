import { curry } from '#library/function.library.js';
import { ownKeys, ownValues, ownEntries } from '#library/primitive.library.js';
import { cleanify } from '#library/json.library.js';

import { asType } from '#library/type.library.js';
import { isType, isEmpty, isDefined, isUndefined, isNullish, isString, isObject, isArray, isFunction, isSymbolFor, isSymbol } from '#library/assertion.library.js';
import { sym } from '#library/symbol.library.js';
import type { Obj, Type } from '#library/type.library.js';

/**
 * Global registry mapping class names to their constructors for serialization/deserialization.
 */
export const Registry = (globalThis as any)[sym.$SerializerRegistry] ??= new Map<string, Function>();

/**
 * Registers a Class for custom serialization and deserialization.
 * 
 * @param name - The string identifier for the class (automatically prefixed with '$' if missing)
 * @param cls - The class constructor to register
 * @example
 * ```ts
 * registerSerializable('MyClass', MyClass);
 * ```
 */
export const registerSerializable = (name: string, cls: Function) => {
	const key = name.startsWith('$') ? name : `$${name}`;

	if (Registry.has(key)) {
		const existingCls = Registry.get(key);
		const existingTag = (existingCls as any)?.[Symbol.toStringTag];
		const clsTag = (cls as any)?.[Symbol.toStringTag];

		if (
			existingCls === cls ||
			existingCls?.toString() === cls.toString() ||
			(cls.name && existingCls?.name === cls.name) ||
			(existingTag && existingTag === clsTag)
		) {
			return; // Silently allow idempotent dual-registration across monorepo bundles
		}
		throw new Error(`[registerSerializable] Collision: '${key}' is already registered with ${existingCls?.name || 'anonymous constructor'}`);
	}

	Registry.set(key, cls);
}

// be aware that 'structuredClone' preserves `<undefined>` values...  
// and JSON.stringify() does not

/**
 * Performs a deep copy using the native `structuredClone` (if available), 
 * falling back to a `cleanify` JSON strategy otherwise.
 * 
 * @param obj - The object to clone
 * @param opts - Optional structuredClone transfer options
 * @returns A deep copy of the object
 * @example
 * ```ts
 * const copy = clone(original);
 * ```
 */
export function clone<T>(obj: T, opts?: { transfer: any[] }) {
	try {
		return globalThis.structuredClone(obj, opts);
	} catch {
		return cleanify(obj);																		// fallback to JSON functions
	}
}

/**
 * Deep-copies an Object, optionally replacing `<undefined>` fields 
 * with a Sentinel function call. Leverages `stringify` and `objectify`.
 * 
 * @param obj - The object to cloneify
 * @param sentinel - An optional function to handle reconstructed undefined values
 * @returns The deep-copied object
 * @example
 * ```ts
 * const safeCopy = cloneify(original, () => null);
 * ```
 */
export function cloneify<T>(obj: T, sentinel?: Function): T {
	try {
		return objectify(stringify(obj), sentinel) as T;
	} catch (error) {
		console.warn('Could not cloneify object: ', obj);
		console.warn('stack: ', (error as Error).stack);
		return obj;
	}
}

function replacer(key: string, obj: any): any { return isEmpty(key) ? obj : stringize(obj) }
function reviver(_key: string, val: any): any { return decode(val) }

// safe-characters [sp " ; < > [ ] ^ { | }]
const SAFE_URI_MAP: Record<string, string> = {
	'%20': ' ', '%22': '"', '%3B': ';', '%3C': '<', '%3E': '>',
	'%5B': '[', '%5D': ']', '%5E': '^', '%7B': '{', '%7C': '|', '%7D': '}',
} as const;
const RE_SAFE_URI_CODES = new RegExp(Object.keys(SAFE_URI_MAP).join('|'), 'gi');

/** encode control characters, then replace a safe-subset back to text-string */
function encode(val: string) {
	let enc = encodeURI(val);

	if (enc.includes('%'))
		enc = enc.replace(RE_SAFE_URI_CODES, match => SAFE_URI_MAP[match.toUpperCase()] ?? decodeURI(match));

	return enc;
}

/** decode control characters */
function decode(val: string) {
	if (isString(val)) {
		try {
			return decodeURI(val);																// might fail if badly encoded '%'
		} catch (error) {
			// console.warn(`decodeURI: ${(error as Error).message} -> ${val}`);
		}
	}

	return val;																								// return original value
}

/** check type can be stringify'd */
function isStringable(val: unknown): boolean {
	return !isType(val, 'Function', 'AsyncFunction', 'WeakMap', 'WeakSet', 'WeakRef');
}

/** string representation of a single key:value Object */
function oneKey(type: Type, value: string) {
	return `{"$${type}":${value}}`;
}

/** Symbols in an Object-key will need special treatment */
function fromSymbol(key: PropertyKey) {
	return stringize(isSymbol(key)														// @@(name) for global, @(name) for local symbols
		? `${isSymbolFor(key) ? '@' : ''}@(${key.description ?? ''})`
		: key)
}

const symKey = /^@(@)?\(([^\)]*)\)$/;												// pattern to match a stringify'd Symbol

/** reconstruct a Symbol from a string-representation of a key */
function toSymbol(value: PropertyKey) {
	const [pat, keyFor, desc] = value.toString().match(symKey) || [null, undefined, undefined];

	switch (true) {
		case isSymbol(value):																		// already a Symbol
		case isNullish(pat):																		// incorrectly encoded Symbol
		case isDefined(keyFor) && isUndefined(desc):						// incorrectly encoded global Symbol
			return value;

		case isDefined(keyFor):																	// global Symbol
			return Symbol.for(desc!);

		case isUndefined(keyFor):																// local Symbol
		default:
			return Symbol(desc);
	}
}

/**
 * For items which are not currently serializable via standard JSON.stringify (Undefined, BigInt, Set, Map, Symbol, etc.)  
 * this creates a stringified, single key:value Object to represent the value; for example  '{ "$BigInt": 123 }'  
 * 
 * Drawbacks:  
 * no support Function / WeakMap / WeakSet / WeakRef  
 * limited support for user-defined Classes (must be specifically registered with @Serialize() decorator)
 */

/**
 * Serializes objects for string-safe stashing in WebStorage, Cache, etc.
 * Uses `JSON.stringify` where available, else returns a stringified 
 * single key:value object (e.g., `{ "$BigInt": "123" }`) for custom types.
 * 
 * @param obj - The object to stringify
 * @returns The safely stringified representation
 * @example
 * ```ts
 * stringify(123n); // '{"$BigInt":"123"}'
 * ```
 */
export function stringify<T>(obj: T) {
	return stringize(obj, false);
}

/**
 * internal function to process stringify-requests (and hide second parameter)  
 * where first argument is the object to stringify, and  
 * the second argument is a boolean to indicate if function is being called recursively
 */
function stringize<T>(obj: T, recurse = true): string {			// hide the second parameter: for internal use only
	const arg = asType(obj);
	const one = curry(oneKey)(arg.type);											// curry the oneKey() function

	switch (arg.type) {
		case 'String':
			if (!recurse) {																				// if a top-level string (e.g. 'true' or '1234')
				recurse = arg.value === 'true'											// ensure true|false|null|1234 are quoted by JSON.stringify
					|| arg.value === 'false'													// so they will be correctly identified during objectify()
					|| arg.value === 'null'
					|| parseFloat(arg.value).toString() === arg.value
			}

			return recurse
				? JSON.stringify(encode(arg.value))									// encode string for safe-storage
				: encode(arg.value);																// dont JSON.stringify a top-level string

		case 'Boolean':
		case 'Null':
		case 'Number':
			return JSON.stringify(arg.value);											// JSON.stringify will correctly handle these

		case 'Void':
		case 'Undefined':
			return one(JSON.stringify('void'));										// preserve 'undefined' values		

		case 'BigInt':
			return one(arg.value.toString());											// even though BigInt has a toString method, it is not supported in JSON.stringify

		case 'Object': {
			const obj = ownEntries(arg.value)
				.filter(([, val]) => isStringable(val))
				.map(([key, val]) => `${fromSymbol(key)}: ${stringize(val)}`)
				.join(',');
			return `{${obj}}`;
		}

		case 'Array': {
			const arr = arg.value
				.filter(val => isStringable(val))
				.map(val => stringize(val))
				.join(',');
			return `[${arr}]`;
		}

		case 'Map': {
			const map = Array.from(arg.value.entries())
				.filter(([, val]) => isStringable(val))
				.map(([key, val]) => `[${stringize(key)}, ${stringize(val)}]`)
				.join(',');
			return one(`[${map}]`);
		}

		case 'Set': {
			const set = Array.from(arg.value.values())
				.filter(val => isStringable(val))
				.map(val => stringize(val))
				.join(',');
			return one(`[${set}]`);
		}

		case 'Symbol':
			return one(fromSymbol(arg.value));

		case 'RegExp':
			return one(stringize({ source: arg.value.source, flags: arg.value.flags }));

		case 'Class':
		default: {
			const value = arg.value as any;
			switch (true) {
				case !isStringable(value):													// Object is not stringify-able
					return undefined as unknown as string;

				case isFunction(value.toJSON):											// Object has its own toJSON method
					return one(stringize(value.toJSON(), /** replacer */));

				case isFunction(value.toString): {									// Object has its own toString method
					const str = value.toString();
					return one(str.includes('"')											// TODO: improve detection of JSON vs non-JSON strings
						? str
						: JSON.stringify(str));
				}

				case isFunction(value.valueOf):											// Object has its own valueOf method		
					return one(JSON.stringify(value.valueOf()));

				default:																						// else standard stringify
					return one(JSON.stringify(value, replacer));
			}
		}
	}
}

/**
 * Rebuilds an Object from its `stringify`'d string representation.
 * Handles custom single key:value type definitions automatically.
 * 
 * @param str - The string to parse
 * @param sentinel - Optional function to handle reconstructing undefined/void values
 * @returns The deserialized object or original string if parsing fails
 * @example
 * ```ts
 * const obj = objectify('{"$BigInt":"123"}'); // 123n
 * ```
 */
export function objectify<T>(str: any, sentinel?: Function): T {
	if (!isString(str))
		return str;																							// skip parsing

	let parse: any;
	try {
		parse = JSON.parse(str, reviver);												// catch if cannot parse
	} catch (error) {
		if (str.startsWith('"') && str.endsWith('"')) {
			console.warn(`objectify.parse: -> ${str}, ${(error as Error).message}`);
			return str as unknown as T;														// bail-out
		}
		else return objectify(`"${str}"`, sentinel);						// have another try, quoted
	}

	switch (true) {
		case str.startsWith('{') && str.endsWith('}'):					// looks like Object
		case str.startsWith('[') && str.endsWith(']'):					// looks like Array
			return traverse(parse, sentinel);											// recurse into object

		default:
			return parse;
	}
}

/** recurse into Object / Array, looking for special single key:value Objects */
function traverse(obj: Obj, sentinel?: Function): any {
	if (isObject(obj)) {
		return typeify(ownEntries(obj)
			.reduce((acc, [key, val]) => Object.assign(acc, { [toSymbol(key)]: typeify(traverse(val, sentinel)) }), {}),
			sentinel
		)
	}

	if (isArray(obj)) {
		return ownValues(obj)
			.map(val => typeify(traverse(val, sentinel)))
	}

	return obj;
}

/** rebuild an Object from its single key:value representation */
function typeify(json: any, sentinel?: Function) {
	if (!isObject(json) || ownKeys(json).length !== 1)
		return json;																						// only JSON Objects, with a single key:value pair

	const [$type, value] = ownEntries(json)[0] as unknown as [`$${Type}`, any];
	if (!String($type).startsWith('$'))
		return json;																						// not a serialized single key:value Object
	const type = $type.substring(1) as Type;									// remove '$' prefix

	try {
		switch (type) {
			case 'String':
			case 'Boolean':
			case 'Object':
			case 'Array':
				return value;																					// these types are already handled by traverse()

			case 'Number':
				return Number(value);
			case 'BigInt':
				return BigInt(value);
			case 'Null':
				return null;

			case 'Undefined':
			case 'Empty':
			case 'Void':
				return sentinel?.();																	// run Sentinel function to handle undefined values

			case 'Date':
				return new Date(value);
			case 'RegExp':
				if (!isObject(value) || !isString(value.source)) return json;
				return new RegExp(value.source, value.flags);
			case 'Symbol':
				return toSymbol(value);
			case 'Map':
				if (!isArray(value)) return json;
				return new Map(value);
			case 'Set':
				if (!isArray(value)) return json;
				return new Set(value);

			default:
				const cls = Registry.get($type);											// lookup registered Class

				if (!cls) {
					console.warn(`objectify: dont know how to deserialize '${type}'`);
					return json;																				// return original JSON object
				}

				return Reflect.construct(cls, [value]);								// create new Class instance
		}
	} catch {
		return json;
	}
}

