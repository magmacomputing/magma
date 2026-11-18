import { sym } from '#library/symbol.library.js';
import { allObject } from '#library/reflection.library.js';
import { deepFreeze } from '#library/utility.library.js';
import { unwrap, defineFrom, defineProp } from '#library/primitive.library.js';
import { isString, isFunction, isSymbol, isDefined, isNullish, isNumber, isObject, isPlainObject, isReference, isSafeKey } from '#library/assertion.library.js';
import { registerType, type Constructor, type Evaluated, type Secure } from '#library/type.library.js';

const boundMethodCache = new WeakMap<Function, WeakMap<object, Function>>();
const generatedInspectHooks = new WeakSet<Function>();
const proxyInspectors = new WeakMap<object, (recv: any, depth?: number | null, seen?: WeakMap<object, object>) => any>();

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
 * Base proxy interface providing direct access to the underlying un-proxied target object.
 * Present on all proxies created by the proxy engine.
 */
export type Proxied<T extends object = object> = T & {
	/** Direct access to the underlying un-proxied target object */
	readonly [sym.$Target]?: T;
};

/**
 * Augments an object or array type with virtual Proxy capabilities active on frozen/secured proxies,
 * including serialization de-proxying (toJSON) and Node.js custom inspection (sym.$Inspect).
 */
export type Proxified<T extends object = object> = Proxied<T> & {
	/** De-proxies the target into a plain representation for serialization */
	toJSON(): T;
	/** Node.js custom inspection hook (util.inspect.custom) */
	readonly [sym.$Inspect]?: () => T;
};

function isEnumifyTarget(obj: object): boolean {
	const visited = new WeakSet<object>();
	let curr: object | null = obj;
	while (curr && curr !== Object.prototype) {
		if (visited.has(curr)) break;
		visited.add(curr);
		const desc = Object.getOwnPropertyDescriptor(curr, Symbol.toStringTag);
		if (desc) return 'value' in desc && desc.value === 'Enumify';
		curr = Object.getPrototypeOf(curr);
	}
	return false;
}

/**
 * Copies enumerable property descriptors along the prototype chain into a plain object
 * (or shallow-clones arrays) without invoking getters during inspection.
 *
 * @internal
 */
function snapshotInspect(src: object, seen = new WeakMap<object, object>(), depth?: number | null): object {
	const unwrapped = unwrap(src);
	const cached = seen.get(unwrapped);
	if (cached) return cached;

	const nextDepth = isNumber(depth) ? depth - 1 : depth;

	const resolveValue = (v: unknown, currentDepth: number | null | undefined = nextDepth): unknown => {
		if (!isReference(v) || isFunction(v)) return v;

		if (seen.has(v as object)) return seen.get(v as object)!;
		let inner: object;
		let hasOwnCustom = false;
		let innerIsEnum = false;
		let hasInheritedCustom = false;
		try {
			inner = unwrap(v as object);
			const ownInspectDesc = Object.getOwnPropertyDescriptor(inner, sym.$Inspect);
			const ownInspectVal = ownInspectDesc?.value;
			hasOwnCustom = Boolean(ownInspectDesc) && !(isFunction(ownInspectVal) && generatedInspectHooks.has(ownInspectVal));
			innerIsEnum = isEnumifyTarget(inner);
			const innerProto = Object.getPrototypeOf(inner);
			hasInheritedCustom = !innerIsEnum && Boolean(innerProto && (sym.$Inspect in innerProto));
		} catch {
			return v;
		}
		if (hasOwnCustom || hasInheritedCustom) return v;

		const canDescendHere = isNullish(currentDepth) || currentDepth >= 0;
		const nestedInspector = proxyInspectors.get(v as object);
		if (!nestedInspector && seen.has(inner)) return seen.get(inner)!;
		if (nestedInspector) {
			if (!canDescendHere) return v;
			const resolved = nestedInspector(v, currentDepth, seen);
			if (!isReference(resolved) || isFunction(resolved)) return resolved;
			if (seen.has(resolved)) return seen.get(resolved)!;
			if (resolved === seen.get(inner)) return resolved;
			const virtualOut: any = Array.isArray(resolved) ? new Array<unknown>(resolved.length) : {};
			seen.set(v as object, virtualOut);
			seen.set(resolved, virtualOut);
			const childDepth = isNumber(currentDepth) ? currentDepth - 1 : currentDepth;
			for (const k of Reflect.ownKeys(resolved)) {
				if ((Array.isArray(resolved) && k === 'length') || k === sym.$Inspect) continue;
				const d = Object.getOwnPropertyDescriptor(resolved, k);
				if (d && d.enumerable) {
					Object.defineProperty(virtualOut, k, {
						...d,
						...('value' in d ? { value: resolveValue(d.value, childDepth) } : {}),
						configurable: true,
					});
				}
			}
			return virtualOut;
		}

		if (!canDescendHere) return v;
		if (Array.isArray(inner) || isPlainObject(inner) || innerIsEnum)
			return snapshotInspect(inner, seen, currentDepth);
		return v;
	};

	if (Array.isArray(unwrapped)) {
		const out = new Array<unknown>(unwrapped.length);
		seen.set(unwrapped, out);
		for (const k of Reflect.ownKeys(unwrapped)) {
			if (k === 'length' || k === sym.$Inspect) continue;
			const desc = Object.getOwnPropertyDescriptor(unwrapped, k);
			if (desc?.enumerable) {
				Object.defineProperty(out, k, {
					...desc,
					...('value' in desc ? { value: resolveValue(desc.value) } : {}),
					configurable: true,
				});
			}
		}
		return out;
	}

	const out: Record<PropertyKey, unknown> = {};
	seen.set(unwrapped, out);
	const levels: object[] = [];
	const visited = new WeakSet<object>();
	let curr: any = unwrapped;

	while (curr && curr !== Object.prototype) {
		const level = unwrap(curr);
		if (visited.has(level)) break;
		visited.add(level);
		levels.push(level);
		curr = Object.getPrototypeOf(level);
	}

	for (const level of levels.reverse()) {
		for (const k of Reflect.ownKeys(level)) {
			if (k === sym.$Inspect) continue;
			const desc = Object.getOwnPropertyDescriptor(level, k);
			if (!desc) continue;
			if (!desc.enumerable) {
				delete out[k];
				continue;
			}
			Object.defineProperty(out, k, {
				...desc,
				...('value' in desc ? { value: resolveValue(desc.value) } : {}),
				configurable: true,
			});
		}
	}

	return out;
}

