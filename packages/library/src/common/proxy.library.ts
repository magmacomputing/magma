import { sym } from '#library/symbol.library.js';
import { allObject } from '#library/reflection.library.js';
import { deepFreeze } from '#library/utility.library.js';
import { unwrap } from '#library/primitive.library.js';
import { isFunction, isSymbol, isDefined } from '#library/assertion.library.js';
import { registerType, type Constructor } from '#library/type.library.js';

/** internal options for the unified proxy engine */
type ProxyOptions = {
	frozen?: boolean;																					// read-only Proxy (throws on set/delete)
	lock?: boolean;																						// deep-freeze the target object
	appendOnly?: boolean;																			// allow adding properties, but not changing existing ones
	onGet?: (key: string | symbol, target: any) => any;				// callback for property discovery
	keys?: (string | symbol)[];																// fixed set of keys (for virtual objects)
	bind?: boolean;																						// bind methods to the target
	skip?: WeakSet<object>;																		// objects to skip during deep-freeze
}

/** 
 * ## factory
 * The unified internal engine for all Proxy creation in the library.
 * Handles unwrapping, Proxy invariants, discovery, and security.
 */
function factory<T extends object>(target: T, options: ProxyOptions = {}): T {
	const { frozen, lock, appendOnly, onGet, keys, bind, skip } = options;
	const pending = new Set<PropertyKey>();
	let cachedJSON: any;

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
				if (onGet && !pending.has(k)) {
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
			if (frozen) throw new TypeError(`Cannot define property '${String(k)}' on a frozen object.`);
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
				// silent mark to avoid redundant discovery
				if (Reflect.isExtensible(t) && !Reflect.has(t, k))
					Object.defineProperty(t, k, { value: undefined, enumerable: false, configurable: true });
			}

			const val = Reflect.get(t, k, r);
			if (bind && isFunction(val)) {
				const desc = Object.getOwnPropertyDescriptor(t, k);
				if (desc && !desc.configurable && !desc.writable) return val;
				return val.bind(t);
			}
			return val;
		}
	};

	const result = new Proxy(tgt, handler) as T;
	return result;
}

/** Stealth Proxy pattern to allow for on-demand lazy property discovery and registration */
export function proxify<T extends object>(target: T, frozen = true, lock = frozen, skip = new WeakSet<object>()) {
	return factory(target, { frozen, lock, skip, bind: frozen });
}

/** Create a dynamic Proxy where property access is forwarded to a discovery callback */
export function delegate<T extends object>(target: T, onGet: (key: string | symbol, target: T) => any, readonly = true) {
	return factory(target, { onGet, frozen: readonly });
}

/** Wrap an object in a protective Proxy that allows extension but prevents modification */
export function secureRef<T extends object>(target: T): T {
	return factory(target, { appendOnly: true });
}

/** Deep-freeze an object and wrap it in a loudly-throwing read-only Proxy */
export function secure<const T extends object>(obj: T, skip = new WeakSet<object>()): T {
	return factory(obj, { frozen: true, lock: true, skip, bind: true });
}

/** Create a virtual Proxy where fixed keys are mapped to a callback function */
export function delegator<K extends string | symbol>(keys: K[] | Record<K, any>, fn: (prop: K) => any): Record<K, any> {
	const keyList = Array.isArray(keys) ? keys : Reflect.ownKeys(keys) as K[];
	return factory({} as any, { keys: keyList, onGet: fn as any });
}
