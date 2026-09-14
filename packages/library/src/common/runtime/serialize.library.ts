import { curry } from '#library/function.library.js';
import { ownKeys, ownValues, ownEntries } from '#library/primitive.library.js';
import { cleanify } from '#library/json.library.js';

import { asType } from '#library/type.library.js';
import { isType, isEmpty, isDefined, isUndefined, isNullish, isString, isObject, isArray, isFunction, isSymbolFor, isSymbol, isSafeKey, isNumeric } from '#library/assertion.library.js';
import { sym } from '#library/symbol.library.js';
import type { Obj, Type } from '#library/type.library.js';

/**
 * Global registry mapping class names to their constructors for serialization/deserialization.
 * 
 * @security Only register trusted classes whose constructors are free of harmful side effects.
 * Deserializing via `objectify` will invoke constructors via `Reflect.construct` with deserialized arguments.
 */
export const Registry = (globalThis as any)[sym.$SerializerRegistry] ??= new Map<string, Function>();

const getSafeTag = (c: any): string | undefined => {
	try {
		const tag = c?.prototype?.[Symbol.toStringTag] ?? c?.[Symbol.toStringTag];
		return isString(tag) ? tag : undefined;
	} catch {
		return undefined;
	}
}

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
		const existingCls = Registry.get(key)!;
		const existingTag = getSafeTag(existingCls);
		const clsTag = getSafeTag(cls);

		const existingName = existingCls.name || existingTag;
		const currentName = cls.name || clsTag || (name.startsWith('$') ? name.slice(1) : name);

		const isSameConstructor =
			existingCls === cls ||
			existingCls.toString() === cls.toString() ||
			(Boolean((cls as any)[sym.$Identity]) && (existingCls as any)[sym.$Identity] === (cls as any)[sym.$Identity]) ||
			(Boolean((cls as any)[sym.$Target]) && (existingCls as any)[sym.$Target] === (cls as any)[sym.$Target]) ||
			(Boolean(existingName) && Boolean(currentName) && existingName === currentName);

		if (isSameConstructor)
			return; // Idempotent registration of identical constructor across monorepo bundles

		throw new Error(`[registerSerializable] Collision: '${key}' is already registered with ${existingCls.name || 'anonymous constructor'}`);
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

/** JSON.stringify replacer function that delegates to stringize for custom type handling */
function replacer(key: string, obj: any): any { return isEmpty(key) ? obj : stringize(obj) }
/** JSON.parse reviver function that decodes URI-encoded control characters */
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

const RUNTIME_SALT = globalThis.crypto?.randomUUID
	? globalThis.crypto.randomUUID().split('-')[0]
	: Math.random().toString(36).slice(2, 10);

/**
 * Computes a fast, synchronous 64-bit keyed hash of a string payload.
 *
 * @param str - The string to hash
 * @param secret - Optional secret key or salt (defaults to an ephemeral runtime salt)
 * @returns A 16-character hex string digest
 */
export const fastDigest = (str: string, secret = RUNTIME_SALT): string => {
	let h1 = 0x811c9dc5;
	let h2 = 0x9e3779b9;
	const input = `${secret}:${str}`;
	for (let i = 0; i < input.length; i++) {
		const c = input.charCodeAt(i);
		h1 = Math.imul(h1 ^ c, 0x01000193);
		h2 = Math.imul(h2 ^ c, 0x85ebca6b);
	}
	return (h1 >>> 0).toString(16).padStart(8, '0') + (h2 >>> 0).toString(16).padStart(8, '0');
};

/**
 * Configuration options for `stringify()` serialization.
 */
export interface StringifyOptions {
	/** If true, wraps the output with a tamper-evident signature prefix ($sig:<digest>:<payload>) */
	signed?: boolean;
	/** Optional secret key or salt for signature calculation (defaults to an ephemeral runtime salt) */
	secret?: string;
	/** If false, uses legacy oneKey object envelopes instead of compact tagged strings (default: true) */
	compact?: boolean;
}

let activeCompact = true;

/**
 * Serializes objects for string-safe stashing in WebStorage, Cache, etc.
 * Uses compact tagged strings (`~n`, `~t`, `~u`, `~y`) by default for primitive types,
 * or oneKey object envelopes when `compact: false`.
 * 
 * @param obj - The object to stringify
 * @param options - Optional serialization options (e.g. `{ signed: true, compact: true }`)
 * @returns The safely stringified representation
 * @example
 * ```ts
 * stringify(123n); // '"~n123"'
 * stringify(new Date()); // '"~t1704067200000"'
 * stringify(Symbol.for('app')); // '"~y@@(app)"'
 * stringify(data, { signed: true }); // '$sig:e8b7...:{"id":"~n123"}'
 * ```
 */
