import { parseAI, initAI, clearAiCache, getAiRateLimits, TempoAiError } from '../src/index.js';
import { BoundedCache } from '@magmacomputing/tempo/support';
import { Tempo } from '@magmacomputing/tempo';

describe('AI Parsing Plugin', () => {
	const liveApiKey = process.env.GROQ_API_KEY ?? process.env.OPENAI_API_KEY;
	const liveProviderId = process.env.GROQ_API_KEY ? 'groq' : 'openai';
	const isLiveTest = Boolean(process.env.LIVE_AI_TEST && liveApiKey);

	beforeEach(() => {
		if (isLiveTest) {
			initAI({
				providers: [{ id: liveProviderId, key: liveApiKey! }]
			});
		} else {
			initAI({
				providers: [{ id: 'groq', key: 'mock-key-for-unit-testing' }]
			});
		}
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	it('should fall back to native parsing first', async () => {
		// This should parse natively and not throw an API error even without a key
		const result = await parseAI('2026-05-10');
		expect(result.isValid).toBe(true);
		expect(result.format('{yyyy}-{mm}-{dd}')).toBe('2026-05-10');
	});

	it('should throw TempoAiError if no key is configured and AI is needed', async () => {
		initAI({ providers: [] });
		await expect(parseAI('Next Thanksgiving')).rejects.toThrow(TempoAiError);
		await expect(parseAI('Next Thanksgiving')).rejects.toThrow('No AI providers configured.');
	});

	it('should parse natural language successfully', async () => {
		if (!isLiveTest) {
			vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(new Response(JSON.stringify({
				choices: [{ message: { content: '{"reasoning":"The Friday after Thanksgiving", "iso":"2026-11-27T00:00:00"}' } }]
			}), {
				status: 200,
				headers: new Headers({
					'x-ratelimit-remaining-requests': '99',
					'x-ratelimit-remaining-tokens': '4950'
				})
			}));
		}

		// Provide a strict anchor so we can assert the result deterministically
		const anchorDate = '2026-05-10T12:00:00Z';
		const result = await parseAI('The Friday after Thanksgiving', { anchor: anchorDate, timeZone: 'UTC', force: true });

		expect(result).toBeInstanceOf(Tempo);
		expect(result.isValid).toBe(true);
		expect(result.format('{yyyy}-{mm}-{dd}')).toBe('2026-11-27');
	});

	it('should cache the result', async () => {
		const anchorDate = '2026-05-10T12:00:00Z';
		// Clear cache first
		clearAiCache('The Friday after Thanksgiving');

		const fetchSpy = vi.spyOn(globalThis, 'fetch');
		if (!isLiveTest) {
			fetchSpy.mockResolvedValueOnce(new Response(JSON.stringify({
				choices: [{ message: { content: '{"reasoning":"The Friday after Thanksgiving", "iso":"2026-11-27T00:00:00"}' } }]
			}), { status: 200 }));
		}

		// First parse (hits network or mock)
		const dt1 = await parseAI('The Friday after Thanksgiving', { anchor: anchorDate, timeZone: 'UTC' });
		expect(dt1.format('{yyyy}-{mm}-{dd}')).toBe('2026-11-27');

		// Second parse (hits cache instantly)
		const dt2 = await parseAI('The Friday after Thanksgiving', { anchor: anchorDate, timeZone: 'UTC' });
		expect(dt2.format('{yyyy}-{mm}-{dd}')).toBe('2026-11-27');

		if (!isLiveTest) {
			expect(fetchSpy).toHaveBeenCalledTimes(1);
		}
	});

	it('should expose rate limits after a request', async () => {
		if (!isLiveTest) {
			vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(new Response(JSON.stringify({
				choices: [{ message: { content: '{"reasoning":"Test date", "iso":"2026-11-26T00:00:00"}' } }]
			}), {
				status: 200,
				headers: new Headers({
					'x-ratelimit-remaining-requests': '99',
					'x-ratelimit-remaining-tokens': '4950',
					'x-ratelimit-reset-tokens': '60s'
				})
			}));
		}

		await parseAI('Thanksgiving', { force: true });

		const limits = getAiRateLimits();
		expect(limits).not.toBeNull();
		expect(limits?.remainingRequests).toBeDefined();
		expect(limits?.remainingTokens).toBeDefined();
		expect(limits?.resetAt).toBeInstanceOf(Tempo);
	});

	describe('Mocked Network Failures', () => {
		it('should throw TempoAiError with 401 when API key is bad, expired, or revoked', async () => {
			// Temporarily inject a fake key
			initAI({ providers: [{ id: 'openai', key: 'bad_key' }] });

			vi.spyOn(global, 'fetch').mockResolvedValueOnce(new Response(null, {
				status: 401,
				statusText: 'Unauthorized'
			}));

			// The last error in the loop should bubble up
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
			// Set up two providers. The first will fail (exhausted), the second will succeed.
			initAI({
				providers: [
					{ id: 'openai', key: 'exhausted_key' },
					{ id: 'openai', key: 'good_key' }
				]
			});

			const fetchSpy = vi.spyOn(global, 'fetch');

			// First fetch call: Groq hits 429 Too Many Requests
			fetchSpy.mockResolvedValueOnce(new Response(null, {
				status: 429,
				statusText: 'Too Many Requests',
				headers: new Headers({
					'x-ratelimit-reset-tokens': '60' // Resets in 60 seconds
				})
			}));

			// Second fetch call: OpenAI succeeds
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

			// Verify the rate limits were updated correctly from the first 429 response before the success!
			// Actually, the second success response overwrites the rate limits with OpenAI's headers.
			const limits = getAiRateLimits();
			expect(limits?.remainingTokens).toBe(5000);
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
			const cache = new BoundedCache(100, 50); // 50ms TTL
			cache.set('tempKey', 'tempVal');
			expect(cache.has('tempKey')).toBe(true);

			await new Promise(resolve => setTimeout(resolve, 60));

			expect(cache.has('tempKey')).toBe(false);
			expect(cache.get('tempKey')).toBeUndefined();
			expect(Array.from(cache.keys())).not.toContain('tempKey');
		});

		it('should preserve clearAiCache functionality', () => {
			const cache = new BoundedCache(100);
			cache.set('Thanksgiving::2026-05-10', '2026-11-26T00:00:00Z');
			cache.set('Christmas::2026-05-10', '2026-12-25T00:00:00Z');

			initAI({ cache });
			clearAiCache('Thanksgiving');

			expect(cache.has('Thanksgiving::2026-05-10')).toBe(false);
			expect(cache.has('Christmas::2026-05-10')).toBe(true);
		});

		it('should update BoundedCache options via Tempo.init', () => {
			const cache = new BoundedCache(1000, 3600000);
			initAI({ cache });

			Tempo.init({ cache: { maxSize: 50, ttl: 5000 } });
			expect(cache.maxSize).toBe(50);
			expect(cache.ttl).toBe(5000);

			Tempo.init({ cache: { maxSize: 5, ttl: 100 } });
			expect(cache.maxSize).toBe(5);
			expect(cache.ttl).toBe(100);
		});

		it('should normalize cache keys (whitespace & case) for clearAiCache', () => {
			const cache = new BoundedCache(100);
			cache.set('thanksgiving::2026-05-10', '2026-11-26T00:00:00Z');

			initAI({ cache });
			clearAiCache('   THANKSGIVING   ');
			expect(cache.has('thanksgiving::2026-05-10')).toBe(false);
		});

		it('should resolve static un-salted user glossary terms without hitting network or expiring', async () => {
			const glossary = new Map<string, string>([
				['easter sunday 2026', '2026-04-05T00:00:00Z'],
				['q4 freeze 2026', '2026-11-01T00:00:00Z']
			]);

			initAI({ cache: glossary });

			const fetchSpy = vi.spyOn(globalThis, 'fetch');

			// Two-tier lookup hits un-salted normalized static key directly
			const result = await parseAI('Easter Sunday 2026');
			expect(result.format('{yyyy}-{mm}-{dd}')).toBe('2026-04-05');
			expect(fetchSpy).not.toHaveBeenCalled();
		});

		it('should protect static un-salted keys set via setStatic from TTL and LRU maxCacheSize eviction in BoundedCache', async () => {
			const cache = new BoundedCache(2, 50); // maxSize 2, TTL 50ms
			cache.setStatic('easter sunday 2026', '2026-04-05T00:00:00Z'); // Static key
			cache.set('temp1::2026-05-10', '2026-05-10T00:00:00Z');  // Salted key
			cache.set('temp2::2026-05-10', '2026-05-10T00:00:00Z');  // Salted key, pushes total to 3

			// LRU capacity check: should evict oldest salted key ('temp1::2026-05-10'), preserving static 'easter sunday 2026'
			expect(cache.has('easter sunday 2026')).toBe(true);
			expect(cache.has('temp1::2026-05-10')).toBe(false);

			// Wait for TTL expiration
			await new Promise(resolve => setTimeout(resolve, 60));

			// Salted key expires, static key remains intact
			expect(cache.has('temp2::2026-05-10')).toBe(false);
			expect(cache.has('easter sunday 2026')).toBe(true);
			expect(cache.get('easter sunday 2026')).toBe('2026-04-05T00:00:00Z');
		});
	});

	describe('Configurable Token Parameter', () => {
		it('should use specified tokenParam in provider request payload', async () => {
			const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValueOnce(new Response(JSON.stringify({
				choices: [{ message: { content: '{"reasoning":"test", "iso":"2026-12-25T00:00:00Z"}' } }]
			}), { status: 200 }));

			initAI({
				providers: [{ id: 'custom-llm', key: 'test-key', url: 'https://api.custom.com/v1/chat', model: 'custom-model', tokenParam: 'max_tokens' }]
			});

			await parseAI('some random unparseable string', { force: true });

			expect(fetchSpy).toHaveBeenCalled();
			const callBody = JSON.parse(fetchSpy.mock.calls[0][1]?.body as string);
			expect(callBody.max_tokens).toBe(250);
			expect(callBody.max_completion_tokens).toBeUndefined();
		});
	});
});

