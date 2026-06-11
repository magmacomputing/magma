import { Tempo } from '#tempo';
import { LICENSE } from '#tempo/support/support.enum.js';
import { getRuntime, resetRuntime } from '#tempo/support/support.runtime.js';
import { $Internal } from '#tempo/support';
import { encodeBase64 } from '#library';

// ─── Mock the license validator (same pattern as licensing.full.test.ts) ───────
const { licenseModulePath, mockFactory } = vi.hoisted(() => {
	const path = require('node:path') as typeof import('node:path');
	const licenseModulePath = path.resolve(__dirname, '../../src/plugin/license/license.validator.ts');
	const mockFactory = () => {
		const verify = vi.fn().mockResolvedValue({ status: 'active', scopes: { premium: {} } });
		const Validator = vi.fn().mockImplementation(function () { return { verify }; });
		return { Validator };
	};
	return { licenseModulePath, mockFactory };
});

vi.mock('#tempo/license', mockFactory);
vi.mock(licenseModulePath, mockFactory);

// ─── Helper ───────────────────────────────────────────────────────────────────
function makeToken(payload: object) {
	return `header.${encodeBase64(JSON.stringify(payload))}.sig`;
}

describe('License: Hot-swap (a) and Sandbox Isolation (b)', () => {
	let savedEnvKey: string | undefined;
	let savedGlobalKey: any;

	beforeEach(() => {
		// Stash and clear any real production license keys from the environment
		savedEnvKey = process.env.TEMPO_LICENSE_KEY;
		savedGlobalKey = (globalThis as any).TEMPO_LICENSE_KEY;
		delete process.env.TEMPO_LICENSE_KEY;
		delete (globalThis as any).TEMPO_LICENSE_KEY;

		resetRuntime();
		vi.clearAllMocks();
	});

	afterEach(() => {
		// Restore real keys
		if (savedEnvKey !== undefined) process.env.TEMPO_LICENSE_KEY = savedEnvKey;
		else delete process.env.TEMPO_LICENSE_KEY;
		if (savedGlobalKey !== undefined) (globalThis as any).TEMPO_LICENSE_KEY = savedGlobalKey;
		else delete (globalThis as any).TEMPO_LICENSE_KEY;
	});

	// ─── (a) GLOBAL HOT-SWAP ─────────────────────────────────────────────────

	describe('(a) Global hot-swap via Tempo.extend({ license })', () => {
		it('replaces the global license key and enters Pending state', async () => {
			Tempo.init();
			const token = makeToken({ scopes: { pro: {} }, jti: 'hot-1' });

			Tempo.extend({ license: token } as any);

			// Optimistic state: key is set, status is Pending, scopes decoded from JWT
			const rt = getRuntime();
			expect(rt.license.key).toBe(token);
			expect(rt.license.status).toBe(LICENSE.Pending);
			expect(rt.license.scopes).toHaveProperty('pro');

			await rt.license.jws;
		});

		it('a second hot-swap replaces the first (key and scopes update immediately)', async () => {
			Tempo.init();
			const token1 = makeToken({ scopes: { s1: {} }, jti: 'race-1' });
			const token2 = makeToken({ scopes: { s2: {} }, jti: 'race-2' });

			Tempo.extend({ license: token1 } as any);
			Tempo.extend({ license: token2 } as any);		// immediately replaces token1

			const rt = getRuntime();
			// token2 wins — optimistic state reflects most recent hot-swap
			expect(rt.license.key).toBe(token2);
			expect(rt.license.jti).toBe('race-2');
			expect(rt.license.scopes).toHaveProperty('s2');
			expect(rt.license.scopes).not.toHaveProperty('s1');

			await rt.license.jws;
		});

		it('hot-swap creates a new Pledge for background validation', async () => {
			Tempo.init();
			const token = makeToken({ scopes: { pro: {} }, jti: 'pledge-1' });

			Tempo.extend({ license: token } as any);

			const rt = getRuntime();
			expect(rt.license.jws).toBeDefined();
			expect(rt.license.jws?.isPending).toBe(true);

			await rt.license.jws;
		});
	});

	// ─── (b) SANDBOX ISOLATION ───────────────────────────────────────────────

	describe('(b) Sandbox isolation via Tempo.create({ license })', () => {
		it('sandbox license does NOT touch runtime.license', async () => {
			Tempo.init();
			const token = makeToken({ scopes: { sandbox_scope: {} }, jti: 'sb-1' });

			const X = Tempo.create({ license: token } as any);

			// Global runtime license is untouched
			const rt = getRuntime();
			expect(rt.license.key).toBeUndefined();
			expect(rt.license.status).toBe(LICENSE.None);
			expect(rt.license.scopes).not.toHaveProperty('sandbox_scope');

			await (X as any)[$Internal]().license.jws;
		});

		it('sandbox carries its own LicenseState on state.license', async () => {
			Tempo.init();
			const token = makeToken({ scopes: { local_scope: {} }, jti: 'sb-2' });

			const X = Tempo.create({ license: token } as any);
			const state = (X as any)[$Internal]();

			expect(state.license).toBeDefined();
			expect(state.license.key).toBe(token);
			expect(state.license.status).toBe(LICENSE.Pending);
			expect(state.license.scopes).toHaveProperty('local_scope');

			await state.license.jws;
		});

		it('sandbox remains independent after a later global license hot-swap', async () => {
			Tempo.init();
			const sandboxToken = makeToken({ scopes: { sandbox_scope: {} }, jti: 'sb-hot-swap' });
			const globalToken = makeToken({ scopes: { global_only: {} }, jti: 'g-hot-swap' });

			const X = Tempo.create({ license: sandboxToken } as any);
			Tempo.extend({ license: globalToken } as any);

			expect((X.license as any).jti).toBe('sb-hot-swap');
			expect((X.license as any).scopes).toHaveProperty('sandbox_scope');
			expect(getRuntime().license.jti).toBe('g-hot-swap');
			expect(getRuntime().license.scopes).toHaveProperty('global_only');

			await (X as any)[$Internal]().license.jws;
			await getRuntime().license.jws;
		});

		it('X.license getter reads from sandbox-local state, not global', async () => {
			Tempo.init();
			const globalToken = makeToken({ scopes: { global_only: {} }, jti: 'g-1' });
			Tempo.extend({ license: globalToken } as any);

			const sandboxToken = makeToken({ scopes: { sandbox_only: {} }, jti: 's-1' });
			const X = Tempo.create({ license: sandboxToken } as any);

			// Sandbox reports its own license
			expect((X.license as any).jti).toBe('s-1');
			expect((X.license as any).scopes).toHaveProperty('sandbox_only');
			expect((X.license as any).scopes).not.toHaveProperty('global_only');

			// Global Tempo reports global license
			expect(getRuntime().license.jti).toBe('g-1');

			await (X as any)[$Internal]().license.jws;
			await getRuntime().license.jws;
		});

		it('sandbox license transitions to Active independently', async () => {
			Tempo.init();
			const token = makeToken({ scopes: { sandbox_scope: {} }, jti: 'sb-active' });
			const X = Tempo.create({ license: token } as any);

			const state = (X as any)[$Internal]();
			await state.license.jws;
			await vi.waitFor(() => expect(state.license.status).toBe(LICENSE.Active));

			// Global still untouched
			expect(getRuntime().license.status).toBe(LICENSE.None);
		});

		it('sandbox X.extend({ license }) hot-swaps only the sandbox license', async () => {
			Tempo.init();
			const token1 = makeToken({ scopes: { v1: {} }, jti: 'x-1' });
			const token2 = makeToken({ scopes: { v2: {} }, jti: 'x-2' });

			const X = Tempo.create({ license: token1 } as any);
			X.extend({ license: token2 } as any);

			const state = (X as any)[$Internal]();
			expect(state.license.jti).toBe('x-2');
			expect(state.license.scopes).toHaveProperty('v2');
			// Global license is still untouched
			expect(getRuntime().license.key).toBeUndefined();

			await state.license.jws;
		});

		it('two independent sandboxes each carry isolated license state', async () => {
			Tempo.init();
			const tokenA = makeToken({ scopes: { a: {} }, jti: 'a-1' });
			const tokenB = makeToken({ scopes: { b: {} }, jti: 'b-1' });

			const A = Tempo.create({ license: tokenA } as any);
			const B = Tempo.create({ license: tokenB } as any);

			const stateA = (A as any)[$Internal]();
			const stateB = (B as any)[$Internal]();

			expect(stateA.license.jti).toBe('a-1');
			expect(stateB.license.jti).toBe('b-1');
			// Neither affects the global
			expect(getRuntime().license.key).toBeUndefined();

			await stateA.license.jws;
			await stateB.license.jws;
		});
	});
});
