import { Tempo } from '@magmacomputing/tempo';
import { isRRuleString } from '@magmacomputing/tempo/library';
import { recurrenceAI, initAI } from '../src/index.js';

describe('AI Recurrence Plugin (recurrenceAI)', () => {
	beforeEach(async () => {
		vi.spyOn(console, 'warn').mockImplementation(() => { });
		vi.spyOn(console, 'error').mockImplementation(() => { });
		vi.spyOn(console, 'log').mockImplementation(() => { });
		await initAI({ remoteConfigUrl: false, providers: [{ id: 'groq', key: 'mock-key-for-unit-testing' }] });
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('should detect raw RRULE strings and parse them natively without network calls', async () => {
		const rruleInput = 'FREQ=WEEKLY;BYDAY=TU;BYHOUR=15';
		expect(isRRuleString(rruleInput)).toBe(true);

		const result = await recurrenceAI(rruleInput, { count: 3 });
		expect(result).toBeDefined();
		expect(result.rrule).toBe('FREQ=WEEKLY;BYDAY=TU;BYHOUR=15');
		expect(result.provider).toBe('rrule-parser');
		expect(result.confidence).toBe(1.0);
		expect(result.isFinite).toBe(false);
		expect(result.size).toBe(Number.POSITIVE_INFINITY);
		expect(result.summary).toBe('Recurring schedule (FREQ=WEEKLY;BYDAY=TU;BYHOUR=15)');

		const batch1 = result.take(3);
		expect(batch1).toHaveLength(3);
		expect(batch1[0]).toBeInstanceOf(Tempo);
	});

	it('should support stateful paged batching via .take(n)', async () => {
		const anchor = new Tempo('2026-08-01T09:00:00Z');
		const result = await recurrenceAI('FREQ=WEEKLY;BYDAY=FR', { anchor });

		const batch1 = result.take(2);
		expect(batch1).toHaveLength(2);
		expect(batch1[0].format('{yyyy}-{mm}-{dd}')).toBe('2026-08-07');
		expect(batch1[1].format('{yyyy}-{mm}-{dd}')).toBe('2026-08-14');

		const batch2 = result.take(2);
		expect(batch2).toHaveLength(2);
		expect(batch2[0].format('{yyyy}-{mm}-{dd}')).toBe('2026-08-21');
		expect(batch2[1].format('{yyyy}-{mm}-{dd}')).toBe('2026-08-28');
	});

	it('should parse COUNT in finite RRULE strings, compute size, and return [] when exhausted', async () => {
		const finiteRRule = 'FREQ=MONTHLY;BYDAY=1MO;COUNT=2';
		const result = await recurrenceAI(finiteRRule);

		expect(result.isFinite).toBe(true);
		expect(result.size).toBe(2);

		const batch1 = result.take(2);
		expect(batch1).toHaveLength(2);

		const exhaustedBatch = result.take(2);
		expect(exhaustedBatch).toHaveLength(0);
		expect(exhaustedBatch).toEqual([]);
	});

	it('should compile natural language prompts into RRULE strings, localized summary, and take() batches', async () => {
		const fetchSpy = vi.spyOn(globalThis, 'fetch');
		fetchSpy.mockResolvedValueOnce(new Response(JSON.stringify({
			choices: [{
				message: {
					content: JSON.stringify({
						rrule: 'FREQ=MONTHLY;BYDAY=2TU;BYHOUR=15',
						summary: 'Chaque 2ème mardi du mois à 15:00',
						reasoning: 'Parsed 2nd Tuesday schedule in French locale.',
						confidence: 0.95
					})
				}
			}]
		}), { status: 200, headers: { 'Content-Type': 'application/json' } }));

		const prompt = 'Chaque 2ème mardi du mois à 15h';
		expect(isRRuleString(prompt)).toBe(false);

		const result = await recurrenceAI(prompt, { locale: 'fr-FR', count: 5 });
		expect(result.rrule).toBe('FREQ=MONTHLY;BYDAY=2TU;BYHOUR=15');
		expect(result.summary).toBe('Chaque 2ème mardi du mois à 15:00');
		expect(result.confidence).toBe(0.95);

		const batch = result.take(5);
		expect(batch).toHaveLength(5);
		expect(batch[0]).toBeInstanceOf(Tempo);

		// Assert request body receives ONLY recurrence schema without date-parser iso schema
		expect(fetchSpy).toHaveBeenCalledTimes(1);
		const requestBody = JSON.parse(fetchSpy.mock.calls[0][1]?.body as string);
		const systemPrompt = requestBody.messages[0].content;
		expect(systemPrompt).toContain('You are a calendar recurrence compiler.');
		expect(systemPrompt).toContain('"rrule": "Standard RFC 5545 RRULE string');
		expect(systemPrompt).not.toContain('You are a high-performance date parser.');
		expect(systemPrompt).not.toContain('"iso":');

		// Verify iterator yields 5 items
		const iterated = Array.from(result);
		expect(iterated).toHaveLength(5);
	});

	it('should support provider race execution mode returning fastest provider and aborting slower requests', async () => {
		let slowWasAborted = false;
		const fetchSpy = vi.spyOn(globalThis, 'fetch');
		fetchSpy.mockImplementation(async (_url, init) => {
			const body = JSON.parse(init?.body as string);
			const signal = init?.signal as AbortSignal | undefined;
			if (body.model === 'fast-model') {
				return new Response(JSON.stringify({
					choices: [{
						message: {
							content: JSON.stringify({ rrule: 'FREQ=DAILY', summary: 'Fast Daily', confidence: 0.95 })
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

		const resRace = await recurrenceAI('Every day', {
			mode: 'race',
			providers: [
				{ id: 'slow-provider', key: 'key-1', url: 'https://api.openai.com/v1/chat/completions', model: 'slow-model' },
				{ id: 'fast-provider', key: 'key-2', url: 'https://api.groq.com/v1/chat/completions', model: 'fast-model' }
			]
		});

		expect(resRace.rrule).toBe('FREQ=DAILY');
		expect(resRace.provider).toBe('fast-provider');
		expect(slowWasAborted).toBe(true);
	});

	it('should support consensus mode selecting highest confidence result when providers disagree', async () => {
		const fetchSpy = vi.spyOn(globalThis, 'fetch');
		fetchSpy
			.mockResolvedValueOnce(new Response(JSON.stringify({
				choices: [{
					message: {
						content: JSON.stringify({ rrule: 'FREQ=WEEKLY;BYDAY=FR', summary: 'Every Friday', confidence: 0.85 })
					}
				}]
			}), { status: 200, headers: { 'Content-Type': 'application/json' } }))
			.mockResolvedValueOnce(new Response(JSON.stringify({
				choices: [{
					message: {
						content: JSON.stringify({ rrule: 'FREQ=MONTHLY;BYDAY=-1FR', summary: 'Last Friday of month', confidence: 0.96 })
					}
				}]
			}), { status: 200, headers: { 'Content-Type': 'application/json' } }));

		const resConsensus = await recurrenceAI('Last Friday of the month', {
			mode: 'consensus',
			providers: [
				{ id: 'p1', key: 'key-1', url: 'https://api.groq.com/v1/chat/completions', model: 'm1' },
				{ id: 'p2', key: 'key-2', url: 'https://api.openai.com/v1/chat/completions', model: 'm2' }
			]
		});

		expect(resConsensus.rrule).toBe('FREQ=MONTHLY;BYDAY=-1FR');
		expect(resConsensus.confidence).toBe(0.96);
		expect(resConsensus.provider).toBe('p2');
	});

	it('should throw TempoAiError for invalid execution mode', async () => {
		await expect(recurrenceAI('Every Friday', { mode: 'invalid_mode' as any }))
			.rejects.toThrow(/invalid execution mode/i);
	});

	it('should throw TempoAiError if provider returns empty or missing rrule string', async () => {
		const fetchSpy = vi.spyOn(globalThis, 'fetch');
		fetchSpy.mockResolvedValueOnce(new Response(JSON.stringify({
			choices: [{ message: { content: JSON.stringify({ summary: 'No rrule', confidence: 0.9 }) } }]
		}), { status: 200, headers: { 'Content-Type': 'application/json' } }));

		await expect(recurrenceAI('Unparseable prompt'))
			.rejects.toThrow(/missing or empty rrule string/i);
	});

	it('should honor minConfidence threshold and throw TempoAiError if confidence is low', async () => {
		const fetchSpy = vi.spyOn(globalThis, 'fetch');
		fetchSpy.mockResolvedValueOnce(new Response(JSON.stringify({
			choices: [{
				message: {
					content: JSON.stringify({
						rrule: 'FREQ=DAILY',
						summary: 'Uncertain daily',
						confidence: 0.4
					})
				}
			}]
		}), { status: 200, headers: { 'Content-Type': 'application/json' } }));

		await expect(recurrenceAI('Uncertain repeat prompt', { minConfidence: 0.8 }))
			.rejects.toThrow(/confidence \(0.4\) is below the required threshold of 0.8/i);
	});

	it('should evaluate RFC 5545 RRULE occurrences applying after and before windows', async () => {
		const rruleStr = 'FREQ=DAILY;COUNT=10';
		const anchor = new Tempo('2026-08-01T09:00:00');
		const result = await recurrenceAI(rruleStr, {
			anchor,
			after: '2026-08-03T00:00:00',
			before: '2026-08-06T00:00:00'
		});

		expect(result.isFinite).toBe(true);
		const items = result.take(10);
		expect(items).toHaveLength(3);
		expect(items[0].format('{yyyy}-{mm}-{dd} {hh}:{mi}:{ss}')).toBe('2026-08-03 09:00:00');
		expect(items[1].format('{yyyy}-{mm}-{dd} {hh}:{mi}:{ss}')).toBe('2026-08-04 09:00:00');
		expect(items[2].format('{yyyy}-{mm}-{dd} {hh}:{mi}:{ss}')).toBe('2026-08-05 09:00:00');
	});

	it('should correctly evaluate negative BYDAY ordinals such as -1FR and date-only UNTIL', async () => {
		const rruleStr = 'FREQ=MONTHLY;BYDAY=-1FR;UNTIL=20261231';
		const anchor = new Tempo('2026-08-01T09:00:00Z');
		const result = await recurrenceAI(rruleStr, { anchor });

		expect(result.isFinite).toBe(true);
		expect(result.size).toBe(5);
		const items = result.take(5);
		expect(items).toHaveLength(5);
		// August 2026 last Friday is Aug 28th
		expect(items[0].format('{yyyy}-{mm}-{dd}')).toBe('2026-08-28');
		// September 2026 last Friday is Sep 25th
		expect(items[1].format('{yyyy}-{mm}-{dd}')).toBe('2026-09-25');
		// October 2026 last Friday is Oct 30th
		expect(items[2].format('{yyyy}-{mm}-{dd}')).toBe('2026-10-30');
		// November 2026 last Friday is Nov 27th
		expect(items[3].format('{yyyy}-{mm}-{dd}')).toBe('2026-11-27');
		// December 2026 last Friday is Dec 25th
		expect(items[4].format('{yyyy}-{mm}-{dd}')).toBe('2026-12-25');
	});

	it('should propagate resolved context options (tz, cal, loc, sph) to generated Tempo instances and expandOccurrences', async () => {
		const rruleStr = 'FREQ=DAILY;COUNT=3';
		const result = await recurrenceAI(rruleStr, {
			anchor: '2026-08-01T09:00:00',
			timeZone: 'Australia/Sydney',
			calendar: 'iso8601',
			locale: 'en-AU',
			sphere: 'south',
		});

		const items = result.take(3);
		expect(items).toHaveLength(3);
		expect(items[0].config.timeZone).toBe('Australia/Sydney');
		expect(items[0].config.calendar).toBe('iso8601');
		expect(items[0].config.locale).toBe('en-AU');
		expect(items[0].config.sphere).toBe('south');
	});
});
