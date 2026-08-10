import {
	initAI,
	resetAI,
	getAiConfig,
	loadRemoteManifest,
	DEFAULT_REMOTE_MANIFEST_URL,
	DEFAULT_PROVIDERS
} from '../src/index.js';

describe('Remote Provider Manifest & Dynamic Defaults', () => {
	beforeEach(() => {
		resetAI();
		vi.restoreAllMocks();
	});

	afterEach(() => {
		resetAI();
		vi.restoreAllMocks();
	});

	it('should fetch remote manifest and cache in memory for subsequent calls', async () => {
		const mockManifest = {
			version: '1.0',
			providers: {
				groq: { model: 'llama-3.3-70b-versatile', tokenParam: 'max_tokens' },
				openai: { model: 'gpt-5.4-mini', tokenParam: 'max_completion_tokens' }
			}
		};

		const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
			new Response(JSON.stringify(mockManifest), { status: 200 })
		);

		const result1 = await loadRemoteManifest(DEFAULT_REMOTE_MANIFEST_URL);
		expect(fetchSpy).toHaveBeenCalledTimes(1);
		expect(fetchSpy).toHaveBeenCalledWith(
			DEFAULT_REMOTE_MANIFEST_URL,
			expect.objectContaining({ headers: { Accept: 'application/json' }, redirect: 'error' })
		);
		expect(result1).toEqual(mockManifest.providers);

		// Second call should return cached object without second fetch
		const result2 = await loadRemoteManifest(DEFAULT_REMOTE_MANIFEST_URL);
		expect(fetchSpy).toHaveBeenCalledTimes(1);
		expect(result2).toEqual(mockManifest.providers);
	});

	it('should reject non-HTTPS/non-localhost remoteConfigUrl before fetching', async () => {
		const fetchSpy = vi.spyOn(globalThis, 'fetch');
		const result = await loadRemoteManifest('http://insecure-domain.com/providers.json');
		expect(fetchSpy).not.toHaveBeenCalled();
		expect(result).toBeNull();
	});

	it('should allow http://localhost and http://127.0.0.1 remoteConfigUrl', async () => {
		const mockManifest = {
			version: '1.0',
			providers: { groq: { model: 'local-test-model' } }
		};

		const fetchSpy = vi.spyOn(globalThis, 'fetch')
			.mockResolvedValueOnce(new Response(JSON.stringify(mockManifest), { status: 200 }))
			.mockResolvedValueOnce(new Response(JSON.stringify(mockManifest), { status: 200 }));

		const result1 = await loadRemoteManifest('http://localhost:3000/providers.json');
		expect(result1).toEqual(mockManifest.providers);

		const result2 = await loadRemoteManifest('http://127.0.0.1:8080/providers.json');
		expect(result2).toEqual(mockManifest.providers);
		expect(fetchSpy).toHaveBeenCalledTimes(2);
	});

	it('should gracefully fail-open on network error (500) and return null', async () => {
		const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
			new Response(null, { status: 500, statusText: 'Internal Server Error' })
		);

		const result = await loadRemoteManifest(DEFAULT_REMOTE_MANIFEST_URL);
		expect(fetchSpy).toHaveBeenCalledTimes(1);
		expect(result).toBeNull();
	});

	it('should gracefully fail-open on network timeout / abort', async () => {
		const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementationOnce(() => {
			const err = new Error('The operation was aborted');
			err.name = 'AbortError';
			return Promise.reject(err);
		});

		const result = await loadRemoteManifest(DEFAULT_REMOTE_MANIFEST_URL, 100);
		expect(fetchSpy).toHaveBeenCalledTimes(1);
		expect(result).toBeNull();
	});

	it('should return null immediately if remoteConfigUrl is false', async () => {
		const fetchSpy = vi.spyOn(globalThis, 'fetch');
		const result = await loadRemoteManifest(false);
		expect(fetchSpy).not.toHaveBeenCalled();
		expect(result).toBeNull();
	});

	it('should fetch custom remoteConfigUrl when provided', async () => {
		const customUrl = 'https://custom-domain.net/providers.json';
		const mockManifest = {
			version: '1.0',
			providers: {
				groq: { model: 'custom-groq-model' }
			}
		};

		const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
			new Response(JSON.stringify(mockManifest), { status: 200 })
		);

		const result = await loadRemoteManifest(customUrl);
		expect(fetchSpy).toHaveBeenCalledWith(customUrl, expect.anything());
		expect(result).toEqual(mockManifest.providers);
	});

	it('should resolve provider defaults from remote manifest when available in initAI', async () => {
		const mockManifest = {
			version: '1.0',
			providers: {
				groq: {
					url: 'https://api.groq.com/openai/v1/chat/completions',
					model: 'remote-llama-model',
					tokenParam: 'max_tokens'
				}
			}
		};

		vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
			new Response(JSON.stringify(mockManifest), { status: 200 })
		);

		await initAI({
			providers: [{ id: 'groq', key: 'test-key' }]
		});

		// Check resolved providers in init state via getAiConfig
		const config = getAiConfig();
		expect(config.providers).toHaveLength(1);
		expect(config.providers?.[0].model).toBe('remote-llama-model');
	});

	it('should fallback to compiled DEFAULT_PROVIDERS if remote manifest is missing provider ID', async () => {
		const mockManifest = {
			version: '1.0',
			providers: {}
		};

		vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
			new Response(JSON.stringify(mockManifest), { status: 200 })
		);

		await initAI({
			providers: [{ id: 'openai', key: 'test-key' }]
		});

		const config = getAiConfig();
		expect(config.providers?.[0].model).toBe(DEFAULT_PROVIDERS.openai.model);
	});

	it('should return empty defaults for unrecognized provider IDs not in DEFAULT_PROVIDERS or manifest', async () => {
		await initAI({
			remoteConfigUrl: false,
			providers: [{ id: 'custom-unrecognized-llm', key: 'test-key' }]
		});

		const config = getAiConfig();
		expect(config.providers?.[0].id).toBe('custom-unrecognized-llm');
		expect(config.providers?.[0].model).toBeUndefined();
		expect(config.providers?.[0].url).toBeUndefined();
	});

	it('should retain fetchDefaults hook results alongside remote manifest resolution', async () => {
		const mockManifest = {
			version: '1.0',
			providers: {
				groq: { model: 'remote-manifest-groq-model' }
			}
		};

		vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
			new Response(JSON.stringify(mockManifest), { status: 200 })
		);

		await initAI({
			providers: [{ id: 'groq', key: 'test-key' }],
			fetchDefaults: async () => ({ timeout: 5000, ttl: 9999 })
		});

		const config = getAiConfig();
		expect(config.providers?.[0].model).toBe('remote-manifest-groq-model');
		expect(config.providers?.[0].timeout).toBe(5000);
		expect(config.providers?.[0].ttl).toBe(9999);
	});

	it('should prevent older async initAI invocation from overwriting newer provider state via revision tracking', async () => {
		let resolveManifest1: (value: any) => void;
		const manifestPromise1 = new Promise(res => { resolveManifest1 = res; });

		const fetchSpy = vi.spyOn(globalThis, 'fetch');
		fetchSpy
			.mockImplementationOnce(() => manifestPromise1 as any)
			.mockResolvedValueOnce(new Response(JSON.stringify({ providers: { groq: { model: 'invocation-2-model' } } }), { status: 200 }));

		// Start invocation 1 (which hangs on manifest resolution)
		const initPromise1 = initAI({
			remoteConfigUrl: 'https://tempo.magmacomputing.com.au/manifest-1.json',
			providers: [{ id: 'groq', key: 'key-invocation-1', model: 'invocation-1-model' }]
		});

		// Synchronously start invocation 2 (newer)
		const initPromise2 = initAI({
			remoteConfigUrl: 'https://tempo.magmacomputing.com.au/manifest-2.json',
			providers: [{ id: 'groq', key: 'key-invocation-2', model: 'invocation-2-model' }]
		});
		await initPromise2;

		expect(getAiConfig().providers?.[0].model).toBe('invocation-2-model');

		// Resolve slow invocation 1
		resolveManifest1!(new Response(JSON.stringify({ providers: { groq: { model: 'stale-model' } } }), { status: 200 }));
		await initPromise1;

		// Verify state was NOT overwritten by stale invocation 1
		expect(getAiConfig().providers?.[0].model).toBe('invocation-2-model');
	});

	it('should allow fetchDefaults to override resolved defaults when config.providers is omitted on re-init', async () => {
		// First init with raw provider (no explicit model override)
		await initAI({
			remoteConfigUrl: false,
			providers: [{ id: 'groq', key: 'test-key' }]
		});

		expect(getAiConfig().providers?.[0].model).toBe(DEFAULT_PROVIDERS.groq.model);

		// Re-init with fetchDefaults hook and omitted providers
		await initAI({
			fetchDefaults: async () => ({ model: 'hook-overridden-model', timeout: 7777 })
		});

		const config = getAiConfig();
		expect(config.providers?.[0].key).toBe('[REDACTED]');
		expect(config.providers?.[0].model).toBe('hook-overridden-model');
		expect(config.providers?.[0].timeout).toBe(7777);
	});

	it('should invalidate in-flight initAI calls across resetAI', async () => {
		let resolveManifest: (value: any) => void;
		const manifestPromise = new Promise(res => { resolveManifest = res; });

		vi.spyOn(globalThis, 'fetch').mockImplementationOnce(() => manifestPromise as any);

		const inFlightInit = initAI({
			remoteConfigUrl: 'https://tempo.magmacomputing.com.au/manifest-slow.json',
			providers: [{ id: 'groq', key: 'slow-key' }]
		});

		// Reset AI while first init is in-flight
		resetAI();

		// Start a new init
		await initAI({
			remoteConfigUrl: false,
			providers: [{ id: 'openai', key: 'fresh-key' }]
		});

		expect(getAiConfig().providers?.[0].id).toBe('openai');

		// Resolve slow in-flight manifest
		resolveManifest!(new Response(JSON.stringify({ providers: { groq: { model: 'stale-groq-model' } } }), { status: 200 }));
		await inFlightInit;

		// Config should remain the fresh one, not overwritten by stale in-flight init
		expect(getAiConfig().providers?.[0].id).toBe('openai');
	});
});
