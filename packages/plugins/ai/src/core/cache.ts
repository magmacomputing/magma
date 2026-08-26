import { Tempo } from '@magmacomputing/tempo';
import { secure, isNumber } from '@magmacomputing/tempo/library';
import { _state } from './init.js';
import { logDebug, warnDebug } from './logger.js';
import type { AiCacheAdapter } from '../types/index.js';

export const AI_CACHE_NAMESPACE_PREFIX = 'ai:';

const _entryExpiries = new Map<string, number>();

/**
 * Normalizes input string for deterministic cache lookups by trimming excess whitespace and lowercasing.
 *
 * @param input - Raw input string to normalize
 * @returns Normalized cache key string
 */
export function normalizeCacheInput(input: string): string {
	return input.trim().toLowerCase().replace(/\s+/g, ' ');
}

/**
 * Generates a namespaced cache key for domain-specific AI functions.
 *
 * @param namespace - The functional namespace (e.g., 'parse', 'format', 'diff')
 * @param key - The specific cache key within the namespace
 * @returns Fully namespaced cache key string
 */
export function getNamespacedCacheKey(namespace: string, key: string): string {
	return `${AI_CACHE_NAMESPACE_PREFIX}${namespace}::${key}`;
}

/**
 * Reads from multi-tier cache (Tier 2 external async adapter first, Tier 1 local in-memory Tempo.cache fallback).
 *
 * @param cacheKey - The cache key to retrieve
 * @param options - Cache read options including force, cache toggle, adapter, debug, and tag
 * @returns The cached string value, or undefined if not found or cache is disabled
 */
export async function readMultiTierCache(
	cacheKey: string,
	options: {
		force?: boolean | undefined;
		cache?: boolean | undefined;
		cacheAdapter?: AiCacheAdapter | undefined;
		debug?: boolean | undefined;
		tag?: string | undefined;
	},
): Promise<string | undefined> {
	if (options.force) return undefined;
	if (options.cache === false || _state.config.cache === false) return undefined;

	const tag = options.tag ?? 'tempo-plugin-ai';
	const adapter = options.cacheAdapter || _state.config.cacheAdapter;
	if (adapter) {
		try {
			const val = await adapter.get(cacheKey);
			if (val !== undefined && val !== null) {
				logDebug(tag, `Cache hit (adapter): ${cacheKey}`, undefined, { debug: options.debug });
				return val;
			}
		} catch (err: any) {
			warnDebug(tag, `Cache adapter get failed for ${cacheKey}`, err, { debug: options.debug });
		}
	}

	if (_entryExpiries.has(cacheKey) && Date.now() > _entryExpiries.get(cacheKey)!) {
		_entryExpiries.delete(cacheKey);
		Tempo.cache.delete(cacheKey);
		return undefined;
	}

	const localVal = Tempo.cache.get(cacheKey);
	if (localVal !== undefined) {
		logDebug(tag, `Cache hit (local): ${cacheKey}`, undefined, { debug: options.debug });
		return localVal;
	}

	return undefined;
}

/**
 * Writes to multi-tier cache (Tier 1 local in-memory Tempo.cache and Tier 2 external async adapter).
 *
 * @param cacheKey - The cache key to store
 * @param value - The string value to cache
 * @param ttl - Time-to-live in milliseconds
 * @param options - Cache write options including cache toggle, adapter, debug, and tag
 */
export async function writeMultiTierCache(
	cacheKey: string,
	value: string,
	ttl: number,
	options: {
		cache?: boolean | undefined;
		cacheAdapter?: AiCacheAdapter | undefined;
		debug?: boolean | undefined;
		tag?: string | undefined;
	},
): Promise<void> {
	if (options.cache === false || _state.config.cache === false) return;

	const tag = options.tag ?? 'tempo-plugin-ai';
	Tempo.cache.set(cacheKey, value);
	if (isNumber(ttl) && ttl > 0) {
		_entryExpiries.set(cacheKey, Date.now() + ttl);
	} else {
		_entryExpiries.delete(cacheKey);
	}

	const adapter = options.cacheAdapter || _state.config.cacheAdapter;
	if (adapter) {
		try {
			await adapter.set(cacheKey, value, ttl);
		} catch (err: any) {
			warnDebug(tag, `Cache adapter set failed for ${cacheKey}`, err, { debug: options.debug });
		}
	}
}

/**
 * ## aiCache
 * Unified, secure multi-tier cache manager for the Tempo AI plugin suite.
 * Manages both local in-memory `Tempo.cache` (Tier 1) and external distributed storage adapters (Tier 2).
 *
 * Protected with `secure()` proxy to prevent direct external manipulation while providing a full store interface.
 */
