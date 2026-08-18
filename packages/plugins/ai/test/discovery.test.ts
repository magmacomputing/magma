import { Tempo } from '@magmacomputing/tempo';
import {
	initAI,
	resetAI,
	getAiConfig,
	parseAI,
	TempoAiError,
	isServerRuntime,
	isBrowserRuntime,
	interpolateEnvValue,
	interpolateEnv,
	scanWellKnownEnvProviders,
	resolveAutoDiscoveredConfig,
	resolveProviderApiKey,
} from '../src/index.js';

vi.mock('@magmacomputing/tempo/config', () => ({
	resolveConfig: vi.fn().mockResolvedValue({}),
}));

describe('AI Provider Farm Auto-Discovery & Zero-Config Subsystem', () => {
	const savedEnv = { ...process.env };

	beforeEach(() => {
		resetAI();
		Tempo.cache.clear();
		// Clean out all AI provider env variables before each test
		delete process.env.GROQ_API_KEY;
		delete process.env.OPENAI_API_KEY;
		delete process.env.GEMINI_API_KEY;
		delete process.env.GOOGLE_API_KEY;
		delete process.env.MISTRAL_API_KEY;
	});

	afterEach(() => {
		resetAI();
		Tempo.cache.clear();
		vi.restoreAllMocks();
		process.env = { ...savedEnv };
	});

	describe('Runtime Environment Detection', () => {
		it('should detect server runtime in Node.js test environment', () => {
			expect(isServerRuntime()).toBe(true);
			expect(isBrowserRuntime()).toBe(false);
		});
	});

	describe('Environment Variable Interpolation', () => {
		it('should interpolate ${VAR_NAME} syntax', () => {
			const env = { TEST_KEY: 'secret-123' };
			expect(interpolateEnvValue('Bearer ${TEST_KEY}', env)).toBe('Bearer secret-123');
		});

		it('should interpolate ${env:VAR_NAME} syntax', () => {
			const env = { API_SECRET: 'alpha-beta' };
			expect(interpolateEnvValue('Token: ${env:API_SECRET}', env)).toBe('Token: alpha-beta');
		});

		it('should interpolate $env:VAR_NAME syntax', () => {
			const env = { MY_TOKEN: 'token-xyz' };
			expect(interpolateEnvValue('Key $env:MY_TOKEN', env)).toBe('Key token-xyz');
		});

		it('should replace missing environment variables with empty string', () => {
			const env = {};
			expect(interpolateEnvValue('prefix-${MISSING_VAR}-suffix', env)).toBe('prefix--suffix');
			expect(interpolateEnvValue('prefix-$env:MISSING_VAR-suffix', env)).toBe('prefix--suffix');
			expect(interpolateEnvValue('prefix-${env:MISSING_VAR}-suffix', env)).toBe('prefix--suffix');
		});

		it('should handle case-insensitive variable names in template patterns', () => {
			const env = { GROQ_API_KEY: 'gsk_test' };
			expect(interpolateEnvValue('${groq_api_key}', env)).toBe('gsk_test');
			expect(interpolateEnvValue('$env:groq_api_key', env)).toBe('gsk_test');
		});

		it('should recursively interpolate objects and arrays', () => {
			const env = {
				API_KEY: 'my-secret',
				API_MODEL: 'llama-3.3-70b-versatile',
				ENDPOINT: 'https://api.example.com',
			};

			const config = {
				remoteConfigUrl: false,
				model: '${API_MODEL}',
				providers: [
					{
						id: 'custom',
						key: '${API_KEY}',
						endpoint: '${ENDPOINT}/v1',
						aliases: ['${API_MODEL}', 'backup-model'],
					},
				],
			};

			const interpolated = interpolateEnv(config, env);

			expect(interpolated.model).toBe('llama-3.3-70b-versatile');
			expect(interpolated.providers[0].key).toBe('my-secret');
			expect(interpolated.providers[0].endpoint).toBe('https://api.example.com/v1');
			expect(interpolated.providers[0].aliases).toEqual(['llama-3.3-70b-versatile', 'backup-model']);
		});

		it('should preserve class instances and their prototype methods while interpolating plain objects and Maps', () => {
			class CustomCacheAdapter {
				public prefix: string;
				constructor(prefix: string) {
					this.prefix = prefix;
				}
				getPrefix() {
					return this.prefix;
				}
			}

			const adapter = new CustomCacheAdapter('tempo-cache');
			const env = { API_SECRET: 'top-secret' };
			const map = new Map<string, string>();
			map.set('header', 'Bearer ${API_SECRET}');

			const input = {
				cacheAdapter: adapter,
				headersMap: map,
				apiKey: '${API_SECRET}',
			};

			const result = interpolateEnv(input, env);

			expect(result.apiKey).toBe('top-secret');
			expect(result.cacheAdapter).toBe(adapter);
			expect(result.cacheAdapter instanceof CustomCacheAdapter).toBe(true);
			expect(result.cacheAdapter.getPrefix()).toBe('tempo-cache');
			expect(result.headersMap instanceof Map).toBe(true);
			expect(result.headersMap.get('header')).toBe('Bearer top-secret');
		});
	});

	describe('Well-Known Provider Environment Variable Scanning', () => {
		it('should discover single provider from environment variable', () => {
			const env = { GROQ_API_KEY: 'gsk_discovered_key' };
			const providers = scanWellKnownEnvProviders(env);

			expect(providers).toHaveLength(1);
			expect(providers[0].id).toBe('groq');
			expect(providers[0].key).toBe('gsk_discovered_key');
		});

		it('should discover multiple providers across well-known keys', () => {
			const env = {
				GROQ_API_KEY: 'gsk_groq',
				OPENAI_API_KEY: 'sk_openai',
				GEMINI_API_KEY: 'gemini_key',
				MISTRAL_API_KEY: 'mistral_key',
			};
			const providers = scanWellKnownEnvProviders(env);

			expect(providers).toHaveLength(4);
			const ids = providers.map(p => p.id);
			expect(ids).toContain('groq');
			expect(ids).toContain('openai');
			expect(ids).toContain('gemini');
			expect(ids).toContain('mistral');
		});

		it('should support GOOGLE_API_KEY alias for gemini', () => {
			const env = { GOOGLE_API_KEY: 'google_cloud_gemini_key' };
			const providers = scanWellKnownEnvProviders(env);

			expect(providers).toHaveLength(1);
			expect(providers[0].id).toBe('gemini');
			expect(providers[0].key).toBe('google_cloud_gemini_key');
		});

		it('should return empty array if no well-known keys are in the environment', () => {
			const providers = scanWellKnownEnvProviders({});
			expect(providers).toEqual([]);
		});
	});

	describe('Auto-Discovery Integration & Zero-Config Initialization', () => {
		it('should auto-initialize providers when initAI() is called with no arguments', async () => {
			process.env.GROQ_API_KEY = 'gsk_auto_init';

			await initAI();

			const activeConfig = getAiConfig();
			expect(activeConfig.providers).toBeDefined();
			expect(activeConfig.providers?.length).toBe(1);
			expect(activeConfig.providers?.[0].id).toBe('groq');
			expect(activeConfig.providers?.[0].key).toBe('[REDACTED]');
		});

		it('should lazily discover providers on first AI function call (zero-config parseAI)', async () => {
			process.env.GROQ_API_KEY = 'gsk_lazy_zero_config';

			vi.spyOn(globalThis, 'fetch').mockImplementation(async (url: any) => {
				const urlStr = String(url);
				if (urlStr.includes('manifest') || urlStr.includes('githubusercontent')) {
					return new Response(JSON.stringify({ version: '1.0.0', providers: {} }), { status: 200 });
				}
				return new Response(JSON.stringify({
					choices: [{
						message: {
							content: JSON.stringify({
								iso: '2026-08-17T09:00:00Z',
								confidence: 0.98,
								reasoning: 'Parsed next Monday at 9am',
							}),
						},
					}],
				}), { status: 200, headers: { 'Content-Type': 'application/json' } });
			});

			const result = await parseAI('next Monday at 9am', { force: true });
			expect(result.isValid).toBe(true);
			expect(result.ai?.provider).toBe('groq');
			expect(result.ai?.cached).toBe(false);
		});

		it('should throw clear TempoAiError when no providers or environment keys are found', async () => {
			await expect(parseAI('tomorrow at 5pm', { force: true })).rejects.toThrow(TempoAiError);
			await expect(parseAI('tomorrow at 5pm', { force: true })).rejects.toThrow(/No AI providers configured/i);
		});

		it('should interpolate template keys inside explicit initAI() configuration', async () => {
			process.env.MY_CUSTOM_GROQ_KEY = 'gsk_interpolated_custom';

			await initAI({
				remoteConfigUrl: false,
				providers: [
					{
						id: 'groq',
						key: '${MY_CUSTOM_GROQ_KEY}',
					},
				],
			});

			const config = getAiConfig();
			expect(config.providers?.[0].key).toBe('[REDACTED]');
		});

		it('should resolve full config asynchronously via resolveAutoDiscoveredConfig', async () => {
			process.env.OPENAI_API_KEY = 'sk-auto-discovered';

			const resolved = await resolveAutoDiscoveredConfig();
			expect(resolved.providers).toBeDefined();
			expect(resolved.providers?.some(p => p.id === 'openai' && p.key === 'sk-auto-discovered')).toBe(true);
		});

		it('should resolve provider API key with trimming and environment fallback in resolveProviderApiKey', () => {
			expect(resolveProviderApiKey('groq', '  explicit-key-123  ')).toBe('explicit-key-123');
			expect(resolveProviderApiKey('groq', undefined, { GROQ_API_KEY: '  env-groq-key  ' })).toBe('env-groq-key');
			expect(resolveProviderApiKey('gemini', undefined, { GOOGLE_API_KEY: 'env-google-key' })).toBe('env-google-key');
			expect(resolveProviderApiKey('unknown_provider', undefined, {})).toBeUndefined();
			expect(resolveProviderApiKey('groq', '  ', {})).toBeUndefined();
		});

		it('should avoid recursive auto-initialization when Tempo config has no providers and allow re-init after resetAI', () => {
			Tempo.init({
				plugins: {
					ai: {
						timeout: 4500,
					},
				},
				silent: true,
			});

			const config1 = getAiConfig();
			expect(config1.timeout).toBe(4500);
			expect(config1.providers).toEqual([]);

			const config2 = getAiConfig();
			expect(config2.timeout).toBe(4500);

			resetAI();
			Tempo.init({
				plugins: {
					ai: {
						timeout: 9000,
					},
				},
				silent: true,
			});
			const config3 = getAiConfig();
			expect(config3.timeout).toBe(9000);
		});

		it('should resolve provider key from environment in async fetchDefaults path when p.key is absent or whitespace', async () => {
			process.env.GROQ_API_KEY = 'gsk_async_env_key';

			await initAI({
				remoteConfigUrl: false,
				fetchDefaults: async (id) => ({
					model: `custom-${id}-model`,
				}),
				providers: [
					{ id: 'groq', key: '   ' },
				],
			});

			const config = getAiConfig();
			expect(config.providers?.[0].key).toBe('[REDACTED]');
			expect(config.providers?.[0].model).toBe('custom-groq-model');
		});
	});
});