function createTargetInspectHook(fallbackTarget: object, isEnum = false) {
	const hook = function (this: any, depth?: number | null, ...args: any[]) {
		const recv = isReference(this) && !isFunction(this) ? this : fallbackTarget;
		if (!isEnum) {
			const liveTarget = isReference(recv) ? unwrap(recv) : fallbackTarget;
			const visited = new WeakSet<object>();
			let proto = Object.getPrototypeOf(liveTarget);
			while (proto && proto !== Object.prototype) {
				if (visited.has(proto)) break;
				visited.add(proto);
				const desc = Object.getOwnPropertyDescriptor(proto, sym.$Inspect);
				if (desc) {
					const fn = 'value' in desc ? desc.value : Reflect.get(proto, sym.$Inspect, liveTarget);
					if (!isFunction(fn))
						break;
					if (!generatedInspectHooks.has(fn))
						return fn.apply(liveTarget, [depth, ...args]);
				}
				proto = Object.getPrototypeOf(proto);
			}
		}
		const proxyInspector = proxyInspectors.get(recv);
		return (proxyInspector)
		? proxyInspector(recv, depth)
		: snapshotInspect(recv, new WeakMap(), depth);
	};
	generatedInspectHooks.add(hook);
	return hook;
}

/**
 * Creates a configured proxy for an object, optionally returning a revocation function.
 *
 * @param target - The object to wrap
 * @param options - Configuration options for proxy behavior
 * @param isRevocable - Whether to create a revocable proxy
 * @returns The configured proxy, or an object containing the proxy and its revocation function
 * @internal
 */
