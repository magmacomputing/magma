import { secure } from '#library/proxy.library.js';
import type * as t from '../tempo.type.js';

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
