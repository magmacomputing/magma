/**
 * In-memory and universal storage cache for holiday calendars with TTL support.
 */

interface CacheEntry<T> {
	value: T;
	expiresAt: number;
}

const memoryStore = new Map<string, CacheEntry<unknown>>();

/**
 * Retrieves a cached item if not expired.
 *
 * @param key - Storage key
 * @returns Cached value or undefined
 */
export function getStorage<T>(key: string): T | undefined {
	const entry = memoryStore.get(key);
	if (!entry) return undefined;
	if (Date.now() > entry.expiresAt) {
		memoryStore.delete(key);
		return undefined;
	}
	return entry.value as T;
}

/**
 * Stores an item in cache with a TTL.
 *
 * @param key - Storage key
 * @param value - Value to cache
 * @param options - Options with ttl in milliseconds
 */
export function setStorage<T>(key: string, value: T, options?: { ttl?: number }): void {
	const ttl = options?.ttl ?? 24 * 60 * 60 * 1000;
	memoryStore.set(key, {
		value,
		expiresAt: Date.now() + ttl,
	});
}

/**
 * Clears all entries in the holiday storage cache.
 */
export function clearStorage(): void {
	memoryStore.clear();
}
