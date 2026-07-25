import { parseAI, initAI, clearAiCache, getAiRateLimits, TempoAiError } from '../src/index.js';
import { Tempo } from '@magmacomputing/tempo';

describe('AI Parsing Plugin', () => {
	const hasKey = Boolean(process.env.OPENAI_API_KEY);

	beforeAll(() => {
		if (hasKey) {
			initAI({
				providers: [{ id: 'openai', key: process.env.OPENAI_API_KEY! }]
			});
		}
	});

	beforeEach(() => {
		// Suppress expected native parsing errors from polluting the test output
		vi.spyOn(console, 'error').mockImplementation(() => { });
		vi.spyOn(console, 'warn').mockImplementation(() => { });
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('should fall back to native parsing first', async () => {
		// This should parse natively and not throw an API error even without a key
		const result = await parseAI('2026-05-10');
		expect(result.isValid).toBe(true);
		expect(result.format('{yyyy}-{mm}-{dd}')).toBe('2026-05-10');
	});

	it('should throw TempoAiError if no key is configured and AI is needed', async () => {
		if (!hasKey) {
			await expect(parseAI('Next Thanksgiving')).rejects.toThrow(TempoAiError);
			await expect(parseAI('Next Thanksgiving')).rejects.toThrow('No AI providers configured.');
		}
	});

	it.runIf(hasKey)('should parse natural language successfully', async () => {
		// Provide a strict anchor so we can assert the result deterministically
		const anchorDate = '2026-05-10T12:00:00Z';
		const result = await parseAI('Two days after December 1st', { anchor: anchorDate, timeZone: 'UTC' });

		expect(result).toBeInstanceOf(Tempo);
		expect(result.isValid).toBe(true);
		expect(result.format('{yyyy}-{mm}-{dd}')).toBe('2026-12-03');
	});

	it.runIf(hasKey)('should cache the result', async () => {
		const anchorDate = '2026-05-10T12:00:00Z';
		// Clear cache first
		clearAiCache('Two days after December 1st');

		// First parse (hits network)
		const dt1 = await parseAI('Two days after December 1st', { anchor: anchorDate, timeZone: 'UTC' });
		expect(dt1.format('{yyyy}-{mm}-{dd}')).toBe('2026-12-03');

		// Second parse (hits cache instantly)
		const dt2 = await parseAI('Two days after December 1st', { anchor: anchorDate, timeZone: 'UTC' });
		expect(dt2.format('{yyyy}-{mm}-{dd}')).toBe('2026-12-03');
	});

	it.runIf(hasKey)('should expose rate limits after a request', () => {
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
				await parseAI('Thanksgiving');
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

			const result = await parseAI('Thanksgiving');

			expect(fetchSpy).toHaveBeenCalledTimes(2);
			expect(result.format('{yyyy}-{mm}-{dd}')).toBe('2026-11-26');

			// Verify the rate limits were updated correctly from the first 429 response before the success!
			// Actually, the second success response overwrites the rate limits with OpenAI's headers.
			const limits = getAiRateLimits();
			expect(limits?.remainingTokens).toBe(5000);
		});
	});
});
