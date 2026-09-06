import { sym } from '#library/symbol.library.js';
import { allObject } from '#library/reflection.library.js';
import { deepFreeze } from '#library/utility.library.js';
import { unwrap } from '#library/primitive.library.js';
import { isString, isFunction, isSymbol, isDefined, isNumber, isObject } from '#library/assertion.library.js';
import { registerType, type Constructor, type Evaluated } from '#library/type.library.js';

const boundMethodCache = new WeakMap<Function, WeakMap<object, Function>>();

/** internal options for the unified proxy engine */
export type ProxyOptions = {
	frozen?: boolean;																					// read-only Proxy (throws on set/delete)
	lock?: boolean;																						// deep-freeze the target object
	appendOnly?: boolean;																			// allow adding properties, but not changing existing ones
	onGet?: (key: string | symbol, target: any) => any;				// callback for property discovery
	keys?: (string | symbol)[];																// fixed set of keys (for virtual objects)
	bind?: boolean;																						// bind methods to the target
	skip?: WeakSet<object>;																		// objects to skip during deep-freeze
}

/**
 * The unified internal engine for all Proxy creation in the library.
 * Handles unwrapping, Proxy invariants, discovery, and security mechanisms.
 *
 * @param target - The object to wrap in a Proxy
 * @param options - Configuration options for proxy behavior
 * @param isRevocable - If true, returns { proxy, revoke } using Proxy.revocable
 * @returns The proxified object with configured behavior, or { proxy, revoke } when isRevocable is true
 * @internal
 */
function factory<T extends object>(target: T, options: ProxyOptions = {}, isRevocable = false): any {
	const { frozen, lock, appendOnly, onGet, keys, bind, skip } = options;
	const pending = new Set<PropertyKey>();
	let cachedJSON: any;
	let result: any;

	// 1. Unwrap recursive proxies and resolve the true target
	const tgt = unwrap(target);

	// 2. Harden the target if requested
	if (lock) deepFreeze(tgt, skip ? { skip } : undefined);
	registerType(tgt as Constructor);

	const handler: ProxyHandler<any> = {
		isExtensible: (t) => Reflect.isExtensible(t),
		getPrototypeOf: (t) => Reflect.getPrototypeOf(t),
		setPrototypeOf: (t, proto) => {
			if (frozen) throw new TypeError('Security: Prototype mutation attempt on protected object');
			return Reflect.setPrototypeOf(t, proto);
		},

		getOwnPropertyDescriptor: (t, k) => {
			if (keys && !keys.includes(k)) return undefined;
			if (keys) {
				if (onGet && !isSymbol(k) && !pending.has(k)) {
					pending.add(k);
					try {
						const value = onGet(k, t);
						if (isDefined(value)) return { enumerable: true, configurable: true, value };
					} finally {
						pending.delete(k);
					}
				}
				return { enumerable: true, configurable: true };
			}
			return Reflect.getOwnPropertyDescriptor(t, k);
		},

		ownKeys: (t) => {
			if (keys) return keys as string[];
			if (onGet && !pending.has(sym.$Discover)) {
				pending.add(sym.$Discover);
				try { onGet(sym.$Discover, t); } finally { pending.delete(sym.$Discover); }
			}
			return Reflect.ownKeys(t);
		},

		has: (t, k) => (keys ? keys.includes(k) : Reflect.has(t, k)),

		deleteProperty: (t, k) => {
			if (frozen) throw new TypeError(`Cannot delete property '${String(k)}' from a protected object.`);
			if (appendOnly && Reflect.has(t, k)) throw new Error(`Security: Deletion attempt on protected key '${String(k)}'`);
			return Reflect.deleteProperty(t, k);
		},

		defineProperty: (t, k, d) => {
			if (frozen && !Object.isFrozen(t)) throw new TypeError(`Cannot define property '${String(k)}' on a frozen object.`);
			if (appendOnly && Reflect.has(t, k)) throw new Error(`Security: Mutation attempt on protected key '${String(k)}'`);
			return Reflect.defineProperty(t, k, d);
		},

		set: (t, k, v, r) => {
			if (frozen && r === result) throw new TypeError(`Cannot set property '${String(k)}' on a frozen object.`);
			if (appendOnly) {
				const isTruncating = Array.isArray(t) && k === 'length' && v < t.length;
				if (isTruncating) throw new Error('Security: Truncation attempt on protected array.');
				if (!(Array.isArray(t) && k === 'length') && Reflect.has(t, k))
					throw new Error(`Security: Mutation attempt on protected key '${String(k)}'`);
			}
			return Reflect.set(t, k, v, r);
		},

		get: (t, k, r) => {
			if (k === sym.$Target) return r === result ? t : undefined;

			// Virtualization for serialization
			if (frozen && (k === sym.$Inspect || k === 'toJSON')) {
				const own = Object.getOwnPropertyDescriptor(t, k);
				if (own && isFunction(own.value)) return own.value;
				if (!cachedJSON) cachedJSON = () => allObject(t);
				return cachedJSON;
			}

			if (keys && !keys.includes(k)) return undefined;

			// Property Discovery
			if (onGet && !isSymbol(k) && !Reflect.has(t, k) && !pending.has(k)) {
				pending.add(k);
				try {
					const val = onGet(k, t);
					if (isDefined(val)) return val;
				} finally {
					pending.delete(k);
				}
			}

			const val = Reflect.get(t, k, r);
			if (bind && k !== 'constructor' && isFunction(val)) {
				const desc = Object.getOwnPropertyDescriptor(t, k);
				if (desc && !desc.configurable && !desc.writable) return val;
				let perTargetCache = boundMethodCache.get(val);
				if (!perTargetCache) {
					perTargetCache = new WeakMap<object, Function>();
					boundMethodCache.set(val, perTargetCache);
				}

				const cachedBound = perTargetCache.get(t);
				if (cachedBound) return cachedBound;
				const bound = val.bind(t);
				perTargetCache.set(t, bound);
				return bound;
			}
			return val;
		}
	};

	if (isRevocable) {
		const revocableResult = Proxy.revocable(tgt, handler);
		result = revocableResult.proxy;
		return { proxy: revocableResult.proxy as T, revoke: revocableResult.revoke };
	}

	result = new Proxy(tgt, handler) as T;
	return result;
}

