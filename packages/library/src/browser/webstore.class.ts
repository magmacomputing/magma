import { distinct, ownEntries } from '#library/primitive.library.js';
import { stringify, objectify } from '#library/serialize.library.js';
import { asType } from '#library/type.library.js';
import { isEmpty, isNullish, isString } from '#library/assertion.library.js';
import { getSafeStorage } from '#library/storage.library.js';
import type { Property, ValueOf } from '#library/type.library.js';

const STORAGE = {
	Local: 'local',
	Session: 'session',
} as const
type STORAGE = ValueOf<typeof STORAGE>

/**
 * Wrapper around local / session Browser Storage.
 * Refactored for lazy-initialization to ensure side-effect free imports.
 * 
 * @example
 * ```ts
 * const store = WebStore.local;
 * store.set('user', { id: 1, name: 'Alice' });
 * const user = store.get('user');
 * ```
 */
export class WebStore {
	private static _localInstance?: WebStore;
	private static _sessionInstance?: WebStore;

	/** 
	 * Lazy getter for the localStorage wrapper instance.
	 * 
	 * @returns The WebStore instance for localStorage
	 */
	static get local() {
		return WebStore._localInstance ??= new WebStore(STORAGE.Local);
	}

	/** 
	 * Lazy getter for the sessionStorage wrapper instance.
	 * 
	 * @returns The WebStore instance for sessionStorage
	 */
	static get session() {
		return WebStore._sessionInstance ??= new WebStore(STORAGE.Session);
	}

	#type: STORAGE;
	#resolvedStorage?: globalThis.Storage;

	/** Resolved Storage object (resolved safely on access with memory fallback) */
	get #storage(): globalThis.Storage {
		if (this.#resolvedStorage) return this.#resolvedStorage;
		const name = this.#type === STORAGE.Local ? 'localStorage' : 'sessionStorage';
		return this.#resolvedStorage = getSafeStorage(name);
	}

	[Symbol.toStringTag] = 'WebStore';

	constructor(storage: STORAGE = STORAGE.Local) {
		this.#type = storage;
	}

	/**
	 * Retrieve a value from storage, optionally providing a default.
	 * 
	 * @param key - The property key to retrieve
	 * @param dflt - An optional default value if the key does not exist
	 * @returns The parsed object from storage, or the default/null if not found
	 */
	public get<T>(key: PropertyKey, dflt?: T) {
		const str = this.#storage.getItem(stringify(key));
		return isString(str)
			? objectify<T>(str)																		// rebuild the object
			: (dflt ?? null)
	}

	/**
	 * Store or merge a value into storage for a given key.
	 * 
	 * @param key - The property key to set. If nullish, clears the store.
	 * @param obj - The value to store
	 * @param opt - Options (merge behavior)
	 * @returns The WebStore instance for chaining
	 */
	public set(key?: PropertyKey, obj?: unknown, opt = { merge: true }) {
		if (isNullish(key))																		// synonym for 'clear'
			return this.clear();

		let prev = this.get<string | any[] | {}>(key);					// needed if merge is true
		const arg = asType(obj);

		switch (arg.type) {
			case 'Undefined':
				return this.del(key);																// synonym for 'removeItem'

			case 'Object':
				prev ??= {};
				return this.#upd(key, opt.merge
					? Object.assign(prev, arg.value)									// assume prev is Object
					: arg.value)

			case 'Array':
				prev ??= [];
				return this.#upd(key, opt.merge
					? distinct((prev as unknown[])										// assume prev is Array
						.concat(arg.value))															// remove duplicates
					: obj)

			case 'Map':
				prev ??= new Map();
				if (opt.merge) {
					arg.value																					// merge into prev Map
						.forEach((val, key) => (prev as Map<any, any>).set(key, val));
					return this.#upd(key, prev);
				}
				return this.#upd(key, arg.value);										// else overwrite new Map

			case 'Set':
				prev ??= new Set();
				if (opt.merge) {
					arg.value
						.forEach(itm => (prev as Set<any>).add(itm));		// merge into prev Set
					return this.#upd(key, prev);
				}
				return this.#upd(key, arg.value);										// else overwrite new Set

			default:
				return this.#upd(key, arg.value);
		}
	}

	/**
	 * Clear all items from this storage instance.
	 * 
	 * @returns The WebStore instance for chaining
	 */
	public clear() {
		try {
			this.#storage.clear();
		} catch (e) {
			console.warn('[WebStore] Failed to clear storage:', e);
		}
		return this;
	}

	/**
	 * Delete specific keys from storage.
	 * 
	 * @param keys - The keys to remove
	 * @returns The WebStore instance for chaining
	 */
	public del(...keys: PropertyKey[]) {											// list of keys to remove
		keys.forEach(key => {
			try {
				this.#storage.removeItem(stringify(key));
			} catch (e) {
				console.warn(`[WebStore] Failed to removeItem for key '${String(key)}':`, e);
			}
		});
		return this;
	}

	/**
	 * Get an array of keys currently in storage. If specific keys are provided, filters by those.
	 * 
	 * @param keys - Optional keys to filter by
	 * @returns An array of string/symbol keys
	 */
	public keys(...keys: PropertyKey[]) {											// list of keys (or all)
		return this.entries(...keys)
			.map(([key,]) => key)
	}

	/**
	 * Get an array of values currently in storage.
	 * 
	 * @param keys - Optional keys to retrieve values for
	 * @returns An array of parsed values
	 */
	public values<T>(...keys: PropertyKey[]) {								// list of keys (or all) to lookup
		return this.entries<T>(...keys)
			.map(([, val]) => val)
	}

	/**
	 * Get an array of [key, value] entries currently in storage.
	 * 
	 * @param keys - Optional keys to filter the entries by
	 * @returns An array of key-value tuples
	 */
	public entries<T>(...keys: PropertyKey[]) {								// list of keys (or all) to lookup
		const wanted = new Set(keys.map(key => stringify(key)));
		const result: [PropertyKey, T][] = [];
		const storage = this.#storage;

		for (let i = 0; i < storage.length; i++) {
			const rawKey = storage.key(i);
			if (rawKey === null) continue;
			if (isEmpty(keys) || wanted.has(rawKey)) {
				const rawVal = storage.getItem(rawKey);
				result.push([objectify(rawKey), objectify(rawVal) as T]);
			}
		}

		return result;
	}

	/**
	 * Populate the storage from an existing object map.
	 * 
	 * @param store - The object/dictionary to populate from
	 * @returns The WebStore instance for chaining
	 */
	public from(store: Property<any>) {
		ownEntries(store)
			.forEach(([key, val]) => this.set(key, val))
		return this;
	}

	#upd(key: PropertyKey, obj: any) {
		try {
			this.#storage.setItem(stringify(key), stringify(obj));
		} catch (e) {
			console.warn(`[WebStore] Failed to setItem for key '${String(key)}':`, e);
		}
		return this;
	}
}