import { Tempo, Interval } from '@magmacomputing/tempo';
import { ParseModule } from '@magmacomputing/tempo/parse';
import { scheduleAI, initAI } from '../src/index.js';

Tempo.extend(ParseModule);

describe('AI Schedule Plugin (scheduleAI)', () => {
	beforeEach(async () => {
		vi.spyOn(console, 'warn').mockImplementation(() => { });
		vi.spyOn(console, 'log').mockImplementation(() => { });
		await initAI({ remoteConfigUrl: false, providers: [{ id: 'groq', key: 'mock-key-for-unit-testing' }] });
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
		expect(slot.alternatives![0].start?.format('{yyyy}-{mm}-{dd} {hh}:{mi}')).toBe('2026-08-11 15:15');

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
		expect(slot.ai?.originalSlot?.start?.format('{yyyy}-{mm}-{dd} {hh}:{mi}')).toBe('2026-08-11 14:00');
		expect(slot.reasoning).toContain('[Adjusted for conflict]');
	});

	it('should iteratively bump through multiple consecutive busy events', async () => {
		const fetchSpy = vi.spyOn(globalThis, 'fetch');
		fetchSpy.mockResolvedValueOnce(new Response(JSON.stringify({
			choices: [{
				message: {
					content: JSON.stringify({
						start: '2026-08-11T14:00:00-07:00',
						end: '2026-08-11T14:45:00-07:00',
						summary: 'Initial slot candidate',
						confidence: 0.90,
					}),
				},
			}],
		}), { status: 200, headers: { 'Content-Type': 'application/json' } }));

		const busy1 = new Interval(
			new Tempo('2026-08-11 13:30:00', { timeZone: 'America/Los_Angeles' }),
			new Tempo('2026-08-11 14:30:00', { timeZone: 'America/Los_Angeles' })
		);
		const busy2 = new Interval(
			new Tempo('2026-08-11 14:30:00', { timeZone: 'America/Los_Angeles' }),
			new Tempo('2026-08-11 15:00:00', { timeZone: 'America/Los_Angeles' })
		);

		const slot = await scheduleAI('Find 45 minutes next Tuesday afternoon', {
			intervals: [busy1, busy2],
			timeZone: 'America/Los_Angeles',
		});

		expect(slot).toBeInstanceOf(Interval);
		// Should have bumped past busy1 (to 14:30) and then past busy2 (to 15:00)
		expect(slot.start.format('{yyyy}-{mm}-{dd} {hh}:{mi}')).toBe('2026-08-11 15:00');
		expect(slot.end.format('{yyyy}-{mm}-{dd} {hh}:{mi}')).toBe('2026-08-11 15:45');
		expect(slot.ai?.conflictBumped).toBe(true);
		expect(slot.ai?.originalSlot?.start?.format('{yyyy}-{mm}-{dd} {hh}:{mi}')).toBe('2026-08-11 14:00');
	});

	it('should wrap slot to next active working day when conflict bump pushes slot past working hours end', async () => {
		const fetchSpy = vi.spyOn(globalThis, 'fetch');
		// Slot proposed at 16:15 - 17:00 on Friday (2026-08-14)
		fetchSpy.mockResolvedValueOnce(new Response(JSON.stringify({
			choices: [{
				message: {
					content: JSON.stringify({
						start: '2026-08-14T16:15:00-07:00',
						end: '2026-08-14T17:00:00-07:00',
						summary: 'Late Friday slot',
						confidence: 0.90,
					}),
				},
			}],
		}), { status: 200, headers: { 'Content-Type': 'application/json' } }));

		// Busy event from 16:00 to 16:45 on Friday
		const busyFriday = new Interval(
			new Tempo('2026-08-14 16:00:00', { timeZone: 'America/Los_Angeles' }),
			new Tempo('2026-08-14 16:45:00', { timeZone: 'America/Los_Angeles' })
		);

		const slot = await scheduleAI('Find 45 minutes Friday afternoon', {
			intervals: [busyFriday],
			timeZone: 'America/Los_Angeles',
			workingHours: {
				start: '09:00',
				end: '17:00',
				days: [1, 2, 3, 4, 5],
			},
		});

		expect(slot).toBeInstanceOf(Interval);
		// Bump past 16:45 pushes 45m slot to 17:30 (exceeding 17:00), wrapping to Monday Aug 17 09:00
		expect(slot.start.format('{yyyy}-{mm}-{dd} {hh}:{mi}')).toBe('2026-08-17 09:00');
		expect(slot.end.format('{yyyy}-{mm}-{dd} {hh}:{mi}')).toBe('2026-08-17 09:45');
		expect(slot.ai?.conflictBumped).toBe(true);
		expect(slot.ai?.originalSlot?.start?.format('{yyyy}-{mm}-{dd} {hh}:{mi}')).toBe('2026-08-14 16:15');
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
			timeZone: 'UTC',
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
			timeZone: 'UTC',
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

	it('should format ISO weekday numbers (including Sunday=7) and string tokens correctly in workingHours prompt', async () => {
		const fetchSpy = vi.spyOn(globalThis, 'fetch');
		fetchSpy.mockResolvedValueOnce(new Response(JSON.stringify({
			choices: [{
				message: {
					content: JSON.stringify({
						start: '2026-08-09T10:00:00Z',
						end: '2026-08-09T11:00:00Z',
						confidence: 0.95,
					}),
				},
			}],
		}), { status: 200, headers: { 'Content-Type': 'application/json' } }));

		await scheduleAI('Schedule Sunday weekend session', {
			workingHours: {
				days: [7, 'SA', 'MON'],
				start: '10:00',
				end: '16:00',
			},
		});

		expect(fetchSpy).toHaveBeenCalledTimes(1);
		const requestBody = JSON.parse(fetchSpy.mock.calls[0][1]?.body as string);
		const systemPrompt = requestBody.messages[0].content;
		expect(systemPrompt).toContain('Working Hours: 10:00 to 16:00 (Sunday, Saturday, Monday)');
	});

	it('should throw TempoAiError if prompt is empty or providers missing', async () => {
		await expect(scheduleAI('')).rejects.toThrow(/invalid scheduling prompt/i);

		await initAI({ remoteConfigUrl: false, providers: [] });
		await expect(scheduleAI('Schedule meeting')).rejects.toThrow(/no AI providers configured/i);
	});

	it('should preserve Interval prototype behavior, own-property metadata, and toString conversion', async () => {
		const fetchSpy = vi.spyOn(globalThis, 'fetch');
		fetchSpy.mockResolvedValueOnce(new Response(JSON.stringify({
			choices: [{
				message: {
					content: JSON.stringify({
						start: '2026-08-11T14:00:00Z',
						end: '2026-08-11T15:00:00Z',
						summary: '1-hour review session',
						confidence: 0.95,
					}),
				},
			}],
		}), { status: 200, headers: { 'Content-Type': 'application/json' } }));

		const slot = await scheduleAI('Schedule 1 hour review session', {
			timeZone: 'UTC',
		});

		expect(slot).toBeInstanceOf(Interval);
		expect(slot.constructor).toBe(Interval);
		expect(slot.constructor === Interval).toBe(true);
		const containsRef = slot.contains;
		const toStringRef = slot.toString;
		expect(slot.contains).toBe(containsRef);
		expect(slot.toString).toBe(toStringRef);
		expect(Object.prototype.toString.call(slot)).toBe('[object Interval]');
		expect(typeof slot.toString).toBe('function');
		expect(typeof slot.valueOf).toBe('function');

		// Metadata keys exist as own properties / proxy traps
		expect('durationMinutes' in slot).toBe(true);
		expect('summary' in slot).toBe(true);
		expect('confidence' in slot).toBe(true);
		expect(slot.summary).toBe('1-hour review session');

		// Interval prototype methods operate normally
		const testPoint = new Tempo('2026-08-11T14:30:00Z');
		expect(slot.contains(testPoint)).toBe(true);
	});

	it('should throw TempoAiError with status 400 for invalid mode in scheduleAI', async () => {
		await initAI({ remoteConfigUrl: false, providers: [{ id: 'openai', key: 'test-key' }] });
		await expect(scheduleAI('Schedule meeting', { mode: 'invalid-mode' as any }))
			.rejects.toThrow(/Invalid execution mode: 'invalid-mode'/);
	});

	it('should resolve options.timeZone and apply to anchorTempo in buildContextPrompt', async () => {
		const fetchSpy = vi.spyOn(globalThis, 'fetch');
		fetchSpy.mockResolvedValueOnce(new Response(JSON.stringify({
			choices: [{
				message: {
					content: JSON.stringify({
						start: '2026-08-11T14:00:00-04:00',
						end: '2026-08-11T15:00:00-04:00',
						summary: '1-hour meeting in NY',
						confidence: 0.95,
					}),
				},
			}],
		}), { status: 200, headers: { 'Content-Type': 'application/json' } }));

		await scheduleAI('Schedule 1 hour meeting', {
			anchor: '2026-08-11T10:00:00',
			timeZone: 'America/New_York',
		});

		expect(fetchSpy).toHaveBeenCalledTimes(1);
		const requestBody = JSON.parse(fetchSpy.mock.calls[0][1]?.body as string);
		const systemPrompt = requestBody.messages[0].content;
		expect(systemPrompt).toContain('Reference Anchor Time: 2026-08-11T10:00:00 (America/New_York)');
		expect(systemPrompt).toContain('Target TimeZone: America/New_York');
	});

	it('should sanitize invalid workingHours.days and fallback to weekdays without infinite loop', async () => {
		const fetchSpy = vi.spyOn(globalThis, 'fetch');
		fetchSpy.mockResolvedValueOnce(new Response(JSON.stringify({
			choices: [{
				message: {
					content: JSON.stringify({
						start: '2026-08-15T10:00:00Z', // Saturday
						end: '2026-08-15T11:00:00Z',
						summary: 'Saturday slot needing weekday bump',
						confidence: 0.95,
					}),
				},
			}],
		}), { status: 200, headers: { 'Content-Type': 'application/json' } }));

		const slot = await scheduleAI('Schedule 1 hour slot', {
			anchor: '2026-08-14T09:00:00Z',
			timeZone: 'UTC',
			workingHours: {
				days: [0, 8, -3, 'invalid-day' as any, 99],
				start: '09:00',
				end: '17:00'
			},
			events: [
				{ start: '2026-08-15T09:00:00Z', end: '2026-08-15T12:00:00Z' }
			]
		});

		expect(slot).toBeDefined();
		// Saturday bumped past weekend to Monday Aug 17th
		expect(slot.start.format('{yyyy}-{mm}-{dd}')).toBe('2026-08-17');
		expect(slot.start.format('{hh}:{mi}')).toBe('09:00');
	});

	it('should discard partial numeric day strings like "1junk" and "1.5" while keeping valid strings', async () => {
		const fetchSpy = vi.spyOn(globalThis, 'fetch');
		fetchSpy.mockResolvedValueOnce(new Response(JSON.stringify({
			choices: [{
				message: {
					content: JSON.stringify({
						start: '2026-08-15T10:00:00Z', // Saturday
						end: '2026-08-15T11:00:00Z',
						confidence: 0.95
					})
				}
			}]
		}), { status: 200, headers: { 'Content-Type': 'application/json' } }));

		const slot = await scheduleAI('Schedule 1 hour slot', {
			anchor: '2026-08-14T09:00:00Z',
			timeZone: 'UTC',
			workingHours: {
				days: ['1junk' as any, '1.5' as any, '2', 'TU', '4'],
				start: '09:00',
				end: '17:00'
			}
		});

		expect(slot).toBeDefined();
		// Active days are Tuesday (2) and Thursday (4). Next active day from Saturday Aug 15 is Tuesday Aug 18.
		expect(slot.start.format('{yyyy}-{mm}-{dd}')).toBe('2026-08-18');
		expect(slot.start.format('{hh}:{mi}')).toBe('09:00');
	});

	it('should adjust slots outside working hours even when no busy events exist', async () => {
		const fetchSpy = vi.spyOn(globalThis, 'fetch');
		fetchSpy.mockResolvedValueOnce(new Response(JSON.stringify({
			choices: [{
				message: {
					content: JSON.stringify({
						start: '2026-08-11T07:00:00Z', // Early Tuesday (before 09:00)
						end: '2026-08-11T08:00:00Z',
						confidence: 0.95
					})
				}
			}]
		}), { status: 200, headers: { 'Content-Type': 'application/json' } }));

		const slot = await scheduleAI('Schedule 1 hour slot', {
			anchor: '2026-08-10T09:00:00Z',
			timeZone: 'UTC',
			workingHours: {
				start: '09:00',
				end: '17:00'
			}
		});

		expect(slot.start.format('{hh}:{mi}')).toBe('09:00');
		expect(slot.end.format('{hh}:{mi}')).toBe('10:00');
		expect(slot.ai?.conflictBumped).toBe(true);
	});
});


