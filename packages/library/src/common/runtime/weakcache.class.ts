import { StringTag } from '#library/decorator.library.js';

interface CacheEntry<V extends WeakKey> {
	ref: WeakRef<V>;
	token: object;
}

/**
 * ## WeakCache
 * Map-like cache holding values weakly via WeakRef and auto-pruning
 * collected entries using FinalizationRegistry without memory leaks.
 */
@StringTag('WeakCache')
export class WeakCache<K = string, V extends WeakKey = WeakKey> {
	readonly #cache = new Map<K, CacheEntry<V>>();
	readonly #registry: FinalizationRegistry<K>;

	constructor() {
		this.#registry = new FinalizationRegistry((key: K) => {
			this.#cache.delete(key);
		});
	}

	/**
	 * Returns true to identify this instance as a WeakCache.
	 */
	get isWeakCache(): boolean {
		return true;
	}

	/**
	 * Sets a key-value pair in the cache. The value is weakly held.
	 * If the key already exists, its previous registration is cleared.
	 *
	 * @param key - The cache key
	 * @param value - The object value to weakly retain
	 * @returns This cache instance for chaining
	 */
	set(key: K, value: V): this {
		this.delete(key);

		const token = Object.create(null);
		this.#cache.set(key, {
			ref: new WeakRef(value),
			token,
		});

		this.#registry.register(value, key, token);
		return this;
	}

	/**
	 * Retrieves a value from the cache by key.
	 * Returns undefined if the key does not exist or the value has been garbage collected.
	 *
	 * @param key - The cache key to retrieve
	 * @returns The cached object or undefined
	 */
	get(key: K): V | undefined {
		const entry = this.#cache.get(key);
		if (!entry) return undefined;

		const value = entry.ref.deref();
		if (!value) {
			this.#cache.delete(key);
			return undefined;
		}

		return value;
	}

	/**
	 * Checks whether the cache contains a non-collected value for the given key.
	 *
	 * @param key - The cache key to check
	 * @returns True if the key exists and its value has not been collected
	 */
	has(key: K): boolean {
		return this.get(key) !== undefined;
	}

	/**
	 * Returns the cached value for the key if present, or computes and caches it using the factory.
	 *
	 * @param key - The cache key
	 * @param factory - Factory function to create the value if absent
	 * @returns The cached or newly computed value
	 */
	getOrSet(key: K, factory: (key: K) => V): V {
		const existing = this.get(key);
		if (existing !== undefined) return existing;

		const value = factory(key);
		this.set(key, value);
		return value;
	}

	/**
	 * Deletes a key from the cache and unregisters its finalizer.
	 *
	 * @param key - The cache key to delete
	 * @returns True if an entry existed and was deleted, false otherwise
	 */
	delete(key: K): boolean {
		const entry = this.#cache.get(key);
		if (entry) {
			this.#cache.delete(key);
			this.#registry.unregister(entry.token);
			return true;
		}
		return false;
	}

	/**
	 * Clears all entries from the cache and unregisters all active finalizers.
	 */
	clear(): void {
		for (const entry of this.#cache.values()) {
			this.#registry.unregister(entry.token);
		}
		this.#cache.clear();
	}
}
