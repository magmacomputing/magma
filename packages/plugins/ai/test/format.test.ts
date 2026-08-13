import { Tempo } from '@magmacomputing/tempo';
import { formatAI, initAI, TempoAiError, type TempoAiFormatResult, type AiCacheAdapter } from '../src/index.js';

describe('AI Format Plugin (formatAI)', () => {
	beforeEach(async () => {
		vi.spyOn(console, 'warn').mockImplementation(() => { });
		vi.spyOn(console, 'error').mockImplementation(() => { });
		vi.spyOn(console, 'log').mockImplementation(() => { });
		await initAI({ remoteConfigUrl: false, providers: [{ id: 'groq', key: 'mock-key-for-unit-testing' }] });
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('should calculate native grounding metrics and format natural narrative date', async () => {
		const fetchSpy = vi.spyOn(globalThis, 'fetch');
		fetchSpy.mockResolvedValueOnce(new Response(JSON.stringify({
			choices: [{
				message: {
					content: JSON.stringify({
						formatted: 'this Friday at 5:00 PM EST (in 5 days)',
						confidence: 0.98,
						reasoning: 'Target date is a Friday, exactly 5 calendar days away.',
					}),
				},
			}],
		}), { status: 200, headers: { 'Content-Type': 'application/json' } }));

		const target = new Tempo('2026-08-07T17:00:00Z');
		const anchor = new Tempo('2026-08-02T17:00:00Z');

		const result = await formatAI(target, 'friendly reminder tone with countdown', { anchor });
		expect(result).toBeDefined();
		expect(result.formatted).toBe('this Friday at 5:00 PM EST (in 5 days)');
		expect(result.confidence).toBe(0.98);
		expect(result.provider).toBe('groq');
		expect(result.reasoning).toContain('Friday');

		expect(fetchSpy).toHaveBeenCalledTimes(1);
		const requestBody = JSON.parse(fetchSpy.mock.calls[0][1]?.body as string);
		const systemPrompt = requestBody.messages[0].content;
		expect(systemPrompt).toContain('Grounding Context:');
		expect(systemPrompt).toContain('Day of Week: Friday');
		expect(systemPrompt).toContain('+5 calendar days');
		expect(systemPrompt).toContain('in the FUTURE');
	});

	it('should accept TC39 Temporal instances as valid date inputs', async () => {
		const fetchSpy = vi.spyOn(globalThis, 'fetch');
		fetchSpy.mockResolvedValueOnce(new Response(JSON.stringify({
			choices: [{
				message: {
					content: JSON.stringify({
						formatted: 'Tomorrow afternoon at 3:00 PM',
						confidence: 0.95,
					}),
				},
			}],
		}), { status: 200, headers: { 'Content-Type': 'application/json' } }));

		const temporalZdt = new Tempo('2026-08-05T15:00:00+10:00[Australia/Sydney]').toDateTime();
		const result = await formatAI(temporalZdt, 'compact relative format');

		expect(result.formatted).toBe('Tomorrow afternoon at 3:00 PM');
		expect(result.confidence).toBe(0.95);
		expect(fetchSpy).toHaveBeenCalledTimes(1);

		const requestBody = JSON.parse(fetchSpy.mock.calls[0][1]?.body as string);
		expect(requestBody.messages[0].content).toContain('(Australia/Sydney)');
	});

	it('should propagate style, region, and target locale to provider prompt', async () => {
		const fetchSpy = vi.spyOn(globalThis, 'fetch');
		fetchSpy.mockResolvedValueOnce(new Response(JSON.stringify({
			choices: [{
				message: {
					content: JSON.stringify({
						formatted: 'Vendredi prochain à 17h00',
						confidence: 0.96,
					}),
				},
			}],
		}), { status: 200, headers: { 'Content-Type': 'application/json' } }));

		const target = '2026-08-07T17:00:00Z';
		const result = await formatAI(target, 'format for French invite', {
			style: 'formal',
			locale: 'fr-FR',
			region: 'FR-IDF',
		});

		expect(result.formatted).toBe('Vendredi prochain à 17h00');
		const requestBody = JSON.parse(fetchSpy.mock.calls[0][1]?.body as string);
		const promptContext = requestBody.messages[0].content;
		expect(promptContext).toContain('Target Locale: fr-FR');
		expect(promptContext).toContain('Desired Style/Tone: formal');
		expect(promptContext).toContain('Regional Context: FR-IDF');
	});

	it('should check cache and skip network fetch on cache hits', async () => {
		const fetchSpy = vi.spyOn(globalThis, 'fetch');
		fetchSpy.mockResolvedValueOnce(new Response(JSON.stringify({
			choices: [{
				message: {
					content: JSON.stringify({
						formatted: 'Pre-cached formatted string',
						confidence: 0.99,
						reasoning: 'Generated once',
					}),
				},
			}],
		}), { status: 200, headers: { 'Content-Type': 'application/json' } }));

		const target = new Tempo('2026-08-07T17:00:00Z');
		const anchor = new Tempo('2026-08-02T17:00:00Z');

		const result1 = await formatAI(target, 'cached prompt', { anchor });
		expect(result1.provider).toBe('groq');
		expect(fetchSpy).toHaveBeenCalledTimes(1);

		const result2 = await formatAI(target, 'cached prompt', { anchor });
		expect(result2.formatted).toBe('Pre-cached formatted string');
		expect(result2.provider).toBe('cache');
		expect(result2.confidence).toBe(0.99);
		expect(fetchSpy).toHaveBeenCalledTimes(1);
	});

	it('should support custom async AiCacheAdapter storage', async () => {
		const cacheStore = new Map<string, string>();
		const customAdapter: AiCacheAdapter = {
			get: vi.fn(async (key: string) => cacheStore.get(key)),
			set: vi.fn(async (key: string, val: string) => { cacheStore.set(key, val); }),
		};

		const fetchSpy = vi.spyOn(globalThis, 'fetch');
		fetchSpy.mockResolvedValueOnce(new Response(JSON.stringify({
			choices: [{
				message: {
					content: JSON.stringify({
						formatted: 'Distributed adapter cached',
						confidence: 0.97,
					}),
				},
			}],
		}), { status: 200, headers: { 'Content-Type': 'application/json' } }));

		const target = new Tempo('2026-08-07T17:00:00Z');
		const anchor = new Tempo('2026-08-02T17:00:00Z');

		const result1 = await formatAI(target, 'adapter prompt', { anchor, cacheAdapter: customAdapter });
		expect(result1.formatted).toBe('Distributed adapter cached');
		expect(customAdapter.set).toHaveBeenCalledTimes(1);

		// Clear local Tempo memory cache to ensure it reads from custom adapter
		Tempo.cache.clear();

		const result2 = await formatAI(target, 'adapter prompt', { anchor, cacheAdapter: customAdapter });
		expect(result2.formatted).toBe('Distributed adapter cached');
		expect(result2.provider).toBe('cache');
		expect(customAdapter.get).toHaveBeenCalledTimes(2);
		expect(fetchSpy).toHaveBeenCalledTimes(1);
	});

	it('should throw TempoAiError if confidence is below minConfidence', async () => {
		const fetchSpy = vi.spyOn(globalThis, 'fetch');
		fetchSpy.mockResolvedValueOnce(new Response(JSON.stringify({
			choices: [{
				message: {
					content: JSON.stringify({
						formatted: 'Uncertain format',
						confidence: 0.45,
					}),
				},
			}],
		}), { status: 200, headers: { 'Content-Type': 'application/json' } }));

		await expect(formatAI('2026-08-07', 'test', { minConfidence: 0.8 }))
			.rejects.toThrow(/formatAI confidence \(0.45\) is below the required threshold of 0.8/i);
	});

	it('should throw TempoAiError(400) for invalid date or anchor', async () => {
		await expect(formatAI('invalid-date-string', 'prompt'))
			.rejects.toThrow(/Invalid date provided to formatAI/i);

		await expect(formatAI('2026-08-07', 'prompt', { anchor: 'invalid-anchor-date' }))
			.rejects.toThrow(/Invalid anchor date provided to formatAI/i);
	});

	it('should support multi-provider race execution mode', async () => {
		let slowWasAborted = false;
		const fetchSpy = vi.spyOn(globalThis, 'fetch');
		fetchSpy.mockImplementation(async (_url, init) => {
			const body = JSON.parse(init?.body as string);
			const signal = init?.signal as AbortSignal | undefined;
			if (body.model === 'fast-model') {
				return new Response(JSON.stringify({
					choices: [{
						message: {
							content: JSON.stringify({
								formatted: 'Fast winner formatted narrative',
								confidence: 0.95,
							}),
						},
					}],
				}), { status: 200, headers: { 'Content-Type': 'application/json' } });
			}
			return new Promise((_resolve, reject) => {
				if (signal?.aborted) {
					slowWasAborted = true;
					reject(new DOMException('Aborted', 'AbortError'));
					return;
				}
				signal?.addEventListener('abort', () => {
					slowWasAborted = true;
					reject(new DOMException('Aborted', 'AbortError'));
				});
			});
		});

		const result = await formatAI('2026-08-07', 'quick race format', {
			mode: 'race',
			providers: [
				{ id: 'slow-provider', key: 'k1', url: 'https://api.openai.com/v1/chat/completions', model: 'slow-model' },
				{ id: 'fast-provider', key: 'k2', url: 'https://api.groq.com/v1/chat/completions', model: 'fast-model' },
			],
		});

		expect(result.formatted).toBe('Fast winner formatted narrative');
		expect(result.provider).toBe('fast-provider');
		expect(slowWasAborted).toBe(true);
	});

	it('should support batch array processing with softErrors', async () => {
		const fetchSpy = vi.spyOn(globalThis, 'fetch');
		fetchSpy
			.mockResolvedValueOnce(new Response(JSON.stringify({
				choices: [{
					message: {
						content: JSON.stringify({
							formatted: 'Item 1 formatted',
							confidence: 0.95,
						}),
					},
				}],
			}), { status: 200, headers: { 'Content-Type': 'application/json' } }))
			.mockResolvedValueOnce(new Response('Server Error', { status: 500 }));

		const items = [
			{ date: '2026-08-03', prompt: 'item 1' },
			{ date: '2026-08-05', prompt: 'item 2' },
		];

		const results = await formatAI(items, { softErrors: true });
		expect(results).toHaveLength(2);
		expect((results[0] as TempoAiFormatResult).formatted).toBe('Item 1 formatted');
		expect(results[1]).toBeInstanceOf(TempoAiError);
	});
});
