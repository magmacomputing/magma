import { Tempo, Interval } from '@magmacomputing/tempo';
import { ParseModule } from '@magmacomputing/tempo/parse';
import { scheduleAI, initAI, TempoAiError } from '../src/index.js';

Tempo.extend(ParseModule);

describe('AI Schedule Plugin (scheduleAI)', () => {
	beforeEach(() => {
		vi.spyOn(console, 'warn').mockImplementation(() => { });
		// vi.spyOn(console, 'error').mockImplementation(() => { });
		vi.spyOn(console, 'log').mockImplementation(() => { });
		initAI({ providers: [{ id: 'groq', key: 'mock-key-for-unit-testing' }] });
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('should resolve natural language scheduling prompt into an Interval instance with AI metadata', async () => {
		const fetchSpy = vi.spyOn(globalThis, 'fetch');
		fetchSpy.mockResolvedValueOnce(new Response(JSON.stringify({
			choices: [{
				message: {
					content: JSON.stringify({
						start: '2026-08-11T14:15:00-07:00',
						end: '2026-08-11T15:00:00-07:00',
						durationMinutes: 45,
						summary: '45-minute meeting on Tuesday afternoon',
						reasoning: 'Selected Tuesday Aug 11 14:15-15:00 PST outside lunch.',
						confidence: 0.95,
						alternatives: [
							{ start: '2026-08-11T15:15:00-07:00', end: '2026-08-11T16:00:00-07:00' }
						]
					})
				}
			}]
		}), { status: 200, headers: { 'Content-Type': 'application/json' } }));

		const prompt = 'Find 45 minutes next Tuesday afternoon after 2pm PST excluding lunch';
		const anchor = new Tempo('2026-08-07T10:00:00-07:00');

		const slot = await scheduleAI(prompt, {
			anchor,
			timeZone: 'America/Los_Angeles',
			workingHours: { start: '09:00', end: '17:00' }
		});

		expect(slot).toBeInstanceOf(Interval);
		expect(slot.start).toBeInstanceOf(Tempo);
		expect(slot.end).toBeInstanceOf(Tempo);

		expect(slot.start.format('{yyyy}-{mm}-{dd} {hh}:{mi}')).toBe('2026-08-11 14:15');
		expect(slot.end.format('{yyyy}-{mm}-{dd} {hh}:{mi}')).toBe('2026-08-11 15:00');
		expect(slot.durationMinutes).toBe(45);
		expect(slot.confidence).toBe(0.95);
		expect(slot.provider).toBe('groq');
		expect(slot.reasoning).toContain('Selected Tuesday Aug 11');

		expect(slot.alternatives).toHaveLength(1);
		expect(slot.alternatives![0]).toBeInstanceOf(Interval);
		expect(slot.alternatives![0].start.format('{yyyy}-{mm}-{dd} {hh}:{mi}')).toBe('2026-08-11 15:15');

		// Assert system prompt includes reference anchor and working hours
		expect(fetchSpy).toHaveBeenCalledTimes(1);
		const requestBody = JSON.parse(fetchSpy.mock.calls[0][1]?.body as string);
		const systemPrompt = requestBody.messages[0].content;
		expect(systemPrompt).toContain('You are a high-precision calendar scheduling engine.');
		expect(systemPrompt).toContain('Working Hours: 09:00 to 17:00');
	});

	it('should accept busy events as core Interval instances and deterministically bump slot on conflict', async () => {
		const fetchSpy = vi.spyOn(globalThis, 'fetch');
		// LLM hallucination: proposes a slot 14:00 - 14:45 that conflicts with busy1 (13:30 - 14:30)
		fetchSpy.mockResolvedValueOnce(new Response(JSON.stringify({
			choices: [{
				message: {
					content: JSON.stringify({
						start: '2026-08-11T14:00:00-07:00',
						end: '2026-08-11T14:45:00-07:00',
						summary: 'Conflicting proposed slot',
						confidence: 0.90
					})
				}
			}]
		}), { status: 200, headers: { 'Content-Type': 'application/json' } }));

		const busy1 = new Interval(
			new Tempo('2026-08-11 13:30:00', { timeZone: 'America/Los_Angeles' }),
			new Tempo('2026-08-11 14:30:00', { timeZone: 'America/Los_Angeles' })
		);

		const slot = await scheduleAI('Find 45 minutes next Tuesday afternoon', {
			intervals: [busy1],
			timeZone: 'America/Los_Angeles'
		});

		expect(slot).toBeInstanceOf(Interval);
		// Deterministic check should have bumped start from 14:00 to 14:30 (end of busy1)
		expect(slot.start.format('{yyyy}-{mm}-{dd} {hh}:{mi}')).toBe('2026-08-11 14:30');
		expect(slot.end.format('{yyyy}-{mm}-{dd} {hh}:{mi}')).toBe('2026-08-11 15:15');
		expect(slot.ai?.conflictBumped).toBe(true);
		expect(slot.ai?.originalSlot?.start.format('{yyyy}-{mm}-{dd} {hh}:{mi}')).toBe('2026-08-11 14:00');
		expect(slot.reasoning).toContain('[Adjusted for conflict]');
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
								start: '2026-08-11T09:00:00Z',
								end: '2026-08-11T10:00:00Z',
								confidence: 0.95
							})
						}
					}]
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

		const resRace = await scheduleAI('Schedule 1 hour slot', {
			mode: 'race',
			providers: [
				{ id: 'slow-provider', key: 'key-1', url: 'https://api.openai.com/v1/chat/completions', model: 'slow-model' },
				{ id: 'fast-provider', key: 'key-2', url: 'https://api.groq.com/v1/chat/completions', model: 'fast-model' }
			]
		});

		expect(resRace.provider).toBe('fast-provider');
		expect(resRace.start.format('{yyyy}-{mm}-{dd} {hh}:{mi}')).toBe('2026-08-11 09:00');
		expect(slowWasAborted).toBe(true);
	});

	it('should support provider consensus execution mode', async () => {
		const fetchSpy = vi.spyOn(globalThis, 'fetch');
		fetchSpy
			.mockResolvedValueOnce(new Response(JSON.stringify({
				choices: [{
					message: {
						content: JSON.stringify({
							start: '2026-08-11T10:00:00Z',
							end: '2026-08-11T10:30:00Z',
							confidence: 0.82
						})
					}
				}]
			}), { status: 200, headers: { 'Content-Type': 'application/json' } }))
			.mockResolvedValueOnce(new Response(JSON.stringify({
				choices: [{
					message: {
						content: JSON.stringify({
							start: '2026-08-11T11:00:00Z',
							end: '2026-08-11T11:30:00Z',
							confidence: 0.96
						})
					}
				}]
			}), { status: 200, headers: { 'Content-Type': 'application/json' } }));

		const resConsensus = await scheduleAI('Schedule 30 minute slot', {
			mode: 'consensus',
			providers: [
				{ id: 'p1', key: 'key-1', url: 'https://api.groq.com/v1/chat/completions', model: 'm1' },
				{ id: 'p2', key: 'key-2', url: 'https://api.openai.com/v1/chat/completions', model: 'm2' }
			]
		});

		expect(resConsensus.confidence).toBe(0.96);
		expect(resConsensus.provider).toBe('p2');
		expect(resConsensus.start.format('{yyyy}-{mm}-{dd} {hh}:{mi}')).toBe('2026-08-11 11:00');
	});

	it('should throw TempoAiError when confidence is below minConfidence threshold', async () => {
		const fetchSpy = vi.spyOn(globalThis, 'fetch');
		fetchSpy.mockResolvedValueOnce(new Response(JSON.stringify({
			choices: [{
				message: {
					content: JSON.stringify({
						start: '2026-08-11T10:00:00Z',
						end: '2026-08-11T10:30:00Z',
						confidence: 0.50
					})
				}
			}]
		}), { status: 200, headers: { 'Content-Type': 'application/json' } }));

		await expect(scheduleAI('Low confidence prompt', { minConfidence: 0.8 }))
			.rejects.toThrow(/scheduleAI confidence \(0.5\) is below the required threshold of 0.8/i);
	});

	it('should throw TempoAiError if prompt is empty or providers missing', async () => {
		await expect(scheduleAI('')).rejects.toThrow(/invalid scheduling prompt/i);

		initAI({ providers: [] });
		await expect(scheduleAI('Schedule meeting')).rejects.toThrow(/no AI providers configured/i);
	});
});
