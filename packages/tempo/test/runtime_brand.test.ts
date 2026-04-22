import { sym, getRuntime, TempoRuntime } from '#tempo/support';

describe('TempoRuntime Cross-Bundle Adoption', () => {
	/**
	 * Helper to safely attempt to set the global bridge slot.
	 * If the slot is non-configurable (locked by a previous getRuntime call),
	 * we may not be able to run adoption tests on the real symbol.
	 */
	function trySetupBridge(mock: any) {
		try {
			const desc = Object.getOwnPropertyDescriptor(globalThis, sym.$Bridge);
			if (desc && !desc.configurable) return false;

			delete (globalThis as any)[sym.$Bridge];
			(globalThis as any)[sym.$Bridge] = mock;
			return true;
		} catch {
			return false;
		}
	}

	test('getRuntime() should adopt an existing object if it has the correct brand symbol', () => {
		const original = (globalThis as any)[sym.$Bridge];

		// 1. Create a mock object with the brand symbol
		const mockRuntime = {
			[sym.$RuntimeBrand]: true,
			isMock: true,
			terms: [],
			pluginsDb: { terms: [], plugins: [] }
		};

		// 2. Pre-populate the global bridge slot
		const ok = trySetupBridge(mockRuntime);
		if (!ok) {
			// If we can't setup the bridge (already locked), check if it's already branded.
			// If it's already branded, we verify that it's correctly returned.
			if (original && original[sym.$RuntimeBrand] === true) {
				const rt = getRuntime();
				expect(rt).toBe(original);
				return;
			}
			console.warn('Skipping mock adoption test: globalThis bridge is already locked by a different runtime instance.');
			return;
		}

		try {
			// 3. Call getRuntime()
			const rt = getRuntime();

			// 4. Verify it adopted the mock
			expect(rt).toBe(mockRuntime);
			expect((rt as any).isMock).toBe(true);
		} finally {
			// Cleanup (if possible)
			try {
				delete (globalThis as any)[sym.$Bridge];
				if (original) (globalThis as any)[sym.$Bridge] = original;
			} catch {
				/* ignore */
			}
		}
	});

	test('TempoRuntime constructor sets the brand symbol', () => {
		const rt = new TempoRuntime();
		expect((rt as any)[sym.$RuntimeBrand]).toBe(true);
	});

	test('getRuntime() should NOT adopt an object lacking the brand symbol', () => {
		const original = (globalThis as any)[sym.$Bridge];

		// 1. Create an object WITHOUT the brand symbol
		const fake = { isFake: true };
		const ok = trySetupBridge(fake);
		if (!ok) {
			// If locked, we can't test "not adopting a fake" on this symbol.
			return;
		}

		try {
			// 2. Call getRuntime()
			const rt = getRuntime();

			// 3. Verify it ignored the fake and created a new one
			expect(rt).not.toBe(fake);
			expect(rt).toBeInstanceOf(TempoRuntime);

			// 4. Verify consecutive calls return the same instance (singleton stability)
			const rt2 = getRuntime();
			expect(rt2).toBe(rt);
			expect(rt2).toBeInstanceOf(TempoRuntime);
		} finally {
			try {
				delete (globalThis as any)[sym.$Bridge];
				if (original) (globalThis as any)[sym.$Bridge] = original;
			} catch {
				/* ignore */
			}
		}
	});

	test('getRuntime() should maintain singleton stability even if the global slot is occupied by an unbranded non-configurable object', () => {
		const original = (globalThis as any)[sym.$Bridge];

		// 1. Force a non-configurable unbranded object into the bridge slot
		const fake = { isFake: true };
		try {
			Object.defineProperty(globalThis, sym.$Bridge, {
				value: fake,
				configurable: false,
				writable: false
			});
		} catch (e) {
			// If already locked by a real runtime, we can't run this specific regression
			return;
		}

		try {
			// 2. Call getRuntime() twice
			const rt1 = getRuntime();
			const rt2 = getRuntime();

			// 3. Verify stability
			expect(rt1).not.toBe(fake);
			expect(rt1).toBeInstanceOf(TempoRuntime);
			expect(rt2).toBe(rt1);
		} finally {
			// Note: We cannot cleanup the non-configurable 'fake' from globalThis in this test
		}
	});
});