export const aiCache = secure({
	/**
	 * Clears AI entries from the in-memory cache and any external storage adapters.
	 * If specific input strings or keys are provided, selectively purges only those entries and prefix trees.
	 *
	 * @param input - Optional string key, input prompt, or array of keys to purge
	 * @returns Promise that resolves once cache eviction is complete
	 */
	async clear(input?: string | string[]): Promise<void> {
		const adapter = _state.config.cacheAdapter;

		if (!input) {
			Tempo.cache.clear();
			_entryExpiries.clear();
			if (adapter?.clear) {
				try {
					await Promise.resolve(adapter.clear()).catch(() => { });
				} catch { }
			}
			return;
		}

		const inputs = Array.isArray(input) ? input : [input];
		for (const i of inputs) {
			const normalized = normalizeCacheInput(i);
			const prefix = `${normalized}::`;
			Tempo.cache.delete(normalized);
			Tempo.cache.delete(i);
			Tempo.cache.deletePrefix(prefix);
			_entryExpiries.delete(normalized);
			_entryExpiries.delete(i);

			const keysToDelete: string[] = [];
			for (const [key] of Tempo.cache.entries()) {
				if (key.includes(normalized) || key.includes(i)) {
					keysToDelete.push(key);
				}
			}
			for (const k of keysToDelete) {
				Tempo.cache.delete(k);
				_entryExpiries.delete(k);
			}

			if (adapter) {
				try {
					if (adapter.delete) {
						await Promise.resolve(adapter.delete(normalized)).catch(() => { });
						await Promise.resolve(adapter.delete(i)).catch(() => { });
						for (const k of keysToDelete) {
							await Promise.resolve(adapter.delete(k)).catch(() => { });
						}
					}
					if (adapter.clear) {
						await Promise.resolve(adapter.clear(prefix)).catch(() => { });
					}
				} catch { }
			}
		}
	},

	/**
	 * Deletes a specific key from both Tier 1 in-memory cache and Tier 2 storage adapter.
	 *
	 * @param key - The cache key to delete
	 * @returns True if the key was present in the in-memory cache, false otherwise
	 */
	async delete(key: string): Promise<boolean> {
		_entryExpiries.delete(key);
		const deletedLocal = Tempo.cache.delete(key);
		const adapter = _state.config.cacheAdapter;
		if (adapter?.delete) {
			try {
				await Promise.resolve(adapter.delete(key)).catch(() => { });
			} catch { }
		}
		return deletedLocal;
	},

	/**
	 * Retrieves a cached string by key across multi-tier storage.
	 *
	 * @param key - The cache key to fetch
	 * @returns The cached string value, or undefined if not found
	 */
	async get(key: string): Promise<string | undefined> {
		if (_entryExpiries.has(key) && Date.now() > _entryExpiries.get(key)!) {
			_entryExpiries.delete(key);
			Tempo.cache.delete(key);
			return undefined;
		}

		const adapter = _state.config.cacheAdapter;
		if (adapter?.get) {
			try {
				const val = await adapter.get(key);
				if (val !== undefined && val !== null) return val;
			} catch { }
		}
		return Tempo.cache.get(key);
	},

	/**
	 * Checks if a key exists in either Tier 1 in-memory cache or Tier 2 storage adapter.
	 *
	 * @param key - The cache key to check
	 * @returns True if the key exists, false otherwise
	 */
	async has(key: string): Promise<boolean> {
		const val = await this.get(key);
		return val !== undefined;
	},

	/**
	 * Sets a string value into multi-tier cache with an optional TTL.
	 *
	 * @param key - The cache key
	 * @param value - The serialized string value to cache
	 * @param ttl - Optional TTL in milliseconds
	 */
	async set(key: string, value: string, ttl?: number): Promise<void> {
		Tempo.cache.set(key, value);
		if (isNumber(ttl) && ttl > 0) {
			_entryExpiries.set(key, Date.now() + ttl);
		} else {
			_entryExpiries.delete(key);
		}

		const adapter = _state.config.cacheAdapter;
		if (adapter?.set) {
			try {
				await adapter.set(key, value, ttl);
			} catch { }
		}
	},

	/**
	 * Returns an iterator over active in-memory cache entries.
	 */
	entries(): IterableIterator<[string, string]> {
		return Tempo.cache.entries();
	},

	/**
	 * Returns a plain object snapshot of active in-memory cache entries.
	 */
	toJSON(): Record<string, string> {
		return Tempo.cache.toJSON();
	},
});

