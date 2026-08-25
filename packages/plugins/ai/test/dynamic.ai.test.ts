import { fetchFromProvider, resolveAnchorTempo, resolveFullContext } from '../src/core/support.js';
import { TempoAiError } from '../src/core/error.js';
import { resetAI, initAI } from '../src/core/init.js';
import { Tempo } from '@magmacomputing/tempo';

describe('AI Dynamic Evaluation Infrastructure', () => {
	const originalFetch = globalThis.fetch;

	beforeEach(async () => {
		resetAI();
		await initAI({
			remoteConfigUrl: false,
		});
	});

	afterEach(() => {
		globalThis.fetch = originalFetch;
		vi.restoreAllMocks();
	});

	describe('Dynamic API Key Rotation & Async Suppliers', () => {
		it('should invoke async key supplier on every provider dispatch', async () => {
			let counter = 0;
			const keySupplier = vi.fn().mockImplementation(async () => {
				return `ephemeral-token-${++counter}`;
			});

			const authHeaders: string[] = [];
			globalThis.fetch = vi.fn().mockImplementation(async (url: any, init: any) => {
				authHeaders.push(init?.headers?.Authorization);
				return {
					ok: true,
					json: async () => ({
						choices: [{ message: { content: JSON.stringify({ iso: '2026-05-01T00:00:00', confidence: 0.95 }) } }],
					}),
					headers: new Headers(),
				} as any;
			});

			const provider = {
				id: 'custom-provider',
				url: 'https://api.openai.com/v1/chat/completions',
				model: 'gpt-4o',
				key: keySupplier,
			};

			const res1 = await fetchFromProvider(provider, 'next Friday', 'Context');
			expect(res1.providerId).toBe('custom-provider');
			expect(authHeaders[0]).toBe('Bearer ephemeral-token-1');

			const res2 = await fetchFromProvider(provider, 'next Monday', 'Context');
			expect(res2.providerId).toBe('custom-provider');
			expect(authHeaders[1]).toBe('Bearer ephemeral-token-2');

			expect(keySupplier).toHaveBeenCalledTimes(2);
		});

		it('should propagate errors when an async key supplier rejects', async () => {
			const failingKeySupplier = vi.fn().mockImplementation(async () => {
				throw new Error('Vault connection timed out');
			});

			const provider = {
				id: 'vault-provider',
				url: 'https://api.openai.com/v1/chat/completions',
				model: 'gpt-4o',
				key: failingKeySupplier,
			};

			await expect(fetchFromProvider(provider, 'today', 'Context')).rejects.toThrow(TempoAiError);
		});
	});

	describe('Dynamic URL and Model Resolution', () => {
		it('should evaluate dynamic URL and Model suppliers per request', async () => {
			let activeModel = 'gpt-4o-mini';
			let activeUrl = 'https://api.openai.com/v1/chat/completions';

			const capturedUrls: string[] = [];
			const capturedBodies: any[] = [];

			globalThis.fetch = vi.fn().mockImplementation(async (url: any, init: any) => {
				capturedUrls.push(String(url));
				capturedBodies.push(JSON.parse(init.body));
				return {
					ok: true,
					json: async () => ({
						choices: [{ message: { content: JSON.stringify({ iso: '2026-05-01T00:00:00', confidence: 0.95 }) } }],
					}),
					headers: new Headers(),
				} as any;
			});

			const provider = {
				id: 'dynamic-endpoint',
				url: () => activeUrl,
				model: () => activeModel,
				key: 'static-key',
			};

			await fetchFromProvider(provider, 'test 1', 'Context');
			expect(capturedUrls[0]).toBe('https://api.openai.com/v1/chat/completions');
			expect(capturedBodies[0].model).toBe('gpt-4o-mini');

			activeUrl = 'https://api.groq.com/openai/v1/chat/completions';
			activeModel = 'llama-3.3-70b-versatile';

			await fetchFromProvider(provider, 'test 2', 'Context');
			expect(capturedUrls[1]).toBe('https://api.groq.com/openai/v1/chat/completions');
			expect(capturedBodies[1].model).toBe('llama-3.3-70b-versatile');
		});

		it('should fall back to built-in provider defaults when url is omitted', async () => {
			const capturedUrls: string[] = [];
			globalThis.fetch = vi.fn().mockImplementation(async (url: any) => {
				capturedUrls.push(String(url));
				return {
					ok: true,
					json: async () => ({
						choices: [{ message: { content: JSON.stringify({ iso: '2026-05-01T00:00:00', confidence: 0.95 }) } }],
					}),
					headers: new Headers(),
				} as any;
			});

			const provider = {
				id: 'groq',
				key: 'static-key',
			};

			await fetchFromProvider(provider, 'test default url', 'Context');
			expect(capturedUrls[0]).toBe('https://api.groq.com/openai/v1/chat/completions');
		});
	});

	describe('Dynamic Anchor Dates & Context Resolution', () => {
		it('should resolve dynamic anchor functions at evaluation time', () => {
			let simulatedDate = '2026-01-01T09:00:00Z';
			const anchorSupplier = () => simulatedDate;

			const context = resolveFullContext();
			const anchor1 = resolveAnchorTempo(anchorSupplier, context);
			expect(anchor1.format('{yyyy}-{mm}-{dd}')).toBe('2026-01-01');

			simulatedDate = '2026-12-25T18:30:00Z';
			const anchor2 = resolveAnchorTempo(anchorSupplier, context);
			expect(anchor2.format('{yyyy}-{mm}-{dd}')).toBe('2026-12-25');
		});

		it('should resolve dynamic timeZone and locale suppliers in resolveFullContext', () => {
			let currentTz = 'America/New_York';
			let currentLocale = 'en-US';

			const options = {
				timeZone: () => currentTz,
				locale: () => currentLocale,
			};

			const ctx1 = resolveFullContext(options);
			expect(ctx1.tz).toBe('America/New_York');
			expect(ctx1.loc).toBe('en-US');

			currentTz = 'Asia/Tokyo';
			currentLocale = 'ja-JP';

			const ctx2 = resolveFullContext(options);
			expect(ctx2.tz).toBe('Asia/Tokyo');
			expect(ctx2.loc).toBe('ja-JP');
		});
	});
});
