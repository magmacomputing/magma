import { Tempo } from '#tempo';
import { LICENSE } from '#tempo/support/support.enum.js';
import { getRuntime, resetRuntime } from '#tempo/support/support.runtime.js';
import { encodeBase64 } from '#library';

// vi.hoisted runs before all imports are processed, making these available to hoisted vi.mock calls
const { licenseModulePath, mockFactory } = vi.hoisted(() => {
	// Must use require() here — ES `import` bindings are not yet initialized when vi.hoisted runs
	const path = require('node:path') as typeof import('node:path');
	// Use .js to match the dynamic import('./support/support.license.js') specifier in tempo.class.ts
	const licenseModulePath = path.resolve(__dirname, '../../src/support/support.license.js');
	const mockFactory = () => {
		const verify = vi.fn().mockResolvedValue({
			status: 'active',
			scopes: { astro: {} }
		});
		const Validator = vi.fn().mockImplementation(function () { return { verify }; });
		return { Validator };
	};
	return { licenseModulePath, mockFactory };
});

// 🛡️ Mock both the alias path (#tempo/license) and the resolved absolute path for the
// dynamic import('./support/support.license.js') used in tempo.class.ts (browser-safe relative path)
vi.mock('#tempo/license', mockFactory);
vi.mock(licenseModulePath, mockFactory);

describe('Tempo Licensing Strategy', () => {
	let originalLicenseKeyEnv: string | undefined;

	beforeEach(() => {
		originalLicenseKeyEnv = process.env.TEMPO_LICENSE_KEY;
		delete process.env.TEMPO_LICENSE_KEY;

		// 🏛️ Hard reset the global runtime to ensure test isolation
		resetRuntime();

		vi.clearAllMocks();
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

		// Update mock for this specific test
		const { Validator } = await import(licenseModulePath as any);
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

		const { Validator } = await import(licenseModulePath as any);
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
