import { WeakCache } from '#library/weakcache.class.js';

describe('common/runtime/weakcache.class', () => {
	it('identifies as a WeakCache and provides basic cache semantics', () => {
		const cache = new WeakCache<string, { id: number }>();
		expect(cache.isWeakCache).toBe(true);
		expect(Object.prototype.toString.call(cache)).toBe('[object WeakCache]');

		const item = { id: 1 };
		cache.set('key1', item);
		expect(cache.has('key1')).toBe(true);
		expect(cache.get('key1')).toBe(item);

		expect(cache.delete('key1')).toBe(true);
		expect(cache.has('key1')).toBe(false);
		expect(cache.get('key1')).toBeUndefined();
		expect(cache.delete('key1')).toBe(false);
	});

	it('supports getOrSet factory helper', () => {
		const cache = new WeakCache<string, { count: number }>();
		let factoryRuns = 0;
		const factory = (k: string) => {
			factoryRuns++;
			return { count: k.length };
		};

		const val1 = cache.getOrSet('test', factory);
		expect(val1).toEqual({ count: 4 });
		expect(factoryRuns).toBe(1);

		const val2 = cache.getOrSet('test', factory);
		expect(val2).toBe(val1);
		expect(factoryRuns).toBe(1);
	});

	it('handles overwrite and clear properly', () => {
		const cache = new WeakCache<string, { name: string }>();
		const itemA = { name: 'A' };
		const itemB = { name: 'B' };

		cache.set('key', itemA);
		expect(cache.get('key')).toBe(itemA);

		cache.set('key', itemB);
		expect(cache.get('key')).toBe(itemB);

		cache.clear();
		expect(cache.has('key')).toBe(false);
		expect(cache.get('key')).toBeUndefined();
	});

	it('works with primitive string keys without throwing unregister token errors', () => {
		const cache = new WeakCache<string, { date: string }>();
		const dateObj = { date: '2026-09-28' };

		expect(() => {
			cache.set('iso:2026-09-28', dateObj);
			cache.delete('iso:2026-09-28');
		}).not.toThrow();
	});
});
