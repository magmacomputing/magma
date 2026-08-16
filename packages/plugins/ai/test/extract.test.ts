import { Tempo } from '@magmacomputing/tempo';
import {
	extractAI,
	initAI,
	resetAI,
	TempoAiError,
	AiMode,
	type TempoAiExtractResult,
	type AiCacheAdapter,
} from '../src/index.js';

describe('AI Extract Plugin (extractAI)', () => {
	beforeEach(async () => {
		resetAI();
		Tempo.cache.clear();
		vi.spyOn(console, 'warn').mockImplementation(() => { });
		vi.spyOn(console, 'error').mockImplementation(() => { });
		vi.spyOn(console, 'log').mockImplementation(() => { });
		await initAI({ remoteConfigUrl: false, providers: [{ id: 'groq', key: 'mock-key-for-unit-testing' }] });
	});

	afterEach(() => {
		resetAI();
		Tempo.cache.clear();
		vi.restoreAllMocks();
	});

	it('should scan unstructured text and extract multiple temporal events with native Tempo instances', async () => {
		const fetchSpy = vi.spyOn(globalThis, 'fetch');
		fetchSpy.mockResolvedValueOnce(new Response(JSON.stringify({
			choices: [{
				message: {
					content: JSON.stringify({
						events: [
							{
								label: 'Sprint Planning',
								start: '2026-08-11T10:00:00',
								end: '2026-08-11T11:30:00',
								type: 'interval',
								rawText: 'tomorrow from 10:00 AM to 11:30 AM',
								confidence: 0.98,
							},
							{
								label: 'Q3 Deliverables Deadline',
								start: '2026-08-14T17:00:00',
								end: null,
								type: 'deadline',
								rawText: 'due next Friday by 5:00 PM',
								confidence: 0.95,
							},
						],
						confidence: 0.96,
						reasoning: 'Extracted 1 scheduled meeting interval and 1 project deadline.',
					}),
				},
			}],
		}), { status: 200, headers: { 'Content-Type': 'application/json' } }));

		const text = "Hi team, let's meet tomorrow from 10:00 AM to 11:30 AM for Sprint Planning. Also, all Q3 deliverables are due next Friday by 5:00 PM.";
		const anchor = new Tempo('2026-08-10T09:00:00Z');

		const result = await extractAI(text, { anchor, timeZone: 'UTC' });

		expect(result).toBeDefined();
		expect(result.events).toHaveLength(2);
		expect(result.confidence).toBe(0.96);
		expect(result.provider).toBe('groq');
		expect(result.reasoning).toContain('scheduled meeting');

		const event1 = result.events[0];
		expect(event1.label).toBe('Sprint Planning');
		expect(Tempo.isTempo(event1.start)).toBe(true);
		expect(event1.start.format('{yyyy}-{mm}-{dd} {hh}:{mi}')).toBe('2026-08-11 10:00');
		expect(Tempo.isTempo(event1.end)).toBe(true);
		expect(event1.end?.format('{yyyy}-{mm}-{dd} {hh}:{mi}')).toBe('2026-08-11 11:30');
		expect(event1.type).toBe('interval');
		expect(event1.rawText).toBe('tomorrow from 10:00 AM to 11:30 AM');

		const event2 = result.events[1];
		expect(event2.label).toBe('Q3 Deliverables Deadline');
		expect(Tempo.isTempo(event2.start)).toBe(true);
		expect(event2.start.format('{yyyy}-{mm}-{dd} {hh}:{mi}')).toBe('2026-08-14 17:00');
		expect(event2.end).toBeUndefined();
		expect(event2.type).toBe('deadline');

		expect(fetchSpy).toHaveBeenCalledTimes(1);
		const requestBody = JSON.parse(fetchSpy.mock.calls[0][1]?.body as string);
		const systemPrompt = requestBody.messages[0].content;
		expect(systemPrompt).toContain('Grounding Context:');
		expect(systemPrompt).toContain('Reference Anchor Date-Time: 2026-08-10T09:00:00 (UTC)');
		expect(systemPrompt).toContain('Reference Day of Week: Monday');
	});

	it('should return empty events array when text contains no temporal entities', async () => {
		const fetchSpy = vi.spyOn(globalThis, 'fetch');
		fetchSpy.mockResolvedValueOnce(new Response(JSON.stringify({
			choices: [{
				message: {
					content: JSON.stringify({
						events: [],
						confidence: 1.0,
						reasoning: 'No temporal expressions or events were detected in the input text.',
					}),
				},
			}],
		}), { status: 200, headers: { 'Content-Type': 'application/json' } }));

		const text = 'The quick brown fox jumps over the lazy dog. Just some generic prose without any dates.';
		const result = await extractAI(text);

		expect(result).toBeDefined();
		expect(result.events).toHaveLength(0);
		expect(result.confidence).toBe(1.0);
		expect(result.provider).toBe('groq');
	});

	it('should include category filter in grounding context when specified', async () => {
		const fetchSpy = vi.spyOn(globalThis, 'fetch');
		fetchSpy.mockResolvedValueOnce(new Response(JSON.stringify({
			choices: [{
				message: {
					content: JSON.stringify({
						events: [
							{
								label: 'Product Demo',
								start: '2026-08-12T14:00:00',
								type: 'point',
								confidence: 0.95,
							},
						],
						confidence: 0.95,
					}),
				},
			}],
		}), { status: 200, headers: { 'Content-Type': 'application/json' } }));

		const text = 'Product demo on Wednesday at 2pm. Flights booked for Thursday at 6am.';
		const result = await extractAI(text, {
			categories: ['meeting', 'demo'],
			region: 'US-NY',
		});

		expect(result.events).toHaveLength(1);
		expect(result.events[0].label).toBe('Product Demo');

		const requestBody = JSON.parse(fetchSpy.mock.calls[0][1]?.body as string);
		const systemPrompt = requestBody.messages[0].content;
		expect(systemPrompt).toContain('Filter Categories: demo, meeting');
		expect(systemPrompt).toContain('Region Context: US-NY');
	});

	it('should write to and read from multi-tier cache with Tempo instance rehydration', async () => {
		const fetchSpy = vi.spyOn(globalThis, 'fetch');
		fetchSpy.mockResolvedValueOnce(new Response(JSON.stringify({
			choices: [{
				message: {
					content: JSON.stringify({
						events: [
							{
								label: 'Dentist Appointment',
								start: '2026-08-15T09:00:00',
								end: '2026-08-15T10:00:00',
								type: 'interval',
								confidence: 0.99,
							},
						],
						confidence: 0.99,
						reasoning: 'Extracted dentist appointment.',
					}),
				},
			}],
		}), { status: 200, headers: { 'Content-Type': 'application/json' } }));

		const cacheStore = new Map<string, string>();
		const customAdapter: AiCacheAdapter = {
			get: vi.fn(async (key: string) => cacheStore.get(key)),
			set: vi.fn(async (key: string, val: string) => {
				cacheStore.set(key, val);
			}),
		}

		const text = 'Dentist appointment on August 15 from 9am to 10am.';
		const anchor = new Tempo('2026-08-01T00:00:00Z');

		// First call - should query provider and populate cache
		const result1 = await extractAI(text, {
			anchor,
			cacheAdapter: customAdapter,
			timeZone: 'UTC',
		});
		expect(result1.provider).toBe('groq');
		expect(result1.events).toHaveLength(1);
		expect(Tempo.isTempo(result1.events[0].start)).toBe(true);
		expect(fetchSpy).toHaveBeenCalledTimes(1);
		expect(customAdapter.set).toHaveBeenCalledTimes(1);

		// Second call - should return rehydrated cache
		const result2 = await extractAI(text, {
			anchor,
			cacheAdapter: customAdapter,
			timeZone: 'UTC',
		});
		expect(result2.provider).toBe('cache');
		expect(result2.events).toHaveLength(1);
		expect(Tempo.isTempo(result2.events[0].start)).toBe(true);
		expect(result2.events[0].start.format('{yyyy}-{mm}-{dd} {hh}:{mi}')).toBe('2026-08-15 09:00');
		expect(Tempo.isTempo(result2.events[0].end)).toBe(true);
		expect(result2.events[0].end?.format('{yyyy}-{mm}-{dd} {hh}:{mi}')).toBe('2026-08-15 10:00');
		expect(fetchSpy).toHaveBeenCalledTimes(1); // No new network call
	});

	it('should support force: true and cache: false bypass options', async () => {
		const cacheStore = new Map<string, string>();
		const customAdapter: AiCacheAdapter = {
			get: vi.fn(async (key: string) => cacheStore.get(key)),
			set: vi.fn(async (key: string, val: string) => {
				cacheStore.set(key, val);
			}),
		}

		const fetchSpy = vi.spyOn(globalThis, 'fetch');
		const mockResponse = () => new Response(JSON.stringify({
			choices: [{
				message: {
					content: JSON.stringify({
						events: [
							{
								label: 'One-on-One',
								start: '2026-08-12T15:00:00',
								type: 'point',
								confidence: 0.95,
							},
						],
						confidence: 0.95,
					}),
				},
			}],
		}), { status: 200, headers: { 'Content-Type': 'application/json' } });

		fetchSpy
			.mockResolvedValueOnce(mockResponse())
			.mockResolvedValueOnce(mockResponse())
			.mockResolvedValueOnce(mockResponse());

		const text = '1-on-1 catchup on Wednesday at 3pm.';
		const anchor = new Tempo('2026-08-10T09:00:00Z');

		await extractAI(text, { anchor, timeZone: 'UTC', cacheAdapter: customAdapter });
		expect(fetchSpy).toHaveBeenCalledTimes(1);
		expect(customAdapter.set).toHaveBeenCalledTimes(1);

		// force: true should make a new fetch
		const forcedResult = await extractAI(text, { anchor, timeZone: 'UTC', force: true, cacheAdapter: customAdapter });
		expect(forcedResult.provider).toBe('groq');
		expect(fetchSpy).toHaveBeenCalledTimes(2);

		// cache: false should skip writing to cache
		customAdapter.set = vi.fn();
		const uncachedResult = await extractAI('Another catchup on Thursday at 4pm.', {
			anchor,
			timeZone: 'UTC',
			cache: false,
			cacheAdapter: customAdapter,
		});
		expect(uncachedResult.provider).toBe('groq');
		expect(customAdapter.set).not.toHaveBeenCalled();
		expect(fetchSpy).toHaveBeenCalledTimes(3);
	});

	it('should reject invalid text and anchor inputs with TempoAiError(400) and preserve error cause', async () => {
		await expect(extractAI(''))
			.rejects.toMatchObject({ message: 'Invalid text input provided to extractAI: text must be a non-empty string.', status: 400 });

		await expect(extractAI('   '))
			.rejects.toMatchObject({ message: 'Invalid text input provided to extractAI: text must be a non-empty string.', status: 400 });

		await expect(extractAI(null as any))
			.rejects.toMatchObject({ message: 'Invalid text input provided to extractAI: text must be a non-empty string.', status: 400 });

		let caughtErr: any;
		try {
			await extractAI('some text', { anchor: 'invalid-anchor-date' });
		} catch (err: any) {
			caughtErr = err;
		}
		expect(caughtErr).toBeInstanceOf(TempoAiError);
		expect(caughtErr.status).toBe(400);
		expect(caughtErr.cause).toBeDefined();
	});

	it('should validate minConfidence and reject non-finite and out-of-range thresholds before cache read or provider calls', async () => {
		const fetchSpy = vi.spyOn(globalThis, 'fetch');
		const customAdapter: AiCacheAdapter = {
			get: vi.fn(async () => undefined),
			set: vi.fn(async () => { }),
		}

		// Non-finite
		await expect(extractAI('some text', { minConfidence: NaN, cacheAdapter: customAdapter }))
			.rejects.toMatchObject({ message: 'Invalid minConfidence provided to extractAI: "NaN"', status: 400 });

		await expect(extractAI('some text', { minConfidence: Infinity, cacheAdapter: customAdapter }))
			.rejects.toMatchObject({ message: 'Invalid minConfidence provided to extractAI: "Infinity"', status: 400 });

		// Out-of-bounds
		await expect(extractAI('some text', { minConfidence: -0.5, cacheAdapter: customAdapter }))
			.rejects.toMatchObject({ message: 'Invalid minConfidence provided to extractAI: "-0.5"', status: 400 });

		await expect(extractAI('some text', { minConfidence: 1.2, cacheAdapter: customAdapter }))
			.rejects.toMatchObject({ message: 'Invalid minConfidence provided to extractAI: "1.2"', status: 400 });

		expect(customAdapter.get).not.toHaveBeenCalled();
		expect(fetchSpy).not.toHaveBeenCalled();
	});

	it('should throw TempoAiError(422) when extracted confidence is below minConfidence', async () => {
		const fetchSpy = vi.spyOn(globalThis, 'fetch');
		fetchSpy.mockResolvedValueOnce(new Response(JSON.stringify({
			choices: [{
				message: {
					content: JSON.stringify({
						events: [{ label: 'Vague Meeting', start: '2026-08-11T10:00:00', type: 'point', confidence: 0.5 }],
						confidence: 0.5,
					}),
				},
			}],
		}), { status: 200, headers: { 'Content-Type': 'application/json' } }));

		await expect(extractAI('maybe meet sometime next week', { minConfidence: 0.8 }))
			.rejects.toThrow(/extractAI confidence \(0.5\) is below the required threshold of 0.8/i);
	});

	it('should throw TempoAiError(400) when no providers are configured', async () => {
		await initAI({ remoteConfigUrl: false, providers: [] });
		await expect(extractAI('Meeting tomorrow at 10am'))
			.rejects.toMatchObject({ message: expect.stringMatching(/No AI providers configured/i), status: 400 });
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
								events: [{ label: 'Fast Event', start: '2026-08-12T10:00:00', type: 'point', confidence: 0.95 }],
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

		const result = await extractAI('Team sync on Wednesday at 10am', {
			mode: 'race',
			anchor: new Tempo('2026-08-10T00:00:00Z'),
			timeZone: 'UTC',
			providers: [
				{ id: 'slow-provider', key: 'key-slow', url: 'https://api.openai.com/v1/chat/completions', model: 'slow-model' },
				{ id: 'fast-provider', key: 'key-fast', url: 'https://api.groq.com/v1/chat/completions', model: 'fast-model' },
			],
		});

		expect(result.provider).toBe('fast-provider');
		expect(result.events[0].label).toBe('Fast Event');
		expect(slowWasAborted).toBe(true);
	});

	it('should support batch array processing with softErrors', async () => {
		const fetchSpy = vi.spyOn(globalThis, 'fetch');
		fetchSpy.mockImplementation(async (_url, init) => {
			const body = JSON.parse(init?.body as string);
			const hasFailedPrompt = body.messages?.some((m: any) => m.content?.includes('Another event'));
			if (hasFailedPrompt) {
				return new Response('Internal Error', { status: 500 });
			}
			return new Response(JSON.stringify({
				choices: [{
					message: {
						content: JSON.stringify({
							events: [{ label: 'Event 1', start: '2026-08-11T09:00:00', type: 'point', confidence: 0.95 }],
							confidence: 0.95,
						}),
					},
				}],
			}), { status: 200, headers: { 'Content-Type': 'application/json' } });
		});

		const inputs = ['Meeting tomorrow at 9am', 'Another event'];
		const results = await extractAI(inputs, {
			softErrors: true,
			anchor: new Tempo('2026-08-10T00:00:00Z'),
			timeZone: 'UTC',
		});

		expect(Array.isArray(results)).toBe(true);
		expect(results).toHaveLength(2);

		const successResult = results[0] as TempoAiExtractResult;
		expect(successResult.events).toHaveLength(1);
		expect(successResult.events[0].label).toBe('Event 1');

		const errorResult = results[1] as TempoAiError;
		expect(errorResult).toBeInstanceOf(TempoAiError);
		expect(errorResult.status).toBe(500);
	});

	it('should return a secure() protected immutable object supporting .toJSON() clone', async () => {
		const fetchSpy = vi.spyOn(globalThis, 'fetch');
		fetchSpy.mockResolvedValueOnce(new Response(JSON.stringify({
			choices: [{
				message: {
					content: JSON.stringify({
						events: [{ label: 'Conference', start: '2026-08-15T09:00:00', type: 'point', confidence: 0.95 }],
						confidence: 0.95,
					}),
				},
			}],
		}), { status: 200, headers: { 'Content-Type': 'application/json' } }));

		const result = await extractAI('Conference on August 15 at 9am');
		expect(() => {
			(result as any).confidence = 0.5;
		}).toThrow(TypeError);

		const clone = (result as any).toJSON();
		expect(clone.confidence).toBe(0.95);
		clone.confidence = 0.5;
		expect(clone.confidence).toBe(0.5);
	});

	it('should log isDebug warnings for malformed cache items or provider events without changing control flow', async () => {
		const warnSpy = vi.spyOn(console, 'warn');
		const customAdapter: AiCacheAdapter = {
			get: vi.fn(async () => JSON.stringify({
				events: [{ label: 'Malformed', start: null }],
				confidence: 0.9,
			})),
			set: vi.fn(async () => { }),
		}

		const result = await extractAI('Dentist appointment tomorrow', {
			debug: true,
			cacheAdapter: customAdapter,
		});
		expect(result.events).toHaveLength(0);
		expect(warnSpy).toHaveBeenCalledWith(
			expect.stringContaining('[tempo-plugin-ai:extract] Failed to rehydrate cached event:'),
			expect.anything(),
		);

		const fetchSpy = vi.spyOn(globalThis, 'fetch');
		fetchSpy.mockResolvedValueOnce(new Response(JSON.stringify({
			choices: [{
				message: {
					content: JSON.stringify({
						events: [{ label: 'Malformed Provider Event', start: null }],
						confidence: 0.95,
					}),
				},
			}],
		}), { status: 200, headers: { 'Content-Type': 'application/json' } }));

		const providerResult = await extractAI('Sync meeting', {
			debug: true,
			force: true,
		});
		expect(providerResult.events).toHaveLength(0);
		expect(warnSpy).toHaveBeenCalledWith(
			expect.stringContaining("[tempo-plugin-ai:extract] Failed to parse event from provider 'groq':"),
			expect.anything(),
		);
	});
});