function factory<T extends object>(target: T, options: ProxyOptions = {}, isRevocable = false): any {
	const { frozen, lock, appendOnly, onGet, keys, bind, skip } = options;
	const pending = new Set<PropertyKey>();
	let cachedJSON: any;
	let cachedInspect: any;
	let result: any;

	// 1. Unwrap recursive proxies and resolve the true target
	const tgt = unwrap(target);
	const isEnumTarget = isEnumifyTarget(tgt);
	const isInspectableTarget = Array.isArray(tgt) || isPlainObject(tgt) || isEnumTarget;
	const existingOwnInspect = Object.getOwnPropertyDescriptor(tgt, sym.$Inspect)?.value;
	const hasGeneratedInspect = isFunction(existingOwnInspect) && generatedInspectHooks.has(existingOwnInspect);
	const hasOwnCustomInspect = Object.hasOwn(tgt, sym.$Inspect) && !hasGeneratedInspect;
	const proto = Object.getPrototypeOf(tgt);
	const hasInheritedCustomInspect = !isEnumTarget && !hasOwnCustomInspect && Boolean(proto && (sym.$Inspect in proto));
	const hasCustomInspect = hasOwnCustomInspect || hasInheritedCustomInspect;

	const inspectWithReceiver = (recv: any, depth?: number | null, seen?: WeakMap<object, object>) => {
		if (keys) {
			const raw = Object.fromEntries(keys.filter(k => !isSymbol(k)).map(k => [k, recv[k]]));
			if (seen) return raw;
			const rootSeen = new WeakMap<object, object>();
			const out: Record<string, unknown> = {};
			rootSeen.set(recv, out);
			const snapshot = snapshotInspect(raw, rootSeen, depth);
			return defineFrom(out, snapshot);
		}
		return snapshotInspect(recv, seen ?? new WeakMap(), depth);
	};

	const getInspect = (receiver?: any) => {
		if (keys || receiver) {
			return function (this: any, depth?: number | null) {
				const recv = isReference(this) && !isFunction(this) ? this : (receiver ?? result);
				const proxyInspector = proxyInspectors.get(recv);
				return isFunction(proxyInspector)
					? proxyInspector(recv, depth)
					: inspectWithReceiver(recv, depth);
			};
		}
		if (!cachedInspect) {
			cachedInspect = function (this: any, depth?: number | null) {
				const recv = isReference(this) && !isFunction(this) ? this : tgt;
				const proxyInspector = proxyInspectors.get(recv);
				if (proxyInspector) return proxyInspector(recv, depth);
				return snapshotInspect(recv, new WeakMap(), depth);
			};
		}
		return cachedInspect;
	};

	const getJSON = (receiver?: any) => {
		if (keys) {
			return function (this: any) {
				const recv = isReference(this) && !isFunction(this) ? this : (receiver ?? result);
				return Object.fromEntries(keys.filter(k => !isSymbol(k)).map(k => [k, recv[k]]));
			};
		}
		if (!cachedJSON) {
			cachedJSON = function (this: any) {
				return allObject(isReference(this) && !isFunction(this) ? this : tgt);
			};
		}
		return cachedJSON;
	};

	const ctorDesc = Object.getOwnPropertyDescriptor(tgt, 'constructor');
	const hasAccessorCtor = Boolean(ctorDesc && !('value' in ctorDesc));

	// Expose Node custom inspection directly on supported targets so util.inspect finds it after unwrapping the Proxy
	if (frozen && !hasAccessorCtor && (Boolean(keys) || isInspectableTarget || hasInheritedCustomInspect) && !hasOwnCustomInspect && !hasGeneratedInspect && Object.isExtensible(tgt))
		defineProp(tgt, sym.$Inspect, createTargetInspectHook(tgt, isEnumTarget), 'configurable');

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
			if (!keys) return Reflect.getOwnPropertyDescriptor(t, k);
			if (!keys.includes(k)) return undefined;
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
			if (frozen && k === 'toJSON') {
				const own = Object.getOwnPropertyDescriptor(t, k);
				if (own && isFunction(own.value)) return own.value;
				return getJSON(r);
			}
			if (frozen && k === sym.$Inspect) {
				const own = Object.getOwnPropertyDescriptor(t, k);
				if (own) {
					if (!own.configurable && 'value' in own && !own.writable) return own.value;
					if (!own.configurable && !('value' in own) && !own.get) return undefined;
					if (isFunction(own.value) && !generatedInspectHooks.has(own.value)) return own.value;
				}
				if (!keys && !isEnumTarget && (k in t)) {
					const proto = Object.getPrototypeOf(t);
					const inherited = proto ? Reflect.get(proto, k, t) : undefined;
					if (isFunction(inherited)) return inherited.bind(t);
				}
				if (keys || isInspectableTarget) return getInspect(r);
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
			if (bind && !isSymbol(k) && isSafeKey(k) && isFunction(val)) {
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
		if (frozen && (keys || (isInspectableTarget && !hasCustomInspect))) {
			proxyInspectors.set(result, inspectWithReceiver);
		}
		return { proxy: revocableResult.proxy as T, revoke: revocableResult.revoke };
	}

	result = new Proxy(tgt, handler) as T;
	if (frozen && (keys || (isInspectableTarget && !hasCustomInspect))) {
		proxyInspectors.set(result, inspectWithReceiver);
	}
	return result;
}

/** Proxy immutability mode: `'frozen'` locks target & proxy, `'readonly'` blocks proxy writes only, `'mutable'` allows writes. */
export type ProxyMode = 'frozen' | 'readonly' | 'mutable';

/**
 * Creates a Stealth Proxy pattern to allow for on-demand lazy property discovery and registration.
 * Provides deep-freezing and bounding capabilities depending on options.
 *
 * @param target - The object to proxify
 * @param mode - Immutability mode (`'frozen'` by default)
 * @param skip - A WeakSet of objects to skip during deep-freeze
 * @returns The proxified object
 * @example
 * ```ts
 * const p = proxify({ a: 1 });
 * const r = proxify({ a: 1 }, 'readonly');
 * ```
 */
export function proxify<T extends object>(target: T, mode?: 'frozen' | 'readonly', skip?: WeakSet<object>): Readonly<T>;
export function proxify<T extends object>(target: T, mode: 'mutable', skip?: WeakSet<object>): T;
export function proxify<T extends object>(target: T, mode?: ProxyMode, skip?: WeakSet<object>): Readonly<T> | T;
export function proxify<T extends object>(target: T, mode: ProxyMode = 'frozen', skip = new WeakSet<object>()): any {
	const frozen = mode !== 'mutable';
	const lock = mode === 'frozen';
	return factory(target, { frozen, lock, skip, bind: frozen });
}

/**
 * Creates a dynamic Proxy where property access is forwarded to a discovery callback.
 * Useful for virtual objects and lazy-loading data.
 *
 * @param target - The base object
 * @param onGet - Callback fired when an unknown property is accessed
 * @param mode - Immutability mode (`'readonly'` by default)
 * @returns The delegated Proxy
 * @example
 * ```ts
 * const d = delegate({}, (key) => console.log('Requested:', key));
 * ```
 */
export function delegate<T extends object>(target: T, onGet: (key: string | symbol, target: T) => any, mode?: 'readonly' | 'frozen'): Readonly<T>;
export function delegate<T extends object>(target: T, onGet: (key: string | symbol, target: T) => any, mode: 'mutable'): T;
export function delegate<T extends object>(target: T, onGet: (key: string | symbol, target: T) => any, mode?: ProxyMode): Readonly<T> | T;
export function delegate<T extends object>(target: T, onGet: (key: string | symbol, target: T) => any, mode: ProxyMode = 'readonly'): any {
	return factory(target, { onGet, frozen: mode !== 'mutable', lock: mode === 'frozen' });
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
export function secure<const T extends object>(obj: T, skip = new WeakSet<object>()): Secure<T> {
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
export function delegator<K extends string | symbol>(keys: readonly K[] | Record<K, any>, fn: (prop: K) => any): Readonly<Record<K, any>> {
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
	list: readonly T[] | T[],
	finder: (key: string) => T | undefined,
	readonly?: true
): readonly T[] & Readonly<Record<string, T>>;
export function indexedArray<T extends object>(
	list: T[],
	finder: (key: string) => T | undefined,
	readonly: false
): T[] & Record<string, T>;
export function indexedArray<T extends object>(
	list: readonly T[] | T[],
	finder: (key: string) => T | undefined,
	readonly?: boolean
): (readonly T[] & Readonly<Record<string, T>>) | (T[] & Record<string, T>);
export function indexedArray<T extends object>(
	list: any,
	finder: (key: string) => T | undefined,
	readonly = true
): any {
	return delegate(list, (key) => {
		return (isString(key) && key !== 'length' && !(key in Array.prototype) && !isNumber(Number(key)))
			? finder(key)
			: undefined;
	}, readonly ? 'readonly' : 'mutable') as any;
}

/**
 * Creates a proxy that evaluates eligible function-valued properties when read.
 *
 * @param target - The object whose properties are evaluated
 * @returns A proxy that invokes eligible functions with `target` as their receiver; symbols, constructors, and fixed function properties are returned unchanged
 */
export function dynamicProxy<T extends object>(target: T): Evaluated<T> {
	if (!isObject(target)) return target as any;
	return new Proxy(target, {
		get(t, k, r) {
			if (k === sym.$Target) return t;
			const val = Reflect.get(t, k, r);
			if (!isFunction(val) || isSymbol(k) || !isSafeKey(k))
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
 * Creates a proxy that can be permanently revoked on demand.
 *
 * @param target - The object to wrap
 * @param options - Proxy behavior configuration
 * @returns An object containing the proxy and a function that revokes it
 */
export function revocable<T extends object>(
	target: T,
	options: ProxyOptions = {}
): { proxy: T; revoke: () => void } {
	return factory(target, options, true);
}

/**
 * Runs a callback with a temporary proxy that is revoked after execution completes.
 *
 * @param target - The object to expose through the temporary proxy
 * @param fn - The callback that receives the temporary proxy
 * @param options - Configuration options for proxy behavior
 * @returns The callback's result
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

