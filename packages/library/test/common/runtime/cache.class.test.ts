import { BoundedCache } from '#library/cache.class.js';

describe('common/runtime/cache.class', () => {
	it('identifies as a BoundedCache and provides basic Map semantics', () => {
		const cache = new BoundedCache<string, string>(10, 60000);
		expect(cache.isBoundedCache).toBe(true);
		expect(Object.prototype.toString.call(cache)).toBe('[object BoundedCache]');

		cache.set('foo', 'bar');
		expect(cache.has('foo')).toBe(true);
		expect(cache.get('foo')).toBe('bar');
		expect(cache.size).toBe(1);

		expect(cache.delete('foo')).toBe(true);
		expect(cache.has('foo')).toBe(false);
		expect(cache.delete('foo')).toBe(false);
	});

	it('evicts LRU items when maxSize is exceeded', () => {
		const cache = new BoundedCache<string, string>(2, 60000);
		cache.set('a', '1');
		cache.set('b', '2');
		cache.set('c', '3'); // 'a' should be evicted

		expect(cache.has('a')).toBe(false);
		expect(cache.get('b')).toBe('2');
		expect(cache.get('c')).toBe('3');
		expect(cache.size).toBe(2);
	});

	it('updates recency when calling get() so accessed items avoid eviction', () => {
		const cache = new BoundedCache<string, string>(2, 60000);
		cache.set('a', '1');
		cache.set('b', '2');

		// Read 'a' to make it most recently used
		expect(cache.get('a')).toBe('1');

		// Insert 'c'. 'b' should be evicted because 'a' was refreshed by get()
		cache.set('c', '3');

		expect(cache.has('b')).toBe(false);
		expect(cache.get('a')).toBe('1');
		expect(cache.get('c')).toBe('3');
		expect(cache.size).toBe(2);
	});

	it('protects static keys from LRU capacity eviction and TTL expiration', () => {
		const cache = new BoundedCache<string, string>(2, 10);
		cache.setStatic('static_term', 'IMMORTAL');
		expect(cache.isStatic('static_term')).toBe(true);
		expect(cache.isStatic('other')).toBe(false);

		cache.set('a', '1');
		cache.set('b', '2'); // 'a' should be evicted, static_term must remain

		expect(cache.has('static_term')).toBe(true);
		expect(cache.get('static_term')).toBe('IMMORTAL');
		expect(cache.has('a')).toBe(false);
		expect(cache.get('b')).toBe('2');
	});

	it('evicts expired entries after TTL has elapsed', async () => {
		const cache = new BoundedCache<string, string>(10, 20); // 20ms TTL
		cache.set('fast', 'expiring');
		expect(cache.has('fast')).toBe(true);

		// Wait for TTL expiration
		await new Promise(resolve => setTimeout(resolve, 35));

		expect(cache.has('fast')).toBe(false);
		expect(cache.get('fast')).toBeUndefined();
		expect(cache.size).toBe(0);
	});

	it('deletes entries by prefix with case-insensitivity', () => {
		const cache = new BoundedCache<string, string>(10, 60000);
		cache.set('geo:sydney', '-33,151');
		cache.set('geo:melbourne', '-37,144');
		cache.set('user:alice', 'token1');

		const deleted = cache.deletePrefix('GEO:');
		expect(deleted).toBe(2);
		expect(cache.has('geo:sydney')).toBe(false);
		expect(cache.has('geo:melbourne')).toBe(false);
		expect(cache.has('user:alice')).toBe(true);
	});

	it('clears all entries or only up to count oldest non-static entries', () => {
		const cache = new BoundedCache<string, string>(10, 60000);
		cache.setStatic('immortal', 'safe');
		cache.set('k1', 'v1');
		cache.set('k2', 'v2');
		cache.set('k3', 'v3');

		cache.clear(2); // Evict 2 oldest non-static entries (k1, k2)
		expect(cache.has('immortal')).toBe(true);
		expect(cache.has('k1')).toBe(false);
		expect(cache.has('k2')).toBe(false);
		expect(cache.has('k3')).toBe(true);

		cache.clear(); // Complete wipe
		expect(cache.size).toBe(0);
		expect(cache.has('immortal')).toBe(false);
	});

	it('provides iterable methods and iterates correctly', () => {
		const cache = new BoundedCache<string, string>(10, 60000);
		cache.set('k1', 'v1');
		cache.set('k2', 'v2');

		expect([...cache.keys()]).toEqual(['k1', 'k2']);
		expect([...cache.values()]).toEqual(['v1', 'v2']);
		expect([...cache.entries()]).toEqual([['k1', 'v1'], ['k2', 'v2']]);
		expect([...cache]).toEqual([['k1', 'v1'], ['k2', 'v2']]);

		const collector: string[] = [];
		cache.forEach((v, k) => collector.push(`${k}=${v}`));
		expect(collector).toEqual(['k1=v1', 'k2=v2']);
	});

	it('serializes to plain JSON object and rehydrates via fromEntries()', () => {
		const cache = new BoundedCache<string, string>(10, 60000);
		cache.set('k1', 'v1');
		cache.set('k2', 'v2');

		expect(cache.toJSON()).toEqual({ k1: 'v1', k2: 'v2' });
		expect(JSON.stringify(cache)).toBe('{"k1":"v1","k2":"v2"}');

		const rehydrated = BoundedCache.fromEntries(cache.entries(), 5, 30000);
		expect(rehydrated.get('k1')).toBe('v1');
		expect(rehydrated.get('k2')).toBe('v2');
		expect(rehydrated.maxSize).toBe(5);
		expect(rehydrated.ttl).toBe(30000);
	});

	it('filters out non-string keys in toJSON to avoid key collision', () => {
		const cache = new BoundedCache<any, string>(10, 60000);
		cache.set(123, 'number_key');
		cache.set('123', 'string_key');

		expect(cache.toJSON()).toEqual({ '123': 'string_key' });
	});

	it('supports per-entry custom TTL overrides when default ttl is Infinity', async () => {
		const cache = new BoundedCache<string, string>(10, Infinity);
		cache.set('permanent', 'stays');
		cache.set('short_lived', 'expires_soon', 25); // 25ms TTL

		expect(cache.get('permanent')).toBe('stays');
		expect(cache.get('short_lived')).toBe('expires_soon');

		await new Promise(resolve => setTimeout(resolve, 40));

		expect(cache.get('permanent')).toBe('stays');
		expect(cache.has('short_lived')).toBe(false);
		expect(cache.get('short_lived')).toBeUndefined();
	});

	it('preserves absolute expiration deadline without renewal on get() or set() updates', async () => {
		const cache = new BoundedCache<string, string>(10, 40); // 40ms TTL
		cache.set('item', 'v1');

		// Access item at 20ms
		await new Promise(resolve => setTimeout(resolve, 20));
		expect(cache.get('item')).toBe('v1');

		// Update item value at 25ms without specifying a new TTL
		cache.set('item', 'v2');
		expect(cache.get('item')).toBe('v2');

		// Wait past original 40ms deadline (e.g. at 55ms total)
		await new Promise(resolve => setTimeout(resolve, 35));

		// Must be expired because original absolute deadline was not renewed
		expect(cache.has('item')).toBe(false);
		expect(cache.get('item')).toBeUndefined();
	});
});

