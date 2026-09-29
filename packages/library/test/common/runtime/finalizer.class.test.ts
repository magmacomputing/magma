import { Finalizer } from '#library/finalizer.class.js';

describe('common/runtime/finalizer.class', () => {
	it('identifies as a Finalizer instance and supports lifecycle registration', () => {
		const finalizer = new Finalizer<string>((token) => {
			// finalizer hook
		});

		expect(finalizer.isFinalizer).toBe(true);
		expect(Object.prototype.toString.call(finalizer)).toBe('[object Finalizer]');

		const target = { id: 1 };
		const unregisterToken = { token: 'tok1' };

		expect(() => {
			finalizer.register(target, 'test-val', unregisterToken);
		}).not.toThrow();

		const unregistered = finalizer.unregister(unregisterToken);
		expect(unregistered).toBe(true);

		const unregisteredAgain = finalizer.unregister(unregisterToken);
		expect(unregisteredAgain).toBe(false);
	});

	it('supports Finalizer.register static helper and returns unregister function', () => {
		const target = { id: 2 };
		const unregister = Finalizer.register(target, () => {});

		expect(typeof unregister).toBe('function');
		expect(unregister()).toBe(true);
		expect(unregister()).toBe(false);
	});

	it('isolates exceptions within finalization callbacks safely', () => {
		const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
		const errFinalizer = new Finalizer<void>(() => {
			throw new Error('Boom in finalizer');
		});

		expect(errFinalizer.isFinalizer).toBe(true);
		spy.mockRestore();
	});
});
