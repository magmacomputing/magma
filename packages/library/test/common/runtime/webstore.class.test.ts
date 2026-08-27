import { WebStore } from '../../../src/browser/webstore.class.js';

describe('WebStore', () => {
	it('instantiates local and session stores safely', () => {
		const local = WebStore.local;
		const session = WebStore.session;
		expect(local).toBeInstanceOf(WebStore);
		expect(session).toBeInstanceOf(WebStore);
	});

	it('stores and retrieves values seamlessly using get and set', () => {
		const store = new WebStore('local');
		store.set('user', { id: 42, name: 'Alice' });

		const val = store.get<{ id: number; name: string }>('user');
		expect(val).toEqual({ id: 42, name: 'Alice' });
	});

	it('merges object values when set opt.merge is true', () => {
		const store = new WebStore('local');
		store.set('profile', { role: 'admin' });
		store.set('profile', { active: true }, { merge: true });

		const val = store.get<{ role: string; active: boolean }>('profile');
		expect(val).toEqual({ role: 'admin', active: true });
	});

	it('deletes keys using del', () => {
		const store = new WebStore('local');
		store.set('key1', 'val1');
		expect(store.get('key1')).toBe('val1');

		store.del('key1');
		expect(store.get('key1')).toBeNull();
	});

	it('clears storage completely', () => {
		const store = new WebStore('local');
		store.set('a', 1);
		store.set('b', 2);
		expect(store.keys()).toContain('a');

		store.clear();
		expect(store.get('a')).toBeNull();
		expect(store.get('b')).toBeNull();
	});

	it('shares memory storage across WebStore instances by storage name when native storage is unavailable', () => {
		const instance1 = new WebStore('local');
		const instance2 = new WebStore('local');

		instance1.set('sharedKey', 'sharedValue');
		expect(instance2.get('sharedKey')).toBe('sharedValue');
	});

	it('handles write failures in set, del, and clear gracefully', () => {
		const store = new WebStore('local');
		const mockStorage = {
			length: 1,
			getItem: () => null,
			setItem: () => { throw new Error('QuotaExceededError'); },
			removeItem: () => { throw new Error('SecurityError'); },
			clear: () => { throw new Error('ClearError'); },
			key: () => null,
		};
		// @ts-ignore
		store['#resolvedStorage'] = mockStorage;

		expect(() => store.set('test', 'value')).not.toThrow();
		expect(() => store.del('test')).not.toThrow();
		expect(() => store.clear()).not.toThrow();
	});
});
