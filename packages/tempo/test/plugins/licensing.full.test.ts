import { vi } from 'vitest';
import { Tempo } from '#tempo';
import { getRuntime } from '#tempo/support/support.runtime.js';
import { LICENSE } from '#tempo/support/support.enum.js';

describe('Tempo Licensing Strategy', () => {
	beforeEach(() => {
		// 🏛️ Hard reset the global runtime to ensure test isolation
		const rt = getRuntime();
		delete (rt as any).state;

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
		const mockToken = `header.${Buffer.from(JSON.stringify(payload)).toString('base64')}.signature`;

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
		// This confirms that the engine is aware of the license's intent.
		const terms = Tempo.terms;
		const astro = terms.find((t: any) => t.key === 'astro');

		expect(astro).toBeDefined();
		expect(astro?.description).toContain('Premium plugin');
		expect(astro?.status).toBe(LICENSE.Pending);
	});

	test('Licensing Reckoning (Pledge) is established during init', () => {
		const payload = { permissions: { test: {} } };
		const mockToken = `a.${Buffer.from(JSON.stringify(payload)).toString('base64')}.c`;

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
		const mockToken = `a.${Buffer.from(JSON.stringify(payload)).toString('base64')}.c`;

		Tempo.init({ license: mockToken });

		// Create a local instance
		const local = new Tempo();

		// Local instance should reflect the global license state via its runtime bridge
		// Note: license state isn't copied to local.config, but accessed via global getters.
		expect(Tempo.license.status).toBe(LICENSE.Pending);
		expect(Tempo.license.key).toBe(mockToken);
	});

	test('Discovery cascade: picks up license from globalThis.TEMPO_LICENSE', () => {
		const payload = { permissions: { discovered: {} } };
		const mockToken = `a.${Buffer.from(JSON.stringify(payload)).toString('base64')}.c`;

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
		const mockToken = `a.${Buffer.from(JSON.stringify(payload)).toString('base64')}.c`;

		// 1. Mock the dynamic import of #tempo/license
		vi.mock('#tempo/license', () => {
			return {
				Validator: class {
					constructor(public key: string) { }
					async verify() {
						return {
							status: 'active',
							scopes: { astro: {} }
						};
					}
				}
			}
		});

		Tempo.init({ license: mockToken });
		const rt = getRuntime();

		// Initially pending
		expect(rt.license.status).toBe(LICENSE.Pending);

		// 2. Wait for the Pledge to resolve and the validator logic to trigger
		await rt.license.jws;

		// Give the .then() block in support.init.ts a tick to finish updating state
		await new Promise(r => setTimeout(r, 0));

		// Verify state after reckoning
		expect(rt.license.status).toBe(LICENSE.Active);
		const astro = Tempo.terms.find((t: any) => t.key === 'astro');
		expect(astro?.status).toBe(LICENSE.Active);
	});

	test('Full Reckoning: handles Revoked status correctly', async () => {
		const payload = { permissions: { weather: {} } };
		const mockToken = `a.${Buffer.from(JSON.stringify(payload)).toString('base64')}.c`;

		// Update mock for this specific test
		vi.mocked(await import('#tempo/license')).Validator.prototype.verify = async () => ({
			status: 'revoked',
			scopes: {},
			error: 'License has been revoked'
		});

		Tempo.init({ license: mockToken });
		const rt = getRuntime();

		await rt.license.jws;
		await new Promise(r => setTimeout(r, 0));

		expect(rt.license.status).toBe(LICENSE.Revoked);
		expect(rt.license.error).toBe('License has been revoked');
	});
});
