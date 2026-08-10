import { executeWithMode } from '../src/core/dispatch.js';
import { AiMode } from '../src/core/config.js';
import { TempoAiError } from '../src/core/error.js';
import type { AiProvider } from '../src/types/index.js';

describe('AI Dispatch Helper (executeWithMode)', () => {
	const mockProviders: AiProvider[] = [
		{ id: 'provider-a', key: 'key-a' },
		{ id: 'provider-b', key: 'key-b' },
	];

	it('should execute Fallback mode and stop on first provider meeting minConfidence', async () => {
		const task = vi.fn()
			.mockResolvedValueOnce({ data: { val: 1 }, providerId: 'provider-a', confidence: 0.7 })
			.mockResolvedValueOnce({ data: { val: 2 }, providerId: 'provider-b', confidence: 0.95 });

		const winner = await executeWithMode(
			AiMode.Fallback,
			mockProviders,
			task,
			{ minConfidence: 0.8 },
		);

		expect(task).toHaveBeenCalledTimes(2);
		expect(winner.providerId).toBe('provider-b');
		expect(winner.data).toEqual({ val: 2 });
	});

	it('should return best candidate in Fallback mode if none meet minConfidence', async () => {
		const task = vi.fn()
			.mockResolvedValueOnce({ data: { val: 1 }, providerId: 'provider-a', confidence: 0.6 })
			.mockResolvedValueOnce({ data: { val: 2 }, providerId: 'provider-b', confidence: 0.75 });

		const winner = await executeWithMode(
			AiMode.Fallback,
			mockProviders,
			task,
			{ minConfidence: 0.9 },
		);

		expect(task).toHaveBeenCalledTimes(2);
		expect(winner.providerId).toBe('provider-b');
		expect(winner.data).toEqual({ val: 2 });
	});

	it('should execute Race mode and return fastest provider result', async () => {
		const task = vi.fn().mockImplementation(async (provider: AiProvider) => {
			if (provider.id === 'provider-a') {
				await new Promise(resolve => setTimeout(resolve, 50));
				return { data: { fast: false }, providerId: 'provider-a', confidence: 0.8 };
			}
			return { data: { fast: true }, providerId: 'provider-b', confidence: 0.9 };
		});

		const winner = await executeWithMode(
			AiMode.Race,
			mockProviders,
			task,
		);

		expect(winner.providerId).toBe('provider-b');
		expect(winner.data).toEqual({ fast: true });
	});

	it('should execute Consensus mode and mark consensus when keys match', async () => {
		const task = vi.fn()
			.mockResolvedValueOnce({ data: { rrule: 'FREQ=DAILY' }, providerId: 'provider-a', consensusKey: 'FREQ=DAILY', confidence: 0.9 })
			.mockResolvedValueOnce({ data: { rrule: 'FREQ=DAILY' }, providerId: 'provider-b', consensusKey: 'FREQ=DAILY', confidence: 0.9 });

		const winner = await executeWithMode(
			AiMode.Consensus,
			mockProviders,
			task,
		);

		expect(winner.providerId).toBe(AiMode.Consensus);
		expect(winner.confidence).toBe(1.0);
		expect(winner.ambiguous).toBe(false);
	});

	it('should sort by confidence in Consensus mode when keys differ', async () => {
		const task = vi.fn()
			.mockResolvedValueOnce({ data: { rrule: 'FREQ=DAILY' }, providerId: 'provider-a', consensusKey: 'FREQ=DAILY', confidence: 0.8 })
			.mockResolvedValueOnce({ data: { rrule: 'FREQ=WEEKLY' }, providerId: 'provider-b', consensusKey: 'FREQ=WEEKLY', confidence: 0.95 });

		const winner = await executeWithMode(
			AiMode.Consensus,
			mockProviders,
			task,
		);

		expect(winner.providerId).toBe('provider-b');
		expect(winner.confidence).toBe(0.95);
		expect(winner.ambiguous).toBe(true);
	});

	it('should throw TempoAiError with status 400 for invalid mode', async () => {
		const task = vi.fn();
		let thrownError: any;
		try {
			await executeWithMode('unsupported' as any, mockProviders, task);
		} catch (err) {
			thrownError = err;
		}
		expect(thrownError).toBeInstanceOf(TempoAiError);
		expect(thrownError.status).toBe(400);
		expect(thrownError.code).toBe(400);
	});
});
