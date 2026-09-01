import { isString, isUndefined } from '#library/assertion.library.js';
import { secure } from '#library/proxy.library.js';
import type * as t from '../tempo.type.js';

/**
 * ## BoundedCache
 * High-performance Map implementation enforcing maximum capacity (LRU) and TTL eviction.
 * Supports static keys (immortal glossary definitions) and date-salt staleness purging.
 */
export class BoundedCache<K = string, V = string> extends Map<K, V> {
	#timestamps = new Map<K, number>();
	#staticKeys = new Set<K>();
	maxSize: number;
	ttl: number;

	constructor(maxSize = 1000, ttl = 24 * 60 * 60 * 1000) {
		super();
		this.maxSize = maxSize;
		this.ttl = ttl;
	}

	/**
	 * Returns true to identify this instance as a BoundedCache.
	 */
	get isBoundedCache(): boolean {
		return true;
	}

	#isExpired(key: K): boolean {
		if (this.#staticKeys.has(key)) return false;
		const time = this.#timestamps.get(key);
		if (isUndefined(time)) return false;
		return Date.now() - time > this.ttl;
	}

	/**
	 * Purges TTL-expired entries.
	 */
	evictExpired(): void {
		const now = Date.now();
		for (const key of super.keys()) {
			if (this.#staticKeys.has(key)) continue;
			const time = this.#timestamps.get(key);
			if (time !== undefined && (now - time > this.ttl)) {
				this.delete(key);
			}
		}
	}

	/**
	 * Register an immortal static key (e.g. business glossary term).
	 * Static keys bypass TTL expiration and LRU capacity eviction.
	 */
	setStatic(key: K, value: V): this {
		if (super.has(key)) super.delete(key);
		super.set(key, value);
		this.#timestamps.delete(key);
		this.#staticKeys.add(key);
		return this;
	}

	/**
	 * Check if a key is a static key.
	 */
	isStatic(key: K): boolean {
		return this.#staticKeys.has(key);
	}

	/**
	 * Retrieves a value from the cache by key. Evaluates TTL expiration via `#timestamps`
	 * specifically for the requested key, and updates LRU ordering by deleting and re-inserting
	 * the key in the underlying Map. Does not sweep or evict other expired entries.
	 *
	 * @param key - The cache key to retrieve
	 * @returns The cached value, or undefined if not found or expired
	 */
	override get(key: K): V | undefined {
		if (this.#isExpired(key)) {
			this.delete(key);
			return undefined;
		}
		if (!super.has(key)) return undefined;
		const val = super.get(key)!;
		super.delete(key);
		super.set(key, val);
		if (!this.#staticKeys.has(key))
			this.#timestamps.set(key, Date.now());
		return val;
	}

	/**
	 * Checks if a key exists in the cache and is not expired.
	 * Automatically evicts expired entries on access.
	 *
	 * @param key - The cache key to check
	 * @returns True if the key exists and is not expired, false otherwise
	 */
	override has(key: K): boolean {
		if (this.#isExpired(key)) {
			this.delete(key);
			return false;
		}
		return super.has(key);
	}

	/**
	 * Returns the number of entries in the cache after evicting expired entries.
	 */
	override get size(): number {
		this.evictExpired();
		return super.size;
	}

	/**
	 * Executes a callback for each cache entry after evicting expired entries.
	 *
	 * @param callbackfn - Function to execute for each entry
	 * @param thisArg - Optional value to use as `this` when executing the callback
	 */
	override forEach(callbackfn: (value: V, key: K, map: Map<K, V>) => void, thisArg?: any): void {
		this.evictExpired();
		super.forEach(callbackfn, thisArg);
	}

	/**
	 * Sets a key-value pair in the cache, updating its timestamp and enforcing LRU eviction.
	 * If the cache exceeds maxSize, the oldest non-static entry is removed.
	 *
	 * @param key - The cache key to set
	 * @param value - The value to store
	 * @returns This cache instance for chaining
	 */
	override set(key: K, value: V): this {
		this.evictExpired();

		if (super.has(key)) super.delete(key);

		super.set(key, value);
		this.#staticKeys.delete(key);
		this.#timestamps.set(key, Date.now());

		while (this.size > this.maxSize) {
			let evicted = false;
			const keysIter = super.keys();
			let res = keysIter.next();
			while (!res.done) {
				const k = res.value;
				if (!this.#staticKeys.has(k)) {
					this.delete(k);
					evicted = true;
					break;
				}
				res = keysIter.next();
			}
			if (!evicted) break;
		}

		return this;
	}

	/**
	 * Deletes a key from the cache, removing its timestamp and static key markers.
	 *
	 * @param key - The cache key to delete
	 * @returns True if the key was deleted, false if it did not exist
	 */
	override delete(key: K): boolean {
		this.#timestamps.delete(key);
		this.#staticKeys.delete(key);
		return super.delete(key);
	}

	/**
	 * Deletes all cache entries whose keys start with the specified prefix.
	 * The prefix comparison is case-insensitive.
	 *
	 * @param prefix - The prefix string to match against cache keys
	 * @returns The number of entries deleted
	 */
	deletePrefix(prefix: string): number {
		const normalizedPrefix = String(prefix).trim().toLowerCase();
		const toDelete: K[] = [];
		for (const key of super.keys()) {
			if (isString(key) && key.toLowerCase().startsWith(normalizedPrefix))
				toDelete.push(key);
		}

		for (const k of toDelete)
			this.delete(k);

		return toDelete.length;
	}

	/**
	 * Purges cache entries.
	 * If `count` is specified, evicts up to `count` oldest non-static entries.
	 * If omitted, clears all entries, including static entries.
	 *
	 * @param count - Optional number of entries to evict. If omitted, clears all entries.
	 */
	override clear(count?: number): void {
		if (count === undefined) {
			this.#timestamps.clear();
			this.#staticKeys.clear();
			super.clear();
			return;
		}

		let evicted = 0;
		for (const key of super.keys()) {
			if (evicted >= count) break;
			if (!this.#staticKeys.has(key)) {
				this.delete(key);
				evicted++;
			}
		}
	}

	/**
	 * Returns an iterator of cache keys after evicting expired entries.
	 *
	 * @returns Iterator of cache keys
	 */
	override keys(): MapIterator<K> {
		this.evictExpired();
		return super.keys();
	}

	/**
	 * Returns an iterator of cache values after evicting expired entries.
	 *
	 * @returns Iterator of cache values
	 */
	override values(): MapIterator<V> {
		this.evictExpired();
		return super.values();
	}

	/**
	 * Returns an iterator of cache entries after evicting expired entries.
	 *
	 * @returns Iterator of [key, value] pairs
	 */
	override entries(): MapIterator<[K, V]> {
		this.evictExpired();
		return super.entries();
	}

	/**
	 * Returns an iterator of cache entries after evicting expired entries, making the cache iterable.
	 *
	 * @returns Iterator of [key, value] pairs
	 */
	override[Symbol.iterator](): MapIterator<[K, V]> {
		this.evictExpired();
		return super[Symbol.iterator]();
	}

	/**
	 * Returns a plain key-value object of all active non-expired cache entries.
	 * Filters out non-string keys to prevent lossy key conversions or collisions (e.g. numeric 1 vs string "1").
	 */
	toJSON(): Record<string, V> {
		this.evictExpired();
		const stringEntries: [string, V][] = [];
		for (const [k, v] of super.entries()) {
			if (typeof k === 'string')
				stringEntries.push([k, v]);
		}
		return Object.fromEntries(stringEntries) as Record<string, V>;
	}

	/**
	 * Creates a BoundedCache from an iterable of key-value pairs.
	 *
	 * @param entries - Iterable of [key, value] pairs to populate the cache
	 * @param maxSize - Maximum number of entries (default: 1000)
	 * @param ttl - Time-to-live in milliseconds (default: 24 hours)
	 * @returns A new BoundedCache instance
	 */
	static fromEntries<K = string, V = string>(entries: Iterable<readonly [K, V]>, maxSize = 1000, ttl = 24 * 60 * 60 * 1000): BoundedCache<K, V> {
		const cache = new BoundedCache<K, V>(maxSize, ttl);
		for (const [k, v] of entries) {
			cache.set(k, v);
		}
		return cache;
	}
}

/**
 * Creates a normalized cache facade exposing safe operations over the active state's BoundedCache.
 */
export function createCacheFacade(getState: () => t.Internal.State) {
	return secure({
		/** Retrieves a value from the cache by key */
		get(key: string) {
			const normalized = String(key).trim().toLowerCase();
			return getState().cache.get(normalized);
		},
		/** Checks if a key exists in the cache */
		has(key: string) {
			const normalized = String(key).trim().toLowerCase();
			return getState().cache.has(normalized);
		},
		/** Sets a value in the cache */
		set(key: string, value: string) {
			const normalized = String(key).trim().toLowerCase();
			getState().cache.set(normalized, String(value));
			return this;
		},
		/** Sets a static (immortal) value in the cache that won't expire */
		setStatic(key: string, value: string) {
			const normalized = String(key).trim().toLowerCase();
			getState().cache.setStatic(normalized, String(value));
			return this;
		},
		/** Deletes a key from the cache */
		delete(key: string) {
			const normalized = String(key).trim().toLowerCase();
			return getState().cache.delete(normalized);
		},
		/** Deletes all keys starting with the given prefix */
		deletePrefix(prefix: string) {
			const normalizedPrefix = String(prefix).trim().toLowerCase();
			return getState().cache.deletePrefix(normalizedPrefix);
		},
		/** Clears the cache, optionally evicting only a specific count of entries */
		clear(count?: number) {
			getState().cache.clear(count);
		},
		/** Returns an iterator of cache entries */
		entries() {
			return getState().cache.entries();
		},
		/** Populates the cache from an iterable of key-value pairs */
		fromEntries(entries: Iterable<readonly [string, string]>) {
			for (const [k, v] of entries) {
				const normalized = String(k).trim().toLowerCase();
				getState().cache.set(normalized, String(v));
			}
			return this;
		},
		/** Converts the cache to a JSON object */
		toJSON() {
			return getState().cache.toJSON();
		}
	});
}