export function stringify<T>(obj: T, options?: StringifyOptions): string {
	const prevCompact = activeCompact;
	activeCompact = options?.compact !== false;
	try {
		const str = stringize(obj, false);
		if (options?.signed)
			return `$sig:${fastDigest(str, options.secret)}:${str}`;
		return str;
	} finally {
		activeCompact = prevCompact;
	}
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
		case 'String': {
			let strVal = arg.value;
			if (activeCompact && strVal.startsWith('~'))
				strVal = `~${strVal}`;

			if (!recurse) {																				// if a top-level string (e.g. 'true' or '1234')
				recurse = strVal === 'true'													// ensure true|false|null|1234 are quoted by JSON.stringify
					|| strVal === 'false'															// so they will be correctly identified during objectify()
					|| strVal === 'null'
					|| parseFloat(strVal).toString() === strVal
					|| (activeCompact && strVal.startsWith('~'));
			}

			return recurse
				? JSON.stringify(encode(strVal))										// encode string for safe-storage
				: encode(strVal);																		// dont JSON.stringify a top-level string
		}

		case 'Boolean':
		case 'Null':
		case 'Number':
			return JSON.stringify(arg.value);											// JSON.stringify will correctly handle these

		case 'Void':
		case 'Undefined':
			return activeCompact
				? JSON.stringify('~u')
				: one(JSON.stringify('void'));											// preserve 'undefined' values		

		case 'BigInt':
			return activeCompact
				? JSON.stringify(`~n${arg.value.toString()}`)
				: one(arg.value.toString());												// even though BigInt has a toString method, it is not supported in JSON.stringify

		case 'Date':
			return activeCompact
				? JSON.stringify(`~t${arg.value.getTime()}`)
				: one(stringize(arg.value.toJSON()));

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

		case 'Symbol': {
			const symStr = `${isSymbolFor(arg.value) ? '@' : ''}@(${arg.value.description ?? ''})`;
			return activeCompact
				? JSON.stringify(`~y${symStr}`)
				: one(JSON.stringify(symStr));
		}

		case 'RegExp':
			return one(stringize({ source: arg.value.source, flags: arg.value.flags }));

		case 'Class':
		default: {
			const value = arg.value as any;
			switch (true) {
				case !isStringable(value):													// Object is not stringify-able
					return undefined as unknown as string;

				case isFunction(value.toJSON):											// Object has its own toJSON method
					return one(stringize(value.toJSON()));

				case isFunction(value.toString): {									// Object has its own toString method
					const str = value.toString();
					return one(str.includes('"')											// TODO: improve detection of JSON vs non-JSON strings
						? str
						: JSON.stringify(str));
				}

				case isFunction(value.valueOf):											// Object has its own valueOf method		
					return one(JSON.stringify(value.valueOf()));

				default:																						// else standard stringify
					return one(JSON.stringify(value, (key: string, o: any) => isEmpty(key) ? o : stringize(o)));
			}
		}
	}
}

/**
 * Configuration options for `objectify()` deserialization.
 */
export interface ObjectifyOptions {
	/** Optional function to handle reconstructing undefined/void values */
	sentinel?: Function;
	/** Whether to allow instantiation of registered classes via Registry (default: true) */
	allowClasses?: boolean;
	/** Optional allowlist of permitted registered class names (matched with or without leading '$') */
	allowedClasses?: string[] | Set<string>;
	/** Whether to reconstruct RegExp instances (default: true) */
	allowRegExp?: boolean;
	/** Maximum object traversal nesting depth to prevent call-stack exhaustion (default: 64) */
	maxDepth?: number;
	/** If true, requires that the string has a valid signature, rejecting unsigned strings (default: false) */
	requireSigned?: boolean;
	/** Optional secret key or salt to verify the signature against (defaults to the runtime salt) */
	secret?: string;
}

const MAX_TRAVERSE_DEPTH = 64;
const MAX_REGEXP_SOURCE_LENGTH = 512;

/**
 * Rebuilds an Object from its `stringify`'d string representation.
 * Handles custom single key:value type definitions automatically.
 * 
 * @security TRUST BOUNDARY WARNING
 * `objectify()` is an ACTIVE deserializer designed for internal state persistence
 * (e.g. WebStorage, internal caching, trusted worker IPC).
 * 
 * Do NOT use `objectify()` on untrusted or external strings (e.g. HTTP request bodies,
 * unverified tokens, public webhooks):
 * - Insecure Deserialization (CWE-502): Can instantiate registered classes via `Reflect.construct`.
 * - Type Confusion: May produce BigInt, Date, or Map where plain JSON values are expected.
 * - Global Symbol Pollution: Encoded symbols register into `Symbol.for()`.
 * 
 * When dealing with semi-trusted strings, configure `ObjectifyOptions`:
 * set `allowClasses: false` (or specify an `allowedClasses` allowlist), `maxDepth`,
 * or enforce signature checking with `requireSigned: true`.
 * For completely untrusted external input, use native `JSON.parse()` with schema validation instead.
 * 
 * @param str - The string to parse
 * @param optionsOrSentinel - Optional configuration options or a sentinel function for undefined values
 * @returns The deserialized object or original string if parsing fails
 * @example
 * ```ts
 * const obj = objectify('{"$BigInt":"123"}'); // 123n
 * const safe = objectify(input, { allowClasses: false, maxDepth: 10 });
 * const trusted = objectify(input, { requireSigned: true });
 * ```
 */
