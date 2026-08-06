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

		// Verify iterator yields 5 items
		const iterated = Array.from(result);
		expect(iterated).toHaveLength(5);
	});
});
