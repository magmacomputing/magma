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
});
