import { Tempo } from '@magmacomputing/tempo';
import { diffAI, initAI, TempoAiError, type TempoAiDiffResult } from '../src/index.js';

describe('AI Diff Plugin (diffAI)', () => {
	beforeEach(async () => {
		vi.spyOn(console, 'warn').mockImplementation(() => { });
		vi.spyOn(console, 'error').mockImplementation(() => { });
		vi.spyOn(console, 'log').mockImplementation(() => { });
		await initAI({ remoteConfigUrl: false, providers: [{ id: 'groq', key: 'mock-key-for-unit-testing' }] });
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('should calculate native grounding metrics and format natural narrative diff', async () => {
		const fetchSpy = vi.spyOn(globalThis, 'fetch');
		fetchSpy.mockResolvedValueOnce(new Response(JSON.stringify({
			choices: [{
				message: {
					content: JSON.stringify({
						formatted: '5 business days (approx. 224 hours)',
						days: 9.33,
						hours: 224,
						businessDays: 5,
						reasoning: 'Spans one full working week (5 business days) across 10 calendar days.',
						confidence: 0.96,
					}),
				},
			}],
		}), { status: 200, headers: { 'Content-Type': 'application/json' } }));

		const start = '2026-08-01T09:00:00Z'; // Saturday
		const end = '2026-08-10T17:00:00Z';   // Next Monday

		const result = await diffAI(start, end, 'explain in terms of business working days');
		expect(result).toBeDefined();
		expect(result.formatted).toBe('5 business days (approx. 224 hours)');
		expect(result.businessDays).toBe(5);
		expect(result.hours).toBe(224);
		expect(result.confidence).toBe(0.96);
		expect(result.provider).toBe('groq');

		expect(fetchSpy).toHaveBeenCalledTimes(1);
		const requestBody = JSON.parse(fetchSpy.mock.calls[0][1]?.body as string);
		const systemPrompt = requestBody.messages[0].content;
		expect(systemPrompt).toContain('You are an expert temporal difference');
		expect(systemPrompt).toContain('"businessDays": 5');
		expect(systemPrompt).toContain('Grounding Context:');
	});

	it('should exclude matching holidays from business day calculations', async () => {
		const fetchSpy = vi.spyOn(globalThis, 'fetch');
		fetchSpy.mockResolvedValueOnce(new Response(JSON.stringify({
			choices: [{
				message: {
					content: JSON.stringify({
						formatted: '3 business days (excluding Bank Holiday on Aug 4 & 5)',
						days: 9.33,
						hours: 224,
						businessDays: 3,
						reasoning: 'Excluded 2 weekend days and 2 public holidays.',
						confidence: 0.98,
					}),
				},
			}],
		}), { status: 200, headers: { 'Content-Type': 'application/json' } }));

		const start = new Tempo('2026-08-01T09:00:00Z');
		const end = new Tempo('2026-08-10T17:00:00Z');

		const result = await diffAI(start, end, 'calculate working days minus regional holidays', {
			holidays: ['2026-08-04', '2026-08-05'],
			region: 'AU-NSW',
		});

		expect(result.businessDays).toBe(3);
		expect(result.holidays).toEqual(['2026-08-04', '2026-08-05']);

		const requestBody = JSON.parse(fetchSpy.mock.calls[0][1]?.body as string);
		const contextPrompt = requestBody.messages[0].content;
		expect(contextPrompt).toContain('Computed Business Working Days: 3');
		expect(contextPrompt).toContain('Matching Excluded Holidays: 2026-08-04, 2026-08-05');
		expect(contextPrompt).toContain('Region Context: AU-NSW');
	});

	it('should support reverse date intervals with negative business days', async () => {
		const fetchSpy = vi.spyOn(globalThis, 'fetch');
		fetchSpy.mockResolvedValueOnce(new Response(JSON.stringify({
			choices: [{
				message: {
					content: JSON.stringify({
						formatted: '5 business days ago',
						days: -9.33,
						hours: -224,
						businessDays: -5,
						reasoning: 'End date occurred 5 working days before start date.',
						confidence: 0.94,
					}),
				},
			}],
		}), { status: 200, headers: { 'Content-Type': 'application/json' } }));

		const start = '2026-08-10T17:00:00Z';
		const end = '2026-08-01T09:00:00Z';

		const result = await diffAI(start, end, 'relative past difference');
		expect(result.businessDays).toBe(-5);
		expect(result.formatted).toBe('5 business days ago');

		const requestBody = JSON.parse(fetchSpy.mock.calls[0][1]?.body as string);
		const contextPrompt = requestBody.messages[0].content;
		expect(contextPrompt).toContain('Direction: Past/Backward');
		expect(contextPrompt).toContain('Computed Business Working Days: -5');
	});

	it('should check cache and skip network fetch on cache hits', async () => {
		const fetchSpy = vi.spyOn(globalThis, 'fetch');
		fetchSpy.mockResolvedValueOnce(new Response(JSON.stringify({
			choices: [{
				message: {
					content: JSON.stringify({
						formatted: 'Pre-cached 5 business days',
						days: 9.33,
						hours: 224,
						businessDays: 5,
						reasoning: 'Calculated and formatted',
						confidence: 0.95,
					}),
				},
			}],
		}), { status: 200, headers: { 'Content-Type': 'application/json' } }));

		const start = new Tempo('2026-08-01T09:00:00Z');
		const end = new Tempo('2026-08-10T17:00:00Z');

		const result1 = await diffAI(start, end, 'cached prompt');
		expect(result1.provider).toBe('groq');
		expect(fetchSpy).toHaveBeenCalledTimes(1);

		const result2 = await diffAI(start, end, 'cached prompt');
		expect(result2.formatted).toBe('Pre-cached 5 business days');
		expect(result2.provider).toBe('cache');
		expect(result2.confidence).toBe(0.95);
		expect(fetchSpy).toHaveBeenCalledTimes(1);
	});

	it('should throw TempoAiError if confidence is below minConfidence', async () => {
		const fetchSpy = vi.spyOn(globalThis, 'fetch');
		fetchSpy.mockResolvedValueOnce(new Response(JSON.stringify({
			choices: [{
				message: {
					content: JSON.stringify({
						formatted: 'Uncertain difference',
						days: 5,
						hours: 120,
						businessDays: 3,
						confidence: 0.45,
					}),
				},
			}],
		}), { status: 200, headers: { 'Content-Type': 'application/json' } }));

		await expect(diffAI('2026-08-01', '2026-08-06', 'test', { minConfidence: 0.8 }))
			.rejects.toThrow(/diffAI confidence \(0.45\) is below the required threshold of 0.8/i);
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
								formatted: 'Fast winner formatted diff',
								days: 4,
								hours: 96,
								businessDays: 4,
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

		const result = await diffAI('2026-08-03', '2026-08-07', 'quick race diff', {
			mode: 'race',
			providers: [
				{ id: 'slow-provider', key: 'k1', url: 'https://api.openai.com/v1/chat/completions', model: 'slow-model' },
				{ id: 'fast-provider', key: 'k2', url: 'https://api.groq.com/v1/chat/completions', model: 'fast-model' },
			],
		});

		expect(result.formatted).toBe('Fast winner formatted diff');
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
							formatted: 'Pair 1 resolved',
							days: 2,
							hours: 48,
							businessDays: 2,
							confidence: 0.95,
						}),
					},
				}],
			}), { status: 200, headers: { 'Content-Type': 'application/json' } }))
			.mockResolvedValueOnce(new Response('Server Error', { status: 500 }));

		const pairs = [
			{ start: '2026-08-03', end: '2026-08-05', prompt: 'pair 1' },
			{ start: '2026-08-05', end: '2026-08-07', prompt: 'pair 2' },
		];

		const results = await diffAI(pairs, { softErrors: true });
		expect(results).toHaveLength(2);
		expect((results[0] as TempoAiDiffResult).formatted).toBe('Pair 1 resolved');
		expect(results[1]).toBeInstanceOf(TempoAiError);
	});

	it('should produce distinct cache keys for different region options', async () => {
		const fetchSpy = vi.spyOn(globalThis, 'fetch');
		fetchSpy
			.mockResolvedValueOnce(new Response(JSON.stringify({
				choices: [{
					message: {
						content: JSON.stringify({
							formatted: 'AU Region difference',
							reasoning: 'AU formatting',
							confidence: 0.95,
						}),
					},
				}],
			}), { status: 200, headers: { 'Content-Type': 'application/json' } }))
			.mockResolvedValueOnce(new Response(JSON.stringify({
				choices: [{
					message: {
						content: JSON.stringify({
							formatted: 'US Region difference',
							reasoning: 'US formatting',
							confidence: 0.95,
						}),
					},
				}],
			}), { status: 200, headers: { 'Content-Type': 'application/json' } }));

		const start = new Tempo('2026-08-03T09:00:00Z');
		const end = new Tempo('2026-08-07T17:00:00Z');

		const resultAU = await diffAI(start, end, 'summarize', { region: 'AU-NSW' });
		const resultUS = await diffAI(start, end, 'summarize', { region: 'US' });

		expect(resultAU.formatted).toBe('AU Region difference');
		expect(resultUS.formatted).toBe('US Region difference');
		expect(fetchSpy).toHaveBeenCalledTimes(2);
	});

	it('should normalize start and end Tempo instances to requested timezone', async () => {
		const fetchSpy = vi.spyOn(globalThis, 'fetch');
		fetchSpy.mockResolvedValueOnce(new Response(JSON.stringify({
			choices: [{
				message: {
					content: JSON.stringify({
						formatted: 'Timezone normalized difference',
						reasoning: 'Normalized',
						confidence: 0.95,
					}),
				},
			}],
		}), { status: 200, headers: { 'Content-Type': 'application/json' } }));

		const start = new Tempo('2026-08-01T09:00:00', { timeZone: 'America/New_York' });
		const end = new Tempo('2026-08-05T17:00:00', { timeZone: 'Asia/Tokyo' });

		const result = await diffAI(start, end, 'summarize', { timeZone: 'Europe/London' });
		expect(result.formatted).toBe('Timezone normalized difference');
		expect(fetchSpy).toHaveBeenCalledTimes(1);

		const requestBody = JSON.parse(fetchSpy.mock.calls[0][1]?.body as string);
		expect(requestBody.messages[0].content).toContain('(Europe/London)');
	});

	it('should return a secure() protected immutable object supporting .toJSON() clone', async () => {
		const fetchSpy = vi.spyOn(globalThis, 'fetch');
		fetchSpy.mockResolvedValueOnce(new Response(JSON.stringify({
			choices: [{
				message: {
					content: JSON.stringify({
						formatted: '3 business days difference',
						days: 3,
						hours: 72,
						businessDays: 3,
						confidence: 0.95,
					}),
				},
			}],
		}), { status: 200, headers: { 'Content-Type': 'application/json' } }));

		const result = await diffAI('2026-08-03', '2026-08-06', 'summarize');
		expect(() => {
			(result as any).formatted = 'hacked';
		}).toThrow(TypeError);

		const clone = (result as any).toJSON();
		expect(clone.formatted).toBe('3 business days difference');
		clone.formatted = 'modified';
		expect(clone.formatted).toBe('modified');
	});
});