/**
 * Creates a Stealth Proxy pattern to allow for on-demand lazy property discovery and registration.
 * Provides deep-freezing and bounding capabilities depending on options.
 * 
 * @param target - The object to proxify
 * @param frozen - Whether the proxy should throw on mutation (default: true)
 * @param lock - Whether to deep-freeze the underlying target (default: frozen)
 * @param skip - A WeakSet of objects to skip during deep-freeze
 * @returns The proxified object
 * @example
 * ```ts
 * const p = proxify({ a: 1 });
 * ```
 */
export function proxify<T extends object>(target: T, frozen = true, lock = frozen, skip = new WeakSet<object>()) {
	return factory(target, { frozen, lock, skip, bind: frozen });
}

/**
 * Creates a dynamic Proxy where property access is forwarded to a discovery callback.
 * Useful for virtual objects and lazy-loading data.
 * 
 * @param target - The base object
 * @param onGet - Callback fired when an unknown property is accessed
 * @param readonly - Whether the proxy should prevent mutations (default: true)
 * @returns The delegated Proxy
 * @example
 * ```ts
 * const d = delegate({}, (key) => console.log('Requested:', key));
 * ```
 */
export function delegate<T extends object>(target: T, onGet: (key: string | symbol, target: T) => any, readonly = true) {
	return factory(target, { onGet, frozen: readonly });
}

/**
 * Wraps an object in a protective Proxy that allows extension (adding new keys) 
 * but prevents modification or deletion of existing keys.
 * 
 * @param target - The object to secure
 * @returns The append-only secured Proxy
 * @example
 * ```ts
 * const ref = secureRef({ initial: 1 });
 * ```
 */
export function secureRef<T extends object>(target: T): T {
	return factory(target, { appendOnly: true });
}

/**
 * Deep-freezes an object and wraps it in a loudly-throwing read-only Proxy.
 * Provides the highest level of noisy immutability.
 * 
 * @param obj - The object to secure
 * @param skip - A WeakSet of objects to skip during deep-freeze
 * @returns The securely frozen Proxy
 * @example
 * ```ts
 * const safe = secure({ apiKey: '123' });
 * ```
 */
export function secure<const T extends object>(obj: T, skip = new WeakSet<object>()): T {
	return factory(obj, { frozen: true, lock: true, skip, bind: true });
}

