import { Tempo } from '@magmacomputing/tempo';
import { recurrenceAI, isRRuleString, initAI } from '../src/index.js';

describe('AI Recurrence Plugin (recurrenceAI)', () => {
	beforeEach(() => {
		vi.spyOn(console, 'warn').mockImplementation(() => { });
		vi.spyOn(console, 'error').mockImplementation(() => { });
		vi.spyOn(console, 'log').mockImplementation(() => { });
		initAI({ providers: [{ id: 'groq', key: 'mock-key-for-unit-testing' }] });
	});

	afterEach(() => {
		vi.clearAllMocks();
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
		const result = await recurrenceAI('FREQ=WEEKLY;BYDAY=FR');

		const batch1 = result.take(2);
		expect(batch1).toHaveLength(2);

		const batch2 = result.take(2);
		expect(batch2).toHaveLength(2);
		expect(batch2[0].format('{yyyy}-{mm}-{dd}')).not.toBe(batch1[0].format('{yyyy}-{mm}-{dd}'));
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

	it('should support provider race and consensus execution modes in recurrenceAI', async () => {
		const fetchSpy = vi.spyOn(globalThis, 'fetch');
		fetchSpy.mockImplementation(async () => new Response(JSON.stringify({
			choices: [{
				message: {
					content: JSON.stringify({
						rrule: 'FREQ=WEEKLY;BYDAY=FR',
						summary: 'Every Friday',
						confidence: 0.98
					})
				}
			}]
		}), { status: 200, headers: { 'Content-Type': 'application/json' } }));

		const resRace = await recurrenceAI('Every Friday', {
			mode: 'race',
			providers: [
				{ id: 'groq', key: 'key-1', url: 'https://api.groq.com/v1/chat/completions', model: 'llama-3.3-70b-versatile' },
				{ id: 'openai', key: 'key-2', url: 'https://api.openai.com/v1/chat/completions', model: 'gpt-4o' }
			]
		});
		expect(resRace.rrule).toBe('FREQ=WEEKLY;BYDAY=FR');

		const resConsensus = await recurrenceAI('Every Friday', {
			mode: 'consensus',
			providers: [
				{ id: 'groq', key: 'key-1', url: 'https://api.groq.com/v1/chat/completions', model: 'llama-3.3-70b-versatile' },
				{ id: 'openai', key: 'key-2', url: 'https://api.openai.com/v1/chat/completions', model: 'gpt-4o' }
			]
		});
		expect(resConsensus.rrule).toBe('FREQ=WEEKLY;BYDAY=FR');
		expect(resConsensus.provider).toBe('consensus');
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
		const anchor = new Tempo('2026-08-01T09:00:00Z');
		const result = await recurrenceAI(rruleStr, {
			anchor,
			after: '2026-08-03T00:00:00Z',
			before: '2026-08-06T00:00:00Z'
		});

		expect(result.isFinite).toBe(true);
		const items = result.take(10);
		expect(items.length).toBeGreaterThan(0);
		for (const item of items) {
			expect(item >= new Tempo('2026-08-03T00:00:00Z')).toBe(true);
			expect(item <= new Tempo('2026-08-06T00:00:00Z')).toBe(true);
		}
	});
});