export function objectify<T>(str: any, optionsOrSentinel?: Function | ObjectifyOptions): T {
	if (!isString(str))
		return str;																							// skip parsing

	const options: ObjectifyOptions = isFunction(optionsOrSentinel)
		? { sentinel: optionsOrSentinel }
		: (optionsOrSentinel ?? {});

	if (str.startsWith('$sig:')) {
		const secondColon = str.indexOf(':', 5);
		if (secondColon !== -1) {
			const sig = str.substring(5, secondColon);
			const payload = str.substring(secondColon + 1);
			const expectedSig = fastDigest(payload, options.secret);
			if (sig !== expectedSig) {
				console.warn('objectify: signature verification failed');
				return str as unknown as T;
			}
			str = payload;
		} else if (options.requireSigned) {
			console.warn('objectify: malformed signed payload');
			return str as unknown as T;
		}
	} else if (options.requireSigned) {
		console.warn('objectify: unsigned string rejected by requireSigned policy');
		return str as unknown as T;
	}

	let parse: any;
	try {
		parse = JSON.parse(str, reviver);												// catch if cannot parse
	} catch (error) {
		if (str.startsWith('"') && str.endsWith('"')) {
			console.warn(`objectify.parse: -> ${str}, ${(error as Error).message}`);
			return str as unknown as T;														// bail-out
		}
		else return objectify(`"${str}"`, options);							// have another try, quoted
	}

	switch (true) {
		case str.startsWith('{') && str.endsWith('}'):					// looks like Object
		case str.startsWith('[') && str.endsWith(']'):					// looks like Array
			return traverse(parse, options, 0);										// recurse into object

		default:
			return typeify(parse, options);
	}
}

/** recurse into Object / Array, looking for special single key:value Objects */
function traverse(obj: Obj, options: ObjectifyOptions, depth = 0): any {
	const maxDepth = options.maxDepth ?? MAX_TRAVERSE_DEPTH;
	if (depth >= maxDepth)
		return obj;

	if (isObject(obj)) {
		return typeify(ownEntries(obj)
			.filter(([key]) => isSafeKey(key))
			.reduce((acc, [key, val]) => Object.assign(acc, { [toSymbol(key)]: typeify(traverse(val, options, depth + 1), options) }), {}),
			options
		);
	}

	if (isArray(obj)) {
		return ownValues(obj)
			.map(val => typeify(traverse(val, options, depth + 1), options));
	}

	return typeify(obj, options);
}

/** rebuild an Object from its single key:value representation */
function typeify(json: any, options: ObjectifyOptions) {
	if (isString(json) && json.startsWith('~')) {
		if (json.startsWith('~~')) return json.substring(1);
		if (json.startsWith('~n')) return BigInt(json.substring(2));
		if (json.startsWith('~t')) {
			const timeVal = json.substring(2);
			return new Date(isNumeric(timeVal) ? Number(timeVal) : timeVal);
		}
		if (json === '~u') return options.sentinel?.();
		if (json.startsWith('~y')) return toSymbol(json.substring(2));
	}

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
				return value;																				// these types are already handled by traverse()

			case 'Number':
				return Number(value);
			case 'BigInt':
				return BigInt(value);
			case 'Null':
				return null;

			case 'Undefined':
			case 'Empty':
			case 'Void':
				return options.sentinel?.();												// run Sentinel function to handle undefined values

			case 'Date':
				return new Date(value);
			case 'RegExp':
				if (options.allowRegExp === false) return json;
				if (!isObject(value) || !isString(value.source) || value.source.length > MAX_REGEXP_SOURCE_LENGTH) return json;
				return new RegExp(value.source, value.flags);
			case 'Symbol':
				return toSymbol(value);
			case 'Map':
				if (!isArray(value)) return json;
				return new Map(value);
			case 'Set':
				if (!isArray(value)) return json;
				return new Set(value);

			default: {
				if (options.allowClasses === false)
					return json;

				if (options.allowedClasses) {
					const allowed = options.allowedClasses instanceof Set
						? options.allowedClasses.has($type) || options.allowedClasses.has(type)
						: options.allowedClasses.includes($type) || options.allowedClasses.includes(type);
					if (!allowed) return json;
				}

				const cls = Registry.get($type);											// lookup registered Class

				if (!cls) {
					console.warn(`objectify: dont know how to deserialize '${type}'`);
					return json;																				// return original JSON object
				}

				return Reflect.construct(cls, [value]);								// create new Class instance
			}
		}
	} catch {
		return json;
	}
}

