import { Tempo } from '#tempo';
import { LICENSE } from '#tempo/support/support.enum.js';
import { getRuntime, resetRuntime } from '#tempo/support/support.runtime.js';
import { encodeBase64 } from '#library';

// vi.hoisted runs before all imports are processed, making these available to hoisted vi.mock calls
const { licenseModulePath, mockFactory, getVerifyFn } = vi.hoisted(() => {
	// Must use require() here — ES `import` bindings are not yet initialized when vi.hoisted runs
	const path = require('node:path') as typeof import('node:path');
	// Use .ts to match the resolved path of the #tempo/license alias (src/license/license.validator.ts)
	const licenseModulePath = path.resolve(__dirname, '../../src/license/license.validator.ts');

	// A shared, mutable reference to the verify implementation.
	// Both vi.mock() factories point at this ref so per-test overrides are visible to both
	// the '#tempo/license' import (used by license.manager.ts) and the licenseModulePath import.
	let currentVerify = vi.fn().mockResolvedValue({
		status: 'active',
		scopes: { astro: {} }
	});

	const mockFactory = () => {
		const Validator = vi.fn().mockImplementation(function () {
			return { verify: (...args: any[]) => currentVerify(...args) };
		});
		return { Validator };
	};

	const getVerifyFn = () => currentVerify;
	const setVerifyFn = (fn: ReturnType<typeof vi.fn>) => { (currentVerify as any) = fn; };

	return { licenseModulePath, mockFactory, getVerifyFn, setVerifyFn };
});

// 🛡️ Mock the license module via its alias AND the resolved absolute .ts path so that
// both validateLicenseState (which uses '#tempo/license') and direct imports of licenseModulePath
// in tests hit the same shared mock factory.
vi.mock('#tempo/license', mockFactory);
vi.mock(licenseModulePath, mockFactory);

