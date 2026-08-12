import { parseAI, initAI, clearAiCache, getAiRateLimits, getAiConfig, TempoAiError, AiMode } from '../src/index.js';
import { BoundedCache } from '@magmacomputing/tempo/support';
import { Tempo } from '@magmacomputing/tempo';

describe('AI Parsing Plugin (parseAI)', () => {
	const liveApiKey = process.env.GROQ_API_KEY ?? process.env.OPENAI_API_KEY;
	const liveProviderId = process.env.GROQ_API_KEY ? 'groq' : 'openai';
	const isLiveTest = Boolean(process.env.LIVE_AI_TEST && liveApiKey);

	beforeEach(async () => {
		vi.spyOn(console, 'warn').mockImplementation(() => {});
		vi.spyOn(console, 'error').mockImplementation(() => {});
		vi.spyOn(console, 'log').mockImplementation(() => {});

		if (isLiveTest) {
			return initAI({
				remoteConfigUrl: false,
				providers: [{ id: liveProviderId, key: liveApiKey! }]
			});
		} else {
			return initAI({
				remoteConfigUrl: false,
				providers: [{ id: 'groq', key: 'mock-key-for-unit-testing' }]
			});
		}
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('should return current runtime configuration via getAiConfig', async () => {
		await initAI({
			remoteConfigUrl: false,
			providers: [{ id: 'groq', key: 'test-key-123' }],
			mode: AiMode.Fallback,
			timeout: 3000,
			debug: true
		});

		const config = getAiConfig();
		expect(config).toBeDefined();
		expect(config.mode).toBe('fallback');
		expect(config.timeout).toBe(3000);
		expect(config.debug).toBe(true);
		expect(config.providers).toHaveLength(1);
		expect(config.providers?.[0].id).toBe('groq');
		expect(config.providers?.[0].key).toBe('[REDACTED]');
		expect(config.providers?.[0].model).toBe('llama-3.3-70b-versatile');
	});

	it('should fall back to native parsing first and attach .ai metadata', async () => {
		const result = await parseAI('2026-05-10');
		expect(result.isValid).toBe(true);
		expect(result.format('{yyyy}-{mm}-{dd}')).toBe('2026-05-10');
		expect(result.ai).toBeDefined();
		expect(result.ai?.provider).toBe('native');
		expect(result.ai?.cached).toBe(false);
		expect(result.ai?.confidence).toBe(1.0);
		expect(Object.isFrozen(result.ai)).toBe(true);
	});

	it('should throw TempoAiError if reserved provider ID "native" or "cache" is used in initAI', () => {
		expect(() => initAI({ remoteConfigUrl: false, providers: [{ id: 'native', key: '123' }] })).toThrow(TempoAiError);
		expect(() => initAI({ remoteConfigUrl: false, providers: [{ id: 'cache', key: '123' }] })).toThrow(TempoAiError);
	});

	it('should canonicalize Gemini provider ID and use gemini-3.6-flash model by default', async () => {
		await initAI({
			remoteConfigUrl: false,
			providers: [{ id: 'Gemini', key: 'mock-gemini-key' }]
		});
		const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(new Response(JSON.stringify({
			choices: [{ message: { content: '{"iso":"2026-12-25T00:00:00"}' } }]
		}), { status: 200 }));

		await parseAI('Christmas 2026', { force: true });
		expect(fetchSpy).toHaveBeenCalled();
		const body = JSON.parse(fetchSpy.mock.calls[0][1]?.body as string);
		expect(body.model).toBe('gemini-3.6-flash');
	});

	it('should throw TempoAiError if no key is configured and AI is needed', async () => {
		await initAI({ remoteConfigUrl: false, providers: [] });
		await expect(parseAI('Next Thanksgiving')).rejects.toThrow(TempoAiError);
		await expect(parseAI('Next Thanksgiving')).rejects.toThrow('No AI providers configured.');
	});

	it('should throw TempoAiError with status 400 if an invalid mode is specified in parseAI', async () => {
		await initAI({ remoteConfigUrl: false, providers: [{ id: 'openai', key: 'test-key' }] });
		try {
			await parseAI('Next Thanksgiving', { mode: 'invalid-mode' as any, force: true });
			expect.unreachable('Should have thrown TempoAiError');
		} catch (err: any) {
			expect(err).toBeInstanceOf(TempoAiError);
			expect(err.code).toBe(400);
			expect(err.message).toContain("Invalid execution mode: 'invalid-mode'");
		}
	});

	it('should parse natural language successfully and attach secured .ai metadata', async () => {
		if (!isLiveTest) {
			vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(new Response(JSON.stringify({
				choices: [{ message: { content: '{"reasoning":"The Friday after Thanksgiving", "iso":"2026-11-27T00:00:00", "confidence":0.98, "ambiguous":false, "granularity":"day"}' } }]
			}), {
				status: 200,
				headers: new Headers({
					'x-ratelimit-remaining-requests': '99',
					'x-ratelimit-remaining-tokens': '4950'
				})
			}));
		}

		const anchorDate = '2026-05-10T12:00:00Z';
		const result = await parseAI('The Friday after Thanksgiving', { anchor: anchorDate, timeZone: 'UTC', force: true });

		expect(result).toBeInstanceOf(Tempo);
		expect(result.constructor).toBe(Tempo);
		const formatRef = result.format;
		expect(result.format).toBe(formatRef);
		expect(result.isValid).toBe(true);
		expect(result.format('{yyyy}-{mm}-{dd}')).toBe('2026-11-27');

		expect(result.ai).toBeDefined();
		expect(result.ai?.provider).toBe(isLiveTest ? liveProviderId : 'groq');
		expect(result.ai?.cached).toBe(false);
		expect(result.ai?.confidence).toBe(isLiveTest ? 1.0 : 0.98);
		expect(result.ai?.ambiguous).toBe(false);
		expect(result.ai?.granularity).toBe(isLiveTest ? 'unknown' : 'day');
		expect(Object.isFrozen(result.ai)).toBe(true);
	});

	it('should attach rawPrompt and normalizedPrompt to .ai only when debug is true', async () => {
		if (!isLiveTest) {
			vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(new Response(JSON.stringify({
				choices: [{ message: { content: '{"reasoning":"Debug test", "iso":"2026-12-25T00:00:00", "confidence":0.95}' } }]
			}), { status: 200 }));
		}

		const result = await parseAI('  Christmas 2026  ', { force: true, debug: true });
		expect(result.ai?.rawPrompt).toBe('  Christmas 2026  ');
		expect(result.ai?.normalizedPrompt).toBe('christmas 2026');
		expect(result.ai?.reasoning).toBe('Debug test');

		if (!isLiveTest) {
			vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(new Response(JSON.stringify({
				choices: [{ message: { content: '{"reasoning":"No debug test", "iso":"2026-12-25T00:00:00", "confidence":0.95}' } }]
			}), { status: 200 }));
		}

		const noDebug = await parseAI('  Christmas 2026  ', { force: true, debug: false });
		expect(noDebug.ai?.rawPrompt).toBeUndefined();
		expect(noDebug.ai?.normalizedPrompt).toBeUndefined();
		expect(noDebug.ai?.reasoning).toBeUndefined();
	});

	it('should cache the result and mark provider as "cache"', async () => {
		const anchorDate = '2026-05-10T12:00:00Z';
		clearAiCache('The Friday after Thanksgiving');

		const fetchSpy = vi.spyOn(globalThis, 'fetch');
		if (!isLiveTest) {
			fetchSpy.mockResolvedValueOnce(new Response(JSON.stringify({
				choices: [{ message: { content: '{"reasoning":"The Friday after Thanksgiving", "iso":"2026-11-27T00:00:00", "confidence":0.99}' } }]
			}), { status: 200 }));
		}

		const dt1 = await parseAI('The Friday after Thanksgiving', { anchor: anchorDate, timeZone: 'UTC' });
		expect(dt1.format('{yyyy}-{mm}-{dd}')).toBe('2026-11-27');
		expect(dt1.ai?.cached).toBe(false);

		const dt2 = await parseAI('The Friday after Thanksgiving', { anchor: anchorDate, timeZone: 'UTC' });
		expect(dt2.format('{yyyy}-{mm}-{dd}')).toBe('2026-11-27');
		expect(dt2.ai?.provider).toBe('cache');
		expect(dt2.ai?.cached).toBe(true);

		if (!isLiveTest) {
			expect(fetchSpy).toHaveBeenCalledTimes(1);
		}
	});

	it('should return a Tempo instance with isValid = false when LLM returns INVALID', async () => {
		if (!isLiveTest) {
			vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(new Response(JSON.stringify({
				choices: [{ message: { content: '{"reasoning":"Gibberish text", "iso":"INVALID", "confidence":0.0, "ambiguous":true}' } }]
			}), { status: 200 }));
		}

		const result = await parseAI('complete gibberish text', { force: true });
		expect(result).toBeInstanceOf(Tempo);
		expect(result.isValid).toBe(false);
		expect(result.ai?.confidence).toBe(0.0);
		expect(result.ai?.ambiguous).toBe(true);
		expect(result.ai?.rawIso).toBe('INVALID');
	});

	it('should return an invalid Tempo instance (isValid = false) with metadata when minConfidence threshold is not met', async () => {
		if (!isLiveTest) {
			vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(new Response(JSON.stringify({
				choices: [{ message: { content: '{"reasoning":"Uncertain date", "iso":"2026-05-10T00:00:00", "confidence":0.5}' } }]
			}), { status: 200 }));
		}

		const result = await parseAI('somewhat ambiguous date', { force: true, minConfidence: 0.7 });
		expect(result).toBeInstanceOf(Tempo);
		expect(result.isValid).toBe(false);
		expect(result.ai?.confidence).toBe(0.5);
		expect(result.ai?.ambiguous).toBe(true);
	});

	it('should cascade from low-confidence local provider to high-confidence online provider in Fallback mode', async () => {
		await initAI({
			remoteConfigUrl: false,
			providers: [
				{ id: 'local-llm', key: 'key1', url: 'https://api.openai.com/v1/chat', model: 'local' },
				{ id: 'cloud-llm', key: 'key2', url: 'https://api.openai.com/v1/chat', model: 'cloud' }
			]
		});

		const fetchSpy = vi.spyOn(globalThis, 'fetch');
		fetchSpy.mockResolvedValueOnce(new Response(JSON.stringify({
			choices: [{ message: { content: '{"reasoning":"Uncertain local guess", "iso":"2026-11-26T00:00:00", "confidence":0.4}' } }]
		}), { status: 200 }));
		fetchSpy.mockResolvedValueOnce(new Response(JSON.stringify({
			choices: [{ message: { content: '{"reasoning":"High confidence cloud result", "iso":"2026-11-26T00:00:00", "confidence":0.95}' } }]
		}), { status: 200 }));

		const result = await parseAI('Thanksgiving 2026', { force: true, minConfidence: 0.8, mode: AiMode.Fallback });

		expect(fetchSpy).toHaveBeenCalledTimes(2);
		expect(result.isValid).toBe(true);
		expect(result.ai?.provider).toBe('cloud-llm');
		expect(result.ai?.confidence).toBe(0.95);
	});

	it('should short-circuit and stop looking to other providers when a provider meets minConfidence', async () => {
		await initAI({
			remoteConfigUrl: false,
			providers: [
				{ id: 'local-llm', key: 'key1', url: 'https://api.openai.com/v1/chat', model: 'local' },
				{ id: 'cloud-llm', key: 'key2', url: 'https://api.openai.com/v1/chat', model: 'cloud' }
			]
		});

		const fetchSpy = vi.spyOn(globalThis, 'fetch');
		fetchSpy.mockResolvedValueOnce(new Response(JSON.stringify({
			choices: [{ message: { content: '{"reasoning":"Confident local result", "iso":"2026-11-26T00:00:00", "confidence":0.90}' } }]
		}), { status: 200 }));

		const result = await parseAI('Thanksgiving 2026', { force: true, minConfidence: 0.85, mode: AiMode.Fallback });

		expect(fetchSpy).toHaveBeenCalledTimes(1);
		expect(result.isValid).toBe(true);
		expect(result.ai?.provider).toBe('local-llm');
		expect(result.ai?.confidence).toBe(0.90);
	});

	it('should execute parallel array batching with preserved index ordering', async () => {
		if (!isLiveTest) {
			const fetchSpy = vi.spyOn(globalThis, 'fetch');
			fetchSpy
				.mockResolvedValueOnce(new Response(JSON.stringify({
					choices: [{ message: { content: '{"reasoning":"Date 1", "iso":"2026-01-01T00:00:00", "confidence":0.99}' } }]
				}), { status: 200 }))
				.mockResolvedValueOnce(new Response(JSON.stringify({
					choices: [{ message: { content: '{"reasoning":"Date 2", "iso":"2026-02-02T00:00:00", "confidence":0.99}' } }]
				}), { status: 200 }));
		}

		const [res1, res2] = await parseAI(['New Years 2026', 'Groundhog Day 2026'], { force: true });

		expect(Tempo.isTempo(res1)).toBe(true);
		expect(Tempo.isTempo(res2)).toBe(true);

		if (Tempo.isTempo(res1) && Tempo.isTempo(res2)) {
			expect(res1.format('{yyyy}-{mm}-{dd}')).toBe('2026-01-01');
			expect(res2.format('{yyyy}-{mm}-{dd}')).toBe('2026-02-02');
		}
	});

	it('should support softErrors in array batch processing', async () => {
		await initAI({
			remoteConfigUrl: false,
			providers: [{ id: 'groq', key: 'test-key' }]
		});

		const fetchSpy = vi.spyOn(globalThis, 'fetch');
		fetchSpy.mockResolvedValueOnce(new Response(JSON.stringify({
			choices: [{ message: { content: '{"reasoning":"Date 1", "iso":"2026-01-01T00:00:00", "confidence":0.99}' } }]
		}), { status: 200 }));
		fetchSpy.mockResolvedValueOnce(new Response(null, { status: 500, statusText: 'Internal Error' }));

		const results = await parseAI(['Valid Date Prompt', 'Failing Prompt'], { force: true, softErrors: true });

		expect(results).toHaveLength(2);
		expect(results[0]).toBeInstanceOf(Tempo);
		expect((results[0] as Tempo).format('{yyyy}-{mm}-{dd}')).toBe('2026-01-01');

		expect(results[1]).toBeInstanceOf(TempoAiError);
		expect((results[1] as TempoAiError).code).toBe(500);
	});

	describe('Execution Modes: Race & Consensus', () => {
		it('should support mode: race and return the fastest resolving provider', async () => {
			const fetchSpy = vi.spyOn(globalThis, 'fetch');
			fetchSpy.mockImplementation(async (_url, opts) => {
				const body = JSON.parse(opts?.body as string);
				if (body.model === 'fast-model') {
					return new Response(JSON.stringify({
						choices: [{ message: { content: '{"reasoning":"Fast", "iso":"2026-06-01T00:00:00", "confidence":0.95}' } }]
					}), { status: 200 });
				}
				await new Promise(resolve => setTimeout(resolve, 500));
				return new Response(JSON.stringify({
					choices: [{ message: { content: '{"reasoning":"Slow", "iso":"2026-06-01T00:00:00", "confidence":0.95}' } }]
				}), { status: 200 });
			});

			const result = await parseAI('June 1st 2026', {
				force: true,
				mode: AiMode.Race,
				providers: [
					{ id: 'slow-provider', key: 'key1', url: 'https://api.openai.com/v1/chat', model: 'slow-model' },
					{ id: 'fast-provider', key: 'key2', url: 'https://api.openai.com/v1/chat', model: 'fast-model' }
				]
			});

			expect(result.format('{yyyy}-{mm}-{dd}')).toBe('2026-06-01');
			expect(result.ai?.provider).toBe('fast-provider');
		});

		it('should support mode: consensus and boost confidence when providers agree', async () => {
			const fetchSpy = vi.spyOn(globalThis, 'fetch');
			fetchSpy
				.mockResolvedValueOnce(new Response(JSON.stringify({
					choices: [{ message: { content: '{"reasoning":"Model 1", "iso":"2026-07-04T00:00:00", "confidence":0.90}' } }]
				}), { status: 200 }))
				.mockResolvedValueOnce(new Response(JSON.stringify({
					choices: [{ message: { content: '{"reasoning":"Model 2", "iso":"2026-07-04T00:00:00", "confidence":0.85}' } }]
				}), { status: 200 }));

			const result = await parseAI('4th of July 2026', {
				force: true,
				mode: AiMode.Consensus,
				providers: [
					{ id: 'p1', key: 'key1', url: 'https://api.openai.com/v1/chat', model: 'm1' },
					{ id: 'p2', key: 'key2', url: 'https://api.openai.com/v1/chat', model: 'm2' }
				]
			});

			expect(result.format('{yyyy}-{mm}-{dd}')).toBe('2026-07-04');
			expect(result.ai?.provider).toBe('consensus');
			expect(result.ai?.confidence).toBe(1.0);
			expect(result.ai?.ambiguous).toBe(false);
		});
	});

	describe('Mocked Network Failures', () => {
		it('should throw TempoAiError with 401 when API key is bad, expired, or revoked', async () => {
			await initAI({ remoteConfigUrl: false, providers: [{ id: 'openai', key: 'bad_key' }] });

			vi.spyOn(global, 'fetch').mockResolvedValueOnce(new Response(null, {
				status: 401,
				statusText: 'Unauthorized'
			}));

			try {
				await parseAI('Thanksgiving', { force: true });
				expect.unreachable('Should have thrown an error');
			} catch (err: any) {
				expect(err).toBeInstanceOf(TempoAiError);
				expect(err.code).toBe(401);
				expect(err.message).toContain('Provider openai failed with status 401');
			}
		});

		it('should seamlessly fallback to the next provider if the first hits a 429 Exhausted Key rate limit', async () => {
			await initAI({
				remoteConfigUrl: false,
				providers: [
					{ id: 'openai', key: 'exhausted_key' },
					{ id: 'openai', key: 'good_key' }
				]
			});

			const fetchSpy = vi.spyOn(global, 'fetch');

			fetchSpy.mockResolvedValueOnce(new Response(null, {
				status: 429,
				statusText: 'Too Many Requests',
				headers: new Headers({
					'x-ratelimit-reset-tokens': '60'
				})
			}));

			fetchSpy.mockResolvedValueOnce(new Response(JSON.stringify({
				choices: [{ message: { content: '{"reasoning":"It is Thanksgiving.", "iso":"2026-11-26T00:00:00Z"}' } }]
			}), {
				status: 200,
				headers: new Headers({
					'x-ratelimit-remaining-tokens': '5000'
				})
			}));

			const result = await parseAI('Thanksgiving', { force: true });

			expect(fetchSpy).toHaveBeenCalledTimes(2);
			expect(result.format('{yyyy}-{mm}-{dd}')).toBe('2026-11-26');

			const limits = getAiRateLimits();
			expect(limits?.remainingTokens).toBe(5000);
		});

		it('should convert invalid JSON provider response into TempoAiError with status 422', async () => {
			await initAI({
				remoteConfigUrl: false,
				providers: [{ id: 'openai', key: 'test-key' }]
			});

			const fetchSpy = vi.spyOn(globalThis, 'fetch');
			fetchSpy.mockResolvedValueOnce(new Response(JSON.stringify({
				choices: [{ message: { content: 'not valid json at all {{' } }]
			}), { status: 200 }));

			await expect(parseAI('Thanksgiving', { force: true })).rejects.toThrowError(TempoAiError);

			fetchSpy.mockResolvedValueOnce(new Response(JSON.stringify({
				choices: [{ message: { content: 'not valid json at all {{' } }]
			}), { status: 200 }));

			try {
				await parseAI('Thanksgiving', { force: true });
			} catch (err: any) {
				expect(err.code).toBe(422);
				expect(err.message).toContain('returned invalid JSON payload');
			}
		});
	});

	describe('BoundedCache & Eviction', () => {
		it('should enforce maxCacheSize when inserting items beyond capacity', () => {
			const cache = new BoundedCache(3);
			cache.set('key1', 'val1');
			cache.set('key2', 'val2');
			cache.set('key3', 'val3');
			expect(cache.size).toBe(3);

			cache.set('key4', 'val4');
			expect(cache.size).toBe(3);
			expect(cache.has('key1')).toBe(false);
			expect(cache.has('key4')).toBe(true);
		});

		it('should evict expired items based on TTL', async () => {
			const cache = new BoundedCache(100, 50);
			cache.set('tempKey', 'tempVal');
			expect(cache.has('tempKey')).toBe(true);

			await new Promise(resolve => setTimeout(resolve, 60));

			expect(cache.has('tempKey')).toBe(false);
			expect(cache.get('tempKey')).toBeUndefined();
			expect(Array.from(cache.keys())).not.toContain('tempKey');
		});

		it('should preserve clearAiCache functionality', async () => {
			const cache = new BoundedCache(100);
			cache.set('Thanksgiving::2026-05-10', '2026-11-26T00:00:00Z');
			cache.set('Christmas::2026-05-10', '2026-12-25T00:00:00Z');

			await initAI({ remoteConfigUrl: false, cache });
			clearAiCache('Thanksgiving');

			expect(cache.has('Thanksgiving::2026-05-10')).toBe(false);
			expect(cache.has('Christmas::2026-05-10')).toBe(true);
		});

		it('should resolve static user glossary terms with context salt without hitting network or expiring', async () => {
			const resolvedOptions = Tempo.options;
			const tz = resolvedOptions.timeZone;
			const cal = resolvedOptions.calendar;
			const loc = Array.isArray(resolvedOptions.locale) ? resolvedOptions.locale[0] : resolvedOptions.locale;
			const sph = resolvedOptions.sphere || 'north';
			const cacheSalt = new Tempo().format('{yyyy}-{mm}-{dd}');
			const cacheKey = `my_custom_company_glossary_term::${cacheSalt}::${tz}::${cal}::${loc}::${sph}`;

			const glossary = new Map<string, string>([
				[cacheKey, '2026-11-01T00:00:00Z']
			]);

			await initAI({ remoteConfigUrl: false, cache: glossary });

			const fetchSpy = vi.spyOn(globalThis, 'fetch');

			const result = await parseAI('my_custom_company_glossary_term');
			expect(result.format('{yyyy}-{mm}-{dd}')).toBe('2026-11-01');
			expect(result.ai?.provider).toBe('cache');
			expect(result.ai?.cached).toBe(true);
			expect(fetchSpy).not.toHaveBeenCalled();
		});
	});

	describe('Rate Limit & Reset Header Parsing Hardening', () => {
		it('should correctly parse compound reset duration strings like 4m12s and 1h30m', async () => {
			await initAI({ remoteConfigUrl: false, providers: [{ id: 'openai', key: 'test-key' }] });
			const fetchSpy = vi.spyOn(globalThis, 'fetch');

			fetchSpy.mockResolvedValueOnce(new Response(null, {
				status: 429,
				statusText: 'Too Many Requests',
				headers: new Headers({
					'x-ratelimit-reset-tokens': '4m12s'
				})
			}));

			try {
				await parseAI('Thanksgiving', { force: true });
				expect.unreachable('Should have thrown TempoAiError');
			} catch (err: any) {
				expect(err).toBeInstanceOf(TempoAiError);
				expect(err.code).toBe(429);
				expect(err.retryAt).toBeDefined();
				expect(err.retryAt).toBeInstanceOf(Tempo);
			}

			const limits1 = getAiRateLimits();
			expect(limits1?.resetAt).toBeDefined();
		});

		it('should replace rather than retain prior rate-limit state when subsequent response has no headers', async () => {
			await initAI({ remoteConfigUrl: false, providers: [{ id: 'openai', key: 'test-key' }] });
			const fetchSpy = vi.spyOn(globalThis, 'fetch');

			fetchSpy.mockResolvedValueOnce(new Response(JSON.stringify({
				choices: [{ message: { content: '{"iso":"2026-11-26T00:00:00"}' } }]
			}), {
				status: 200,
				headers: new Headers({
					'x-ratelimit-remaining-tokens': '5000'
				})
			}));

			await parseAI('Thanksgiving 2026', { force: true });
			expect(getAiRateLimits()?.remainingTokens).toBe(5000);

			fetchSpy.mockResolvedValueOnce(new Response(JSON.stringify({
				choices: [{ message: { content: '{"iso":"2026-12-25T00:00:00"}' } }]
			}), {
				status: 200
			}));

			await parseAI('Christmas 2026', { force: true });

			expect(getAiRateLimits()).toBeNull();
		});

		it('should parse HTTP-date format Retry-After header strings into valid Tempo resetAt', async () => {
			await initAI({ remoteConfigUrl: false, providers: [{ id: 'openai', key: 'test-key' }] });
			const fetchSpy = vi.spyOn(globalThis, 'fetch');

			const httpDateStr = 'Wed, 21 Oct 2026 07:28:00 GMT';
			fetchSpy.mockResolvedValueOnce(new Response(JSON.stringify({
				choices: [{ message: { content: '{"iso":"2026-11-26T00:00:00"}' } }]
			}), {
				status: 200,
				headers: new Headers({
					'retry-after': httpDateStr
				})
			}));

			await parseAI('Thanksgiving 2026', { force: true });
			expect(getAiRateLimits()?.resetAt).toBeDefined();
			expect(getAiRateLimits()?.resetAt?.isValid).toBe(true);
		});

		it('should attach limits snapshot directly to the returned Tempo instance .ai property', async () => {
			await initAI({ remoteConfigUrl: false, providers: [{ id: 'groq', key: 'test-key' }] });
			const fetchSpy = vi.spyOn(globalThis, 'fetch');

			fetchSpy.mockResolvedValueOnce(new Response(JSON.stringify({
				choices: [{ message: { content: '{"iso":"2026-11-26T00:00:00"}' } }]
			}), {
				status: 200,
				headers: new Headers({
					'x-ratelimit-remaining-requests': '499',
					'x-ratelimit-remaining-tokens': '99500'
				})
			}));

			const result = await parseAI('Thanksgiving 2026', { force: true });
			expect(result.ai?.limits).toBeDefined();
			expect(result.ai?.limits?.remainingRequests).toBe(499);
			expect(result.ai?.limits?.remainingTokens).toBe(99500);
		});

		it('should ignore invalid or malformed duration strings without throwing or crashing', async () => {
			await initAI({ remoteConfigUrl: false, providers: [{ id: 'openai', key: 'test-key' }] });
			const fetchSpy = vi.spyOn(globalThis, 'fetch');

			fetchSpy.mockResolvedValueOnce(new Response(null, {
				status: 429,
				headers: new Headers({
					'x-ratelimit-reset-tokens': 'invalid_compound_string_123'
				})
			}));

			try {
				await parseAI('Thanksgiving', { force: true });
			} catch (err: any) {
				expect(err).toBeInstanceOf(TempoAiError);
				expect(err.retryAt).toBeUndefined();
			}

			expect(getAiRateLimits()).toBeNull();
		});

		it('should exclude transport timeout option from serialized request body', async () => {
			await initAI({
				remoteConfigUrl: false,
				providers: [{
					id: 'openai',
					key: 'test-key',
					options: {
						timeout: 4500,
						user: 'user-tempo-test'
					}
				}]
			});
			const fetchSpy = vi.spyOn(globalThis, 'fetch');

			fetchSpy.mockResolvedValueOnce(new Response(JSON.stringify({
				choices: [{ message: { content: '{"iso":"2026-11-26T00:00:00"}' } }]
			}), { status: 200 }));

			await parseAI('Thanksgiving 2026', { force: true });

			expect(fetchSpy).toHaveBeenCalledTimes(1);
			const requestInit = fetchSpy.mock.calls[0][1];
			const parsedBody = JSON.parse(requestInit?.body as string);

			expect(parsedBody.user).toBe('user-tempo-test');
			expect(parsedBody.timeout).toBeUndefined();
		});
	});
});
