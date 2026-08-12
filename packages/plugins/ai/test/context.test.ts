import { Tempo } from '@magmacomputing/tempo';
import { contextAI, initAI } from '../src/index.js';

describe('AI Context Plugin (contextAI)', () => {
	beforeEach(async () => {
		vi.spyOn(console, 'warn').mockImplementation(() => { });
		vi.spyOn(console, 'error').mockImplementation(() => { });
		vi.spyOn(console, 'log').mockImplementation(() => { });
		await initAI({ remoteConfigUrl: false, providers: [{ id: 'groq', key: 'mock-key-for-unit-testing' }] });
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('should infer timezone, locale, calendar, and hemisphere from descriptive text', async () => {
		const fetchSpy = vi.spyOn(globalThis, 'fetch');
		fetchSpy.mockResolvedValueOnce(new Response(JSON.stringify({
			choices: [{
				message: {
					content: JSON.stringify({
						timeZone: 'Asia/Tokyo',
						locale: 'ja-JP',
						calendar: 'gregory',
						sphere: 'north',
						reasoning: 'Kyoto is in Japan (JST timezone, ja-JP locale, northern hemisphere).',
						confidence: 0.98,
					}),
				},
			}],
		}), { status: 200, headers: { 'Content-Type': 'application/json' } }));

		const result = await contextAI('I am a freelancer working out of Kyoto, Japan.');
		expect(result).toBeDefined();
		expect(result.timeZone).toBe('Asia/Tokyo');
		expect(result.locale).toBe('ja-JP');
		expect(result.calendar).toBe('gregory');
		expect(result.sphere).toBe('north');
		expect(result.confidence).toBe(0.98);
		expect(result.provider).toBe('groq');

		expect(fetchSpy).toHaveBeenCalledTimes(1);
		const requestBody = JSON.parse(fetchSpy.mock.calls[0][1]?.body as string);
		const systemPrompt = requestBody.messages[0].content;
		expect(systemPrompt).toContain('You are a locale and timezone inference engine.');
		expect(systemPrompt).toContain('"sphere": "Hemisphere');
	});

	it('should omit sphere (set to undefined) if it is unknowable or null', async () => {
		const fetchSpy = vi.spyOn(globalThis, 'fetch');
		fetchSpy.mockResolvedValueOnce(new Response(JSON.stringify({
			choices: [{
				message: {
					content: JSON.stringify({
						timeZone: 'UTC',
						locale: 'en-US',
						calendar: 'gregory',
						sphere: null,
						reasoning: 'Cannot determine hemisphere.',
						confidence: 0.7,
					}),
				},
			}],
		}), { status: 200, headers: { 'Content-Type': 'application/json' } }));

		const result = await contextAI('Meeting online somewhere.');
		expect(result.sphere).toBeUndefined();
		expect(result.timeZone).toBe('UTC');
	});

	it('should check cache and skip network fetch on cache hits', async () => {
		const fetchSpy = vi.spyOn(globalThis, 'fetch');

		// Seed cache
		Tempo.cache.set('context::cached prompt', JSON.stringify({
			timeZone: 'Europe/London',
			locale: 'en-GB',
			calendar: 'gregory',
			sphere: 'north',
			reasoning: 'Pre-cached location',
		}));

		const result = await contextAI('cached prompt');
		expect(result.timeZone).toBe('Europe/London');
		expect(result.locale).toBe('en-GB');
		expect(result.sphere).toBe('north');
		expect(result.provider).toBe('cache');
		expect(fetchSpy).not.toHaveBeenCalled();
	});

	it('should throw TempoAiError if resolved confidence is below minConfidence', async () => {
		const fetchSpy = vi.spyOn(globalThis, 'fetch');
		fetchSpy.mockResolvedValueOnce(new Response(JSON.stringify({
			choices: [{
				message: {
					content: JSON.stringify({
						timeZone: 'Europe/Paris',
						locale: 'fr-FR',
						calendar: 'gregory',
						sphere: 'north',
						confidence: 0.5,
					}),
				},
			}],
		}), { status: 200, headers: { 'Content-Type': 'application/json' } }));

		await expect(contextAI('Ambiguous query', { minConfidence: 0.8 }))
			.rejects.toThrow(/inferred context confidence \(0.5\) is below the required threshold of 0.8/i);
	});

	it('should throw TempoAiError if provider returns an invalid IANA timezone name', async () => {
		const fetchSpy = vi.spyOn(globalThis, 'fetch');
		fetchSpy.mockResolvedValueOnce(new Response(JSON.stringify({
			choices: [{
				message: {
					content: JSON.stringify({
						timeZone: 'Fake/TimeZone_Name',
						locale: 'en-US',
						calendar: 'gregory',
						sphere: 'north',
						confidence: 0.9,
					}),
				},
			}],
		}), { status: 200, headers: { 'Content-Type': 'application/json' } }));

		await expect(contextAI('Query with invalid timezone response'))
			.rejects.toThrow(/invalid or unsupported IANA timeZone/i);
	});

	it('should support provider race execution mode', async () => {
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
								timeZone: 'Europe/London',
								locale: 'en-GB',
								calendar: 'gregory',
								sphere: 'north',
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

		const result = await contextAI('London office', {
			mode: 'race',
			providers: [
				{ id: 'slow-provider', key: 'key-1', url: 'https://api.openai.com/v1/chat/completions', model: 'slow-model' },
				{ id: 'fast-provider', key: 'key-2', url: 'https://api.groq.com/v1/chat/completions', model: 'fast-model' },
			],
		});

		expect(result.timeZone).toBe('Europe/London');
		expect(result.provider).toBe('fast-provider');
		expect(slowWasAborted).toBe(true);
	});

	it('should support consensus mode selecting matching values', async () => {
		const fetchSpy = vi.spyOn(globalThis, 'fetch');
		fetchSpy
			.mockResolvedValueOnce(new Response(JSON.stringify({
				choices: [{
					message: {
						content: JSON.stringify({
							timeZone: 'Australia/Sydney',
							locale: 'en-AU',
							calendar: 'gregory',
							sphere: 'south',
							confidence: 0.8,
						}),
					},
				}],
			}), { status: 200, headers: { 'Content-Type': 'application/json' } }))
			.mockResolvedValueOnce(new Response(JSON.stringify({
				choices: [{
					message: {
						content: JSON.stringify({
							timeZone: 'Australia/Sydney',
							locale: 'en-AU',
							calendar: 'gregory',
							sphere: 'south',
							confidence: 0.92,
						}),
					},
				}],
			}), { status: 200, headers: { 'Content-Type': 'application/json' } }));

		const result = await contextAI('Sydney Harbour', {
			mode: 'consensus',
			providers: [
				{ id: 'p1', key: 'key-1', url: 'https://api.groq.com/v1/chat/completions', model: 'm1' },
				{ id: 'p2', key: 'key-2', url: 'https://api.openai.com/v1/chat/completions', model: 'm2' },
			],
		});

		expect(result.timeZone).toBe('Australia/Sydney');
		expect(result.sphere).toBe('south');
		expect(result.confidence).toBe(1.0); // Consensus vote elevates confidence to 1.0
	});
});
