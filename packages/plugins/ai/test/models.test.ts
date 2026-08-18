import { listProviderModels, TempoAiError } from '../src/index.js';

describe('AI Provider Model Discovery (listProviderModels)', () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('should query Groq models endpoint with Authorization Bearer header', async () => {
		const mockGroqResponse = {
			object: 'list',
			data: [
				{ id: 'openai/gpt-oss-120b', object: 'model', created: 1720000000, owned_by: 'openai', context_window: 131072 },
				{ id: 'qwen/qwen3.6-27b', object: 'model', created: 1720000000, owned_by: 'qwen', context_window: 65536 }
			]
		};

		const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
			new Response(JSON.stringify(mockGroqResponse), { status: 200 })
		);

		const models = await listProviderModels('groq', 'gsk-mock-key-123');
		expect(fetchSpy).toHaveBeenCalledWith(
			'https://api.groq.com/openai/v1/models',
			expect.objectContaining({
				headers: expect.objectContaining({
					Authorization: 'Bearer gsk-mock-key-123'
				})
			})
		);

		expect(models).toHaveLength(2);
		expect(models[0].id).toBe('openai/gpt-oss-120b');
		expect(models[0].ownedBy).toBe('openai');
		expect(models[0].contextWindow).toBe(131072);
		expect(models[1].id).toBe('qwen/qwen3.6-27b');
	});

	it('should query Google Gemini models endpoint and format model identifiers', async () => {
		const mockGeminiResponse = {
			models: [
				{
					name: 'models/gemini-3.7-flash',
					displayName: 'Gemini 3.7 Flash',
					description: 'Next-generation multimodal model',
					inputTokenLimit: 1048576,
					outputTokenLimit: 8192,
					supportedGenerationMethods: ['generateContent', 'countTokens']
				},
				{
					name: 'models/gemini-2.5-pro',
					displayName: 'Gemini 2.5 Pro',
					description: 'Deep reasoning model',
					inputTokenLimit: 2097152,
					outputTokenLimit: 8192,
					supportedGenerationMethods: ['generateContent']
				}
			]
		};

		const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
			new Response(JSON.stringify(mockGeminiResponse), { status: 200 })
		);

		const models = await listProviderModels('gemini', 'gemini-mock-key-456');
		expect(fetchSpy).toHaveBeenCalledWith(
			'https://generativelanguage.googleapis.com/v1beta/models',
			expect.objectContaining({
				headers: expect.objectContaining({
					'x-goog-api-key': 'gemini-mock-key-456'
				})
			})
		);

		expect(models).toHaveLength(2);
		expect(models[0].id).toBe('gemini-3.7-flash');
		expect(models[0].name).toBe('Gemini 3.7 Flash');
		expect(models[0].contextWindow).toBe(1048576);
		expect(models[1].id).toBe('gemini-2.5-pro');
	});

	it('should query OpenAI models endpoint', async () => {
		const mockOpenAiResponse = {
			object: 'list',
			data: [
				{ id: 'gpt-5.4-mini', object: 'model', created: 1725000000, owned_by: 'system' },
				{ id: 'gpt-5.4', object: 'model', created: 1725000000, owned_by: 'system' }
			]
		};

		const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
			new Response(JSON.stringify(mockOpenAiResponse), { status: 200 })
		);

		const models = await listProviderModels('openai', 'sk-mock-key-789');
		expect(fetchSpy).toHaveBeenCalledWith(
			'https://api.openai.com/v1/models',
			expect.objectContaining({
				headers: expect.objectContaining({
					Authorization: 'Bearer sk-mock-key-789'
				})
			})
		);

		expect(models).toHaveLength(2);
		expect(models[0].id).toBe('gpt-5.4-mini');
		expect(models[1].id).toBe('gpt-5.4');
	});

	it('should throw 401 TempoAiError if API key is missing or blank', async () => {
		await expect(listProviderModels('groq', '')).rejects.toThrow(TempoAiError);
		await expect(listProviderModels('groq', '  ')).rejects.toThrow(/API key is required/);
	});

	it('should throw 400 TempoAiError if provider ID is missing', async () => {
		await expect(listProviderModels('', 'key-123')).rejects.toThrow(TempoAiError);
	});

	it('should handle HTTP error responses from provider', async () => {
		vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
			new Response(JSON.stringify({ error: { message: 'Invalid API Key' } }), { status: 401 })
		);

		await expect(listProviderModels('groq', 'invalid-key')).rejects.toThrow(TempoAiError);
	});

	it('should support custom endpoint URL override', async () => {
		const customUrl = 'https://custom-gateway.corp.com/v1/models';
		const mockResponse = {
			data: [{ id: 'custom-fine-tuned-model' }]
		};

		const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
			new Response(JSON.stringify(mockResponse), { status: 200 })
		);

		const models = await listProviderModels('custom', 'token-123', { url: customUrl });
		expect(fetchSpy).toHaveBeenCalledWith(customUrl, expect.anything());
		expect(models[0].id).toBe('custom-fine-tuned-model');
	});

	it('should construct default endpoint URL from provider ID when not well-known and no URL override provided', async () => {
		const mockResponse = {
			data: [{ id: 'anthropic-claude-3-5-sonnet' }]
		};

		const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
			new Response(JSON.stringify(mockResponse), { status: 200 })
		);

		const models = await listProviderModels('anthropic', 'sk-ant-test-token');
		expect(fetchSpy).toHaveBeenCalledWith(
			'https://api.anthropic.com/v1/models',
			expect.objectContaining({
				headers: expect.objectContaining({
					Authorization: 'Bearer sk-ant-test-token'
				})
			})
		);
		expect(models).toHaveLength(1);
		expect(models[0].id).toBe('anthropic-claude-3-5-sonnet');
	});

	it('should produce a 504 TempoAiError on request timeout / abort', async () => {
		vi.spyOn(globalThis, 'fetch').mockImplementationOnce(() => {
			const err = new Error('The operation was aborted');
			err.name = 'AbortError';
			return Promise.reject(err);
		});

		try {
			await listProviderModels('openai', 'sk-test-key', { timeout: 100 });
			expect.unreachable('Should have thrown 504 TempoAiError');
		} catch (err: any) {
			expect(err).toBeInstanceOf(TempoAiError);
			expect(err.status).toBe(504);
			expect(err.message).toMatch(/Timeout querying models for provider 'openai'/);
		}
	});

	it('should convert non-JSON / HTML response into a 500 TempoAiError', async () => {
		vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
			new Response('<html><body>502 Bad Gateway</body></html>', {
				status: 200,
				headers: { 'Content-Type': 'text/html' },
			})
		);

		try {
			await listProviderModels('openai', 'sk-test-key');
			expect.unreachable('Should have thrown TempoAiError');
		} catch (err: any) {
			expect(err).toBeInstanceOf(TempoAiError);
			expect(err.status).toBe(500);
			expect(err.message).toMatch(/Network error querying models for 'openai'/);
		}
	});

	it('should throw 400 TempoAiError and reject invalid provider IDs before making network calls', async () => {
		const fetchSpy = vi.spyOn(globalThis, 'fetch');

		await expect(listProviderModels('bad/provider', 'sk-test-key')).rejects.toThrow(TempoAiError);
		await expect(listProviderModels('bad?provider', 'sk-test-key')).rejects.toThrow(/Invalid provider ID/);
		await expect(listProviderModels('bad provider', 'sk-test-key')).rejects.toThrow(/Invalid provider ID/);

		expect(fetchSpy).not.toHaveBeenCalled();
	});

	it('should throw 400 TempoAiError and reject insecure endpoint URLs before making network calls', async () => {
		const fetchSpy = vi.spyOn(globalThis, 'fetch');

		await expect(
			listProviderModels('custom', 'sk-test-key', { url: 'http://insecure-endpoint.com/models' })
		).rejects.toThrow(TempoAiError);

		await expect(
			listProviderModels('custom', 'sk-test-key', { url: 'http://insecure-endpoint.com/models' })
		).rejects.toThrow(/must use HTTPS or localhost HTTP/);

		expect(fetchSpy).not.toHaveBeenCalled();
	});

	it('should safely handle non-Error and primitive thrown values without crashing', async () => {
		vi.spyOn(globalThis, 'fetch').mockImplementationOnce(() => {
			return Promise.reject('Raw string network failure');
		});

		try {
			await listProviderModels('openai', 'sk-test-key');
			expect.unreachable('Should have thrown TempoAiError');
		} catch (err: any) {
			expect(err).toBeInstanceOf(TempoAiError);
			expect(err.status).toBe(500);
			expect(err.message).toMatch(/Network error querying models for 'openai': Raw string network failure/);
		}
	});
});
