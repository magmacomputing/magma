/**
 * ## BoundedCache
 * Map implementation enforcing maximum capacity (LRU) and TTL eviction.
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

	#isExpired(key: K): boolean {
		if (this.#staticKeys.has(key)) return false;
		const time = this.#timestamps.get(key);
		if (time === undefined) return false;
		return Date.now() - time > this.ttl;
	}

	evictExpired(): void {
		const now = Date.now();
		for (const [key, time] of this.#timestamps.entries()) {
			if (!this.#staticKeys.has(key) && now - time > this.ttl)
				this.delete(key);
		}
	}

	setStatic(key: K, value: V): this {
		if (super.has(key)) super.delete(key);
		super.set(key, value);
		this.#timestamps.delete(key);
		this.#staticKeys.add(key);
		return this;
	}

	override get(key: K): V | undefined {
		if (this.#isExpired(key)) {
			this.delete(key);
			return undefined;
		}
		if (super.has(key)) {
			const val = super.get(key) as V;
			super.delete(key);
			super.set(key, val);
			return val;
		}
		return undefined;
	}

	override has(key: K): boolean {
		if (this.#isExpired(key)) {
			this.delete(key);
			return false;
		}
		return super.has(key);
	}

	override set(key: K, value: V): this {
		this.evictExpired();

		if (super.has(key))
			super.delete(key);

		super.set(key, value);
		this.#staticKeys.delete(key);
		this.#timestamps.set(key, Date.now());

		while (this.size > this.maxSize) {
			let evicted = false;
			for (const k of super.keys()) {
				if (!this.#staticKeys.has(k)) {
					this.delete(k);
					evicted = true;
					break;
				}
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

	override clear(): void {
		this.#timestamps.clear();
		this.#staticKeys.clear();
		super.clear();
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
}