describe('Tempo Licensing Strategy', () => {
	let originalLicenseKeyEnv: string | undefined;

	beforeEach(async () => {
		originalLicenseKeyEnv = process.env.TEMPO_LICENSE_KEY;
		delete process.env.TEMPO_LICENSE_KEY;

		// 🏛️ Hard reset the global runtime to ensure test isolation
		resetRuntime();

		// Clear call history first, then restore the default mock implementation.
		// Order matters: clearAllMocks() resets implementations too, so the restore must come after.
		vi.clearAllMocks();

		// 🔄 Restore Validator mock to the default 'active' implementation before each test.
		// Tests that override Validator (e.g. Revoked tests) would otherwise bleed into
		// subsequent tests since vi.clearAllMocks() only clears history, not implementations.
		const { Validator } = await import('#tempo/license' as any);
		vi.mocked(Validator).mockImplementation(function () {
			return {
				verify: vi.fn().mockResolvedValue({ status: 'active', scopes: { astro: {} } })
			};
		});
	});

	afterEach(() => {
		if (originalLicenseKeyEnv !== undefined) {
			process.env.TEMPO_LICENSE_KEY = originalLicenseKeyEnv;
		} else {
			delete process.env.TEMPO_LICENSE_KEY;
		}
	});

	test('Tempo is ready-to-receive a license via init options', () => {
		const payload = {
			iss: 'Magma Computing',
			scopes: {
				astro: { exp: 2000000000 },
				weather: { exp: 2000000000 }
			},
			iat: 1700000000,
			exp: 2000000000,
			jti: 'test-token-123'
		}
		// Mock a JWT structure (header.payload.signature)
		const mockToken = `header.${encodeBase64(JSON.stringify(payload))}.signature`;

		Tempo.init({ license: mockToken });
		const rt = getRuntime();

		// 1. Verify optimistic state hydration from JWT
		expect(rt.license.key).toBe(mockToken);
		expect(rt.license.status).toBe(LICENSE.Pending);
		expect(rt.license.scopes).toHaveProperty('astro');
		expect(rt.license.scopes).toHaveProperty('weather');
		expect(rt.license.jti).toBe('test-token-123');
		expect(rt.license.issuer).toBe('Magma Computing');
		expect(rt.license.expires).toBe(2000000000);

		// 2. Verify that Tempo.terms shows the claimed "Premium" status even before registration
		const terms = Tempo.terms;
		const astro = terms.find((t: any) => t.key === 'astro');

		expect(astro).toBeDefined();
		expect(astro?.description).toContain('Premium plugin');
		expect(astro?.status).toBe(LICENSE.Pending);
	});

	test('Licensing Reckoning (Pledge) is established during init', () => {
		const payload = { scopes: { test: {} } };
		const mockToken = `a.${encodeBase64(JSON.stringify(payload))}.c`;

		Tempo.init({ license: mockToken });

		const rt = getRuntime();

		// The 'jws' pledge should be created to handle the eventual background verification
		expect(rt.license.jws).toBeDefined();
		expect(rt.license.jws?.isPending).toBe(true);
		expect(rt.license.jws?.status.tag).toBe('license');
	});

	test('Tempo handles invalid tokens gracefully (optimistic phase)', async () => {
		// A completely broken token (no dots)
		Tempo.init({ license: 'invalid-token' });
		await Promise.resolve();
		const rt = getRuntime();

		// It should still record the key attempt
		expect(rt.license.key).toBe('invalid-token');
		expect(rt.license.status).toBe(LICENSE.Pending);

		// Scopes should be empty because decode failed
		expect(rt.license.scopes).toEqual({});
	});

	test('License state is global and persists across local instances', async () => {
		const payload = { scopes: { global: {} } };
		const mockToken = `a.${encodeBase64(JSON.stringify(payload))}.c`;

		Tempo.init({ license: mockToken });
		const rt = getRuntime();
		await rt.license.jws;
		await vi.waitFor(() => expect(rt.license.status).toBe(LICENSE.Active));

		// Create a local instance
		const local = new Tempo();

		// Local instance should reflect the global license state via its runtime bridge
		expect(Tempo.license.status).toBe(LICENSE.Active);
		expect((Tempo.license as any).key).toBeUndefined();
	});

	test('Tempo.license returns a safe external snapshot and omits internal jws', async () => {
		const payload = { scopes: { astro: {} }, jti: 'snapshot-1' };
		const mockToken = `a.${encodeBase64(JSON.stringify(payload))}.c`;

		Tempo.init({ license: mockToken });
		const rt = getRuntime();
		await rt.license.jws;
		await vi.waitFor(() => expect(rt.license.status).toBe(LICENSE.Active));

		const snapshot = Tempo.license as any;
		expect(snapshot).not.toBe(rt.license);
		expect(snapshot.jws).toBeUndefined();
		expect(snapshot.key).toBeUndefined();
		expect(getRuntime().license.key).toBe(mockToken);

		const originalStatus = snapshot.status;
		try { snapshot.status = LICENSE.None } catch {
			// secure proxy may reject external mutation attempts
		}

		expect(getRuntime().license.status).toBe(originalStatus);
		expect((Tempo.license as any).status).toBe(originalStatus);
	});

	test('Discovery cascade: picks up license from globalThis.TEMPO_LICENSE_KEY', () => {
		const payload = { scopes: { discovered_key: {} } };
		const mockToken = `a.${encodeBase64(JSON.stringify(payload))}.c`;

		// Set global variable
		(globalThis as any).TEMPO_LICENSE_KEY = mockToken;

		try {
			Tempo.init();
			const rt = getRuntime();
			expect(rt.license.key).toBe(mockToken);
			expect(rt.license.scopes).toHaveProperty('discovered_key');
		} finally {
			delete (globalThis as any).TEMPO_LICENSE_KEY;
		}
	});

	test('Discovery cascade: picks up license from process.env.TEMPO_LICENSE_KEY', () => {
		const payload = { scopes: { env_key: {} } };
		const mockToken = `a.${encodeBase64(JSON.stringify(payload))}.c`;

		// Set env variable
		process.env.TEMPO_LICENSE_KEY = mockToken;

		try {
			Tempo.init();
			const rt = getRuntime();
			expect(rt.license.key).toBe(mockToken);
			expect(rt.license.scopes).toHaveProperty('env_key');
		} finally {
			delete process.env.TEMPO_LICENSE_KEY;
		}
	});

	test('Full Reckoning: transitions from Pending to Active via mock license module', async () => {
		const payload = { scopes: { astro: {} } };
		const mockToken = `a.${encodeBase64(JSON.stringify(payload))}.c`;

		Tempo.init({ license: mockToken });

		// Wait for the Pledge to resolve and the validator logic to trigger
		await getRuntime().license.jws;
		await vi.waitFor(() => expect(getRuntime().license.status).toBe(LICENSE.Active));

		const rt = getRuntime();
		expect(rt.license.status).toBe(LICENSE.Active);

		// Verify state after reckoning
		// Because resetRuntime was called before this test, Tempo.terms does not contain astro natively 
		// unless we manually add it or the test loaded it. So we don't strictly test Tempo.terms here, 
		// but rather test that rt.license.scopes has the expected payload.
		expect(rt.license.scopes).toHaveProperty('astro');
	});

	test('Full Reckoning: handles Revoked status correctly', async () => {
		const payload = { scopes: { weather: {} } };
		const mockToken = `a.${encodeBase64(JSON.stringify(payload))}.c`;

		// Override the shared verify ref so BOTH '#tempo/license' and licenseModulePath
		// mocks return 'revoked'. This avoids the split-brain problem where the .js-path
		// module and the .ts alias are separate Vitest module instances.
		const { Validator } = await import('#tempo/license' as any);
		vi.mocked(Validator).mockImplementation(function () {
			return {
				verify: vi.fn().mockResolvedValue({
					status: 'revoked',
					scopes: {},
					error: 'License has been revoked'
				})
			};
		} as any);

		Tempo.init({ license: mockToken });
		const rt = getRuntime();

		await rt.license.jws;
		await vi.waitFor(() => expect(rt.license.status).toBe(LICENSE.Revoked));

		expect(rt.license.status).toBe(LICENSE.Revoked);
		expect(rt.license.error).toBe('License has been revoked');
	});

	test('Eager Discovery Guard: blocks premium plugins when license is revoked', async () => {
		// 1. Mock a revoked license for 'premium' scope
		const payload = { scopes: { premium: {} } };
		const mockToken = `a.${encodeBase64(JSON.stringify(payload))}.c`;

		const { Validator } = await import('#tempo/license' as any);
		vi.mocked(Validator).mockImplementation(function () {
			return {
				verify: vi.fn().mockResolvedValue({
					status: 'revoked',
					scopes: { premium: {} },
					error: 'Access denied'
				})
			};
		} as any);

		Tempo.init({ license: mockToken });

		// 2. Register a plugin that belongs to the 'premium' scope
		Tempo.extend([{
			key: 'premium',
			description: 'A premium term',
			define: () => 'result'
		}]);

		const rt = getRuntime();
		await rt.license.jws;
		await vi.waitFor(() => expect(rt.license.status).toBe(LICENSE.Revoked));

		expect(rt.license.status).toBe(LICENSE.Revoked);

		// 3. Try to access the premium term on a NEW instance (which triggers eager discovery by default in tests)
		const t = new Tempo();

		// It should be undefined because the guard blocked it in #discover
		expect((t as any).premium).toBeUndefined();
	});
});
