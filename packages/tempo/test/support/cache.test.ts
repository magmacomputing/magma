import { Tempo } from '#tempo';
import { BoundedCache } from '../../src/support/support.cache.js';

describe('Tempo Core Caching Architecture', () => {
	beforeEach(() => {
		Tempo.cache.clear();
	});

	describe('BoundedCache Engine', () => {
		it('should evict LRU items when maxSize is exceeded', () => {
			const cache = new BoundedCache<string, string>(2, 10000);
			cache.set('a', '1');
			cache.set('b', '2');
			cache.set('c', '3'); // 'a' should be evicted

			expect(cache.has('a')).toBe(false);
			expect(cache.get('b')).toBe('2');
			expect(cache.get('c')).toBe('3');
			expect(cache.size).toBe(2);
		});

		it('should update recency when calling get() so accessed items avoid eviction', () => {
			const cache = new BoundedCache<string, string>(2, 10000);
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

		it('should protect static keys from LRU capacity eviction', () => {
			const cache = new BoundedCache<string, string>(2, 10000);
			cache.setStatic('static_term', 'IMMORTAL');
			cache.set('a', '1');
			cache.set('b', '2'); // 'a' should be evicted, not static_term

			expect(cache.has('static_term')).toBe(true);
			expect(cache.get('static_term')).toBe('IMMORTAL');
			expect(cache.has('a')).toBe(false);
			expect(cache.get('b')).toBe('2');
		});

		it('should serialize and rehydrate via entries() and fromEntries()', () => {
			const cache = new BoundedCache<string, string>(10, 10000);
			cache.set('k1', 'v1');
			cache.set('k2', 'v2');

			const serialized = [...cache.entries()];
			expect(serialized).toEqual([['k1', 'v1'], ['k2', 'v2']]);

			const rehydrated = BoundedCache.fromEntries(serialized);
			expect(rehydrated.get('k1')).toBe('v1');
			expect(rehydrated.get('k2')).toBe('v2');
		});

		it('should clear specific count of oldest non-static entries', () => {
			const cache = new BoundedCache<string, string>(10, 10000);
			cache.setStatic('immortal', '1');
			cache.set('k1', 'v1');
			cache.set('k2', 'v2');
			cache.set('k3', 'v3');

			cache.clear(2); // Evicts k1 and k2

			expect(cache.has('immortal')).toBe(true);
			expect(cache.has('k1')).toBe(false);
			expect(cache.has('k2')).toBe(false);
			expect(cache.has('k3')).toBe(true);
		});
	});

	describe('Tempo.CACHE Enum & Facade', () => {
		it('should expose Tempo.CACHE enum values', () => {
			expect(Tempo.CACHE.Off).toBe(false);
			expect(Tempo.CACHE.On).toBe(true);
			expect(Tempo.CACHE.Refresh).toBe('refresh');
		});

		it('should expose normalized Tempo.cache facade methods', () => {
			Tempo.cache.set('  MY_TERM  ', '2026-05-10');
			expect(Tempo.cache.has('my_term')).toBe(true);
			expect(Tempo.cache.get('my_term')).toBe('2026-05-10');

			Tempo.cache.delete('MY_TERM');
			expect(Tempo.cache.has('my_term')).toBe(false);
		});

		it('should resolve static glossary terms instantly and record glossary source in parse result', () => {
			Tempo.cache.setStatic('eoy_party', '2026-12-31T18:00:00');

			const instance = new Tempo('eoy_party');
			expect(instance.isValid).toBe(true);
			expect(instance.format('{yyyy}-{mm}-{dd}')).toBe('2026-12-31');

			const hit = instance.parse.result.find((r: any) => r.match === 'CacheHit');
			expect(hit).toBeDefined();
			expect(hit?.source).toBe('glossary');
		});

		it('should resolve dynamic parse cache when opt-in cache: true is passed', () => {
			const t1 = new Tempo('2026-08-15', { cache: true });
			expect(t1.isValid).toBe(true);

			// Second instantiation uses dynamic cache
			const t2 = new Tempo('2026-08-15', { cache: true });
			expect(t2.isValid).toBe(true);

			const hit = t2.parse.result.find((r: any) => r.match === 'CacheHit');
			expect(hit).toBeDefined();
			expect(hit?.source).toBe('parseCache');
		});
	});
});
