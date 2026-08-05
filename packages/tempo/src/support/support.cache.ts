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

	override has(key: K): boolean {
		if (this.#isExpired(key)) {
			this.delete(key);
			return false;
		}
		return super.has(key);
	}

	override get size(): number {
		this.evictExpired();
		return super.size;
	}

	override forEach(callbackfn: (value: V, key: K, map: Map<K, V>) => void, thisArg?: any): void {
		this.evictExpired();
		super.forEach(callbackfn, thisArg);
	}

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

	override delete(key: K): boolean {
		this.#timestamps.delete(key);
		this.#staticKeys.delete(key);
		return super.delete(key);
	}

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
	 * Purge cache entries.
	 * If `count` is specified, evicts up to `count` oldest non-static entries.
	 * If omitted, clears all entries, including static entries.
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

	override keys(): MapIterator<K> {
		this.evictExpired();
		return super.keys();
	}

	override values(): MapIterator<V> {
		this.evictExpired();
		return super.values();
	}

	override entries(): MapIterator<[K, V]> {
		this.evictExpired();
		return super.entries();
	}

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
		get(key: string) {
			const normalized = String(key).trim().toLowerCase();
			return getState().cache.get(normalized);
		},
		has(key: string) {
			const normalized = String(key).trim().toLowerCase();
			return getState().cache.has(normalized);
		},
		set(key: string, value: string) {
			const normalized = String(key).trim().toLowerCase();
			getState().cache.set(normalized, String(value));
			return this;
		},
		setStatic(key: string, value: string) {
			const normalized = String(key).trim().toLowerCase();
			getState().cache.setStatic(normalized, String(value));
			return this;
		},
		delete(key: string) {
			const normalized = String(key).trim().toLowerCase();
			return getState().cache.delete(normalized);
		},
		deletePrefix(prefix: string) {
			const normalizedPrefix = String(prefix).trim().toLowerCase();
			return getState().cache.deletePrefix(normalizedPrefix);
		},
		clear(count?: number) {
			getState().cache.clear(count);
		},
		entries() {
			return getState().cache.entries();
		},
		fromEntries(entries: Iterable<readonly [string, string]>) {
			for (const [k, v] of entries) {
				const normalized = String(k).trim().toLowerCase();
				getState().cache.set(normalized, String(v));
			}
			return this;
		},
		toJSON() {
			return getState().cache.toJSON();
		}
	});
}

