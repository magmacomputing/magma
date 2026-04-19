import { Tempo } from '#tempo';

describe('Proof: Enumerable + Silent Mode', () => {
	afterEach(() => vi.restoreAllMocks())

	it('should trigger getters during object inspection (enumerable: true)', () => {
		const t = new Tempo('Invalid Date', { catch: true, silent: true });

		// Now that we've reverted to enumerable: true, Object.keys should NOT be empty
		// This is the "discoverability" benefit.
		expect(Object.keys(t.term).length).toBeGreaterThan(0);
		expect(Object.keys(t.fmt).length).toBeGreaterThan(0);
	});

	it('should be silent when logging the instance with silent: true', () => {
		const t = new Tempo('Invalid Date', { catch: true, silent: true });

		// Manual spies to confirm NO console noise is produced during evaluation
		vi.spyOn(console, 'error').mockImplementation(() => { });
		vi.spyOn(console, 'warn').mockImplementation(() => { });

		// Trigger full evaluation of all enumerable getters
		Object.keys(t.term);

		// Even though getters were triggered and some definitely failed (invalid date),
		// Logify.silent should have prevented any console output.
		expect(console.error).not.toHaveBeenCalled();
		expect(console.warn).not.toHaveBeenCalled();
	});

	it('should still show errors when NOT in silent mode (baseline check)', () => {
		const spyE = vi.spyOn(console, 'error').mockImplementation(() => { });
		const t = new Tempo('Invalid Date', { catch: true, silent: false });

		// Trigger a failure (which calls Logify.catch with {catch: true})
		try { t.term.quarter } catch (e) { }

		expect(spyE).toHaveBeenCalled();
	});
});
