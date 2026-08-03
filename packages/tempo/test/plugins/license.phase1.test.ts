import { Tempo } from '#tempo';
import { LICENSE } from '#tempo/support/support.enum.js';
import { getRuntime, resetRuntime } from '#tempo/support/support.runtime.js';
import { $updateScopeStatus } from '#tempo/support/support.symbol.js';
import { encodeBase64 } from '#library';

const { licenseModulePath, mockFactory, setMockResult } = vi.hoisted(() => {
	const path = require('node:path') as typeof import('node:path');
	const licenseModulePath = path.resolve(__dirname, '../../src/plugin/license/license.validator.ts');

	let mockResult: any = { status: 'active', scopes: {} };

	const setMockResult = (res: any) => {
		mockResult = res;
	};

	const mockFactory = () => {
		const Validator = vi.fn().mockImplementation(function () {
			return {
				verify: vi.fn().mockImplementation(async () => mockResult)
			}
		});
		return { Validator };
	};

	return { licenseModulePath, mockFactory, setMockResult };
});

vi.mock('#tempo/license', mockFactory);
vi.mock(licenseModulePath, mockFactory);

describe('Phase 1 Core Tempo Licensing Engine Enhancements', () => {
	beforeEach(() => {
		resetRuntime();
		vi.clearAllMocks();
		setMockResult({ status: 'active', scopes: {} });
	});

	test('Tempo[$updateScopeStatus] symbol method programmatically mutates scope status and is protected from public static access', () => {
		// 1. Verify public static access is undefined
		expect((Tempo as any).updateScopeStatus).toBeUndefined();

		const payload = {
			iss: 'Magma Computing',
			scopes: {
				'tempo-plugin-ai': { exp: 2000000000 },
				'tempo-plugin-ticker': { exp: 2000000000 }
			},
			jti: 'test-ai-jwt-1'
		}
		const mockToken = `header.${encodeBase64(JSON.stringify(payload))}.sig`;

		Tempo.init({ license: mockToken });
		const rt = getRuntime();
		rt.license.status = LICENSE.Active;

		expect((Tempo.license as any).scopes['tempo-plugin-ai'].status).toBeUndefined();

		// Update AI scope to revoked via internal symbol
		(Tempo as any)[$updateScopeStatus]('tempo-plugin-ai', 'revoked', 'Quota exceeded or token revoked');

		const snapshot = Tempo.license as any;
		expect(snapshot.scopes['tempo-plugin-ai'].status).toBe('revoked');
		expect(snapshot.scopes['tempo-plugin-ai'].error).toBe('Quota exceeded or token revoked');
		expect(snapshot.scopes['tempo-plugin-ticker'].status).toBeUndefined();
		// Top-level status should remain Active because ticker is still active
		expect(rt.license.status).toBe(LICENSE.Active);

		// Now update ticker to revoked
		(Tempo as any)[$updateScopeStatus]('tempo-plugin-ticker', 'revoked', 'Ticker scope revoked');

		// Now all scopes are revoked -> top-level license state transitions to Revoked
		expect(rt.license.status).toBe(LICENSE.Revoked);
	});

	test('bypasses background revocation promise factory when ALL scopes have skipRevocationCheck: true', async () => {
		const payload = {
			iss: 'Magma Computing',
			scopes: {
				'tempo-plugin-ai': { exp: 2000000000, skipRevocationCheck: true }
			},
			jti: 'ai-only-jwt'
		}
		const mockToken = `h.${encodeBase64(JSON.stringify(payload))}.s`;

		const revocationSpy = vi.fn().mockResolvedValue(true);
		setMockResult({
			status: 'active',
			scopes: payload.scopes,
			getRevocationPromise: revocationSpy
		});

		Tempo.init({ license: mockToken });
		const rt = getRuntime();

		await rt.license.jws;
		await new Promise(r => setTimeout(r, 20));

		// Lazy revocation factory spy should NOT be invoked because skipRevocationCheck is true
		expect(revocationSpy).not.toHaveBeenCalled();
		expect(rt.license.status).toBe(LICENSE.Active);
	});

	test('preserves background revocation promise when ANY scope lacks skipRevocationCheck', async () => {
		const payload = {
			iss: 'Magma Computing',
			scopes: {
				'tempo-plugin-ai': { exp: 2000000000, skipRevocationCheck: true },
				'tempo-plugin-ticker': { exp: 2000000000 } // Lacks skipRevocationCheck!
			},
			jti: 'hybrid-jwt'
		}
		const mockToken = `h.${encodeBase64(JSON.stringify(payload))}.s`;

		const revocationSpy = vi.fn().mockResolvedValue(true);
		setMockResult({
			status: 'active',
			scopes: payload.scopes,
			getRevocationPromise: revocationSpy
		});

		Tempo.init({ license: mockToken });
		const rt = getRuntime();

		await rt.license.jws;
		await vi.waitFor(() => expect(rt.license.status).toBe(LICENSE.Revoked));

		// Revocation factory spy SHOULD be invoked because ticker scope requires client-side background polling!
		expect(revocationSpy).toHaveBeenCalledTimes(1);
		expect(rt.license.status).toBe(LICENSE.Revoked);
		expect(rt.license.error).toContain('revoked');
	});
});
