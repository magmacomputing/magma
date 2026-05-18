import { Tempo } from '#tempo';
import { LICENSE } from '#tempo/support/support.enum.js';
import { getRuntime, resetRuntimeForTesting } from '#tempo/support/support.runtime.js';
import { base64Encode } from '#library';

// 🛡️ Hoist the license module mock to module scope for Vitest
vi.mock('#tempo/license', () => {
	const verify = vi.fn().mockResolvedValue({
		status: 'active',
		scopes: { astro: {} }
	});
	const Validator = vi.fn().mockImplementation(() => ({ verify }));
	return { Validator };
});

const licenseModule = '#tempo/license';

describe('Tempo Licensing Strategy', () => {
	beforeEach(() => {
		// 🏛️ Hard reset the global runtime to ensure test isolation
		resetRuntimeForTesting();

		vi.clearAllMocks();
	});

	test('Tempo is ready-to-receive a license via init options', () => {
		const payload = {
			iss: 'Magma Computing',
			permissions: {
				astro: { exp: 2000000000 },
				weather: { exp: 2000000000 }
			},
			iat: 1700000000,
			exp: 2000000000,
			jti: 'test-token-123'
		}
		// Mock a JWT structure (header.payload.signature)
		const mockToken = `header.${base64Encode(JSON.stringify(payload))}.signature`;

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
		const payload = { permissions: { test: {} } };
		const mockToken = `a.${base64Encode(JSON.stringify(payload))}.c`;

		Tempo.init({ license: mockToken });

		const rt = getRuntime();

		// The 'jws' pledge should be created to handle the eventual background verification
		expect(rt.license.jws).toBeDefined();
		expect(rt.license.jws?.isPending).toBe(true);
		expect(rt.license.jws?.status.tag).toBe('license');
	});

	test('Tempo handles invalid tokens gracefully (optimistic phase)', () => {
		// A completely broken token (no dots)
		Tempo.init({ license: 'invalid-token' });
		const rt = getRuntime();

		// It should still record the key attempt
		expect(rt.license.key).toBe('invalid-token');
		expect(rt.license.status).toBe(LICENSE.Pending);

		// Scopes should be empty because decode failed
		expect(rt.license.scopes).toEqual({});
	});

	test('License state is global and persists across local instances', () => {
		const payload = { permissions: { global: {} } };
		const mockToken = `a.${base64Encode(JSON.stringify(payload))}.c`;

		Tempo.init({ license: mockToken });

		// Create a local instance
		const local = new Tempo();

		// Local instance should reflect the global license state via its runtime bridge
		expect(Tempo.license.status).toBe(LICENSE.Pending);
		expect(Tempo.license.key).toBe(mockToken);
	});

	test('Discovery cascade: picks up license from globalThis.TEMPO_LICENSE', () => {
		const payload = { permissions: { discovered: {} } };
		const mockToken = `a.${base64Encode(JSON.stringify(payload))}.c`;

		// Set global variable
		(globalThis as any).TEMPO_LICENSE = mockToken;

		try {
			Tempo.init();
			const rt = getRuntime();
			expect(rt.license.key).toBe(mockToken);
			expect(rt.license.scopes).toHaveProperty('discovered');
		} finally {
			delete (globalThis as any).TEMPO_LICENSE;
		}
	});

	test('Full Reckoning: transitions from Pending to Active via mock license module', async () => {
		const payload = { permissions: { astro: {} } };
		const mockToken = `a.${base64Encode(JSON.stringify(payload))}.c`;

		Tempo.init({ license: mockToken });
		const rt = getRuntime();

		// Initially pending
		expect(rt.license.status).toBe(LICENSE.Pending);

		// 2. Wait for the Pledge to resolve and the validator logic to trigger
		await rt.license.jws;

		// 🛡️ Deterministic wait for the state transition
		await vi.waitFor(() => expect(rt.license.status).toBe(LICENSE.Active));

		// Verify state after reckoning
		const astro = Tempo.terms.find((t: any) => t.key === 'astro');
		expect(astro?.status).toBe(LICENSE.Active);
	});

	test('Full Reckoning: handles Revoked status correctly', async () => {
		const payload = { permissions: { weather: {} } };
		const mockToken = `a.${base64Encode(JSON.stringify(payload))}.c`;

		// Update mock for this specific test
		const { Validator } = await import(licenseModule as any);
		vi.mocked(Validator).mockReturnValue({
			verify: vi.fn().mockResolvedValue({
				status: 'revoked',
				scopes: {},
				error: 'License has been revoked'
			})
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
		const payload = { permissions: { premium: {} } };
		const mockToken = `a.${base64Encode(JSON.stringify(payload))}.c`;

		const { Validator } = await import(licenseModule as any);
		vi.mocked(Validator).mockReturnValue({
			verify: vi.fn().mockResolvedValue({
				status: 'revoked',
				scopes: { premium: {} },
				error: 'Access denied'
			})
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