/**
 * Creates a virtual Proxy where fixed keys are mapped to a callback function.
 * 
 * @param keys - The array of allowed keys (or an object whose ownKeys will be used)
 * @param fn - The callback fired when a key is accessed
 * @returns The virtual delegator object
 * @example
 * ```ts
 * const v = delegator(['a', 'b'], (key) => key.toUpperCase());
 * ```
 */
export function delegator<K extends string | symbol>(keys: readonly K[] | Record<K, any>, fn: (prop: K) => any): Record<K, any> {
	const keyList = Array.isArray(keys) ? keys : Reflect.ownKeys(keys) as K[];
	return factory({} as any, { keys: keyList, onGet: fn as any, frozen: true });
}

/**
 * Augments a standard array with a Proxy-based lookup delegate.
 * Allows index/enumerable array methods to function natively (e.g., map, filter, length),
 * while redirecting non-numeric string keys to a custom finder function to lookup items.
 * 
 * @param list - The array to augment
 * @param finder - The lookup function for non-numeric keys
 * @param readonly - Whether the array should be read-only (default: true)
 * @returns The augmented array with record-like string indexing
 * @example
 * ```ts
 * const arr = indexedArray([{ id: 'a' }], key => list.find(x => x.id === key));
 * arr['a']; // { id: 'a' }
 * ```
 */
export function indexedArray<T extends object>(
	list: T[],
	finder: (key: string) => T | undefined,
	readonly = true
): T[] & Record<string, T> {
	return delegate(list, (key) => {
		return (isString(key) && key !== 'length' && !(key in Array.prototype) && !isNumber(Number(key)))
			? finder(key)
			: undefined;
	}, readonly) as any;
}

/**
 * Creates a proxy that evaluates function-valued properties when they are read.
 *
 * @param target - The object whose properties are evaluated
 * @returns A proxy that invokes eligible function-valued properties with `target` as their receiver
 */
export function dynamicProxy<T extends object>(target: T): Evaluated<T> {
	if (!isObject(target)) return target as any;
	return new Proxy(target, {
		get(t, k, r) {
			if (k === sym.$Target) return t;
			const val = Reflect.get(t, k, r);
			if (!isFunction(val) || isSymbol(k) || k === 'constructor')
				return val;
			const desc = Reflect.getOwnPropertyDescriptor(t, k);
			if (desc && !desc.configurable && !desc.writable)
				return val;
			return (val as () => any).call(t);
		},
		has(t, k) {
			return Reflect.has(t, k);
		},
		ownKeys(t) {
			return Reflect.ownKeys(t);
		},
		getOwnPropertyDescriptor(t, k) {
			return Reflect.getOwnPropertyDescriptor(t, k);
		},
	}) as any;
}

/**
 * Creates a revocable Proxy that can be permanently deactivated on demand.
 * Integrates with the unified proxy engine to support unwrapping, freezing, and security invariants.
 *
 * @param target - The object to wrap in a revocable Proxy
 * @param options - Configuration options for proxy behavior (frozen, lock, bind, etc.)
 * @returns An object containing the revocable `proxy` and its `revoke()` function
 * @example
 * ```ts
 * const { proxy, revoke } = revocable({ secret: '123' });
 * console.log(proxy.secret); // '123'
 * revoke();
 * console.log(proxy.secret); // throws TypeError
 * ```
 */
export function revocable<T extends object>(
	target: T,
	options: ProxyOptions = {}
): { proxy: T; revoke: () => void } {
	return factory(target, options, true);
}

/**
 * Runs a scoped callback with an ephemeral, revocable Proxy that is automatically
 * revoked as soon as the synchronous execution or returned Promise completes.
 *
 * @param target - The object to provide ephemerally
 * @param fn - The scoped execution block receiving the ephemeral proxy
 * @param options - Configuration options for proxy behavior
 * @returns The result of the callback function
 * @example
 * ```ts
 * const result = ephemeral({ token: 'temp' }, (scoped) => {
 *   return scoped.token.toUpperCase();
 * });
 * // scoped proxy is revoked immediately upon return
 * ```
 */
export function ephemeral<T extends object, R>(
	target: T,
	fn: (scoped: T) => R,
	options: ProxyOptions = {}
): R {
	const { proxy, revoke } = revocable(target, options);
	try {
		const res = fn(proxy);
		if (res && typeof (res as any).then === 'function')
			return Promise.resolve(res).finally(() => revoke()) as R;

		revoke();
		return res;
	} catch (err) {
		revoke();
		throw err;
	}
}

