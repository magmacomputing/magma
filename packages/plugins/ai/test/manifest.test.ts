import {
	initAI,
	loadRemoteManifest,
	resetManifestCache,
	DEFAULT_REMOTE_MANIFEST_URL,
	DEFAULT_PROVIDERS
} from '../src/index.js';

describe('Remote Provider Manifest & Dynamic Defaults', () => {
	beforeEach(() => {
		resetManifestCache();
		vi.restoreAllMocks();
	});

	afterEach(() => {
		resetManifestCache();
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
			expect.objectContaining({ headers: { Accept: 'application/json' } })
		);
		expect(result1).toEqual(mockManifest.providers);

		// Second call should return cached object without second fetch
		const result2 = await loadRemoteManifest(DEFAULT_REMOTE_MANIFEST_URL);
		expect(fetchSpy).toHaveBeenCalledTimes(1);
		expect(result2).toEqual(mockManifest.providers);
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

		// Pre-load manifest
		await loadRemoteManifest(DEFAULT_REMOTE_MANIFEST_URL);

		initAI({
			providers: [{ id: 'groq', key: 'test-key' }]
		});

		// Check resolved providers in init state
		const { _state } = await import('../src/core/init.js');
		expect(_state.config.providers).toHaveLength(1);
		expect(_state.config.providers?.[0].model).toBe('remote-llama-model');
	});

	it('should fallback to compiled DEFAULT_PROVIDERS if remote manifest is missing provider ID', async () => {
		const mockManifest = {
			version: '1.0',
			providers: {}
		};

		vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
			new Response(JSON.stringify(mockManifest), { status: 200 })
		);

		await loadRemoteManifest(DEFAULT_REMOTE_MANIFEST_URL);

		initAI({
			providers: [{ id: 'openai', key: 'test-key' }]
		});

		const { _state } = await import('../src/core/init.js');
		expect(_state.config.providers?.[0].model).toBe(DEFAULT_PROVIDERS.openai.model);
	});
});
