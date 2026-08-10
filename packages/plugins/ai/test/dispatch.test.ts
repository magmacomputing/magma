import { executeWithMode } from '../src/core/dispatch.js';
import { AiMode } from '../src/core/config.js';
import { TempoAiError } from '../src/core/error.js';
import { _state, resetAI } from '../src/core/init.js';
import { Tempo } from '@magmacomputing/tempo';
import type { AiProvider } from '../src/types/index.js';

describe('AI Dispatch Helper (executeWithMode)', () => {
	beforeEach(() => {
		resetAI();
	});

	const mockProviders: AiProvider[] = [
		{ id: 'provider-a', key: 'key-a' },
		{ id: 'provider-b', key: 'key-b' },
		{ id: 'provider-c', key: 'key-c' },
	];

	describe('AiMode.Fallback', () => {
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
				.mockResolvedValueOnce({ data: { val: 2 }, providerId: 'provider-b', confidence: 0.75 })
				.mockResolvedValueOnce({ data: { val: 3 }, providerId: 'provider-c', confidence: 0.70 });

			const winner = await executeWithMode(
				AiMode.Fallback,
				mockProviders,
				task,
				{ minConfidence: 0.9 },
			);

			expect(task).toHaveBeenCalledTimes(3);
			expect(winner.providerId).toBe('provider-b');
			expect(winner.data).toEqual({ val: 2 });
		});
	});

	describe('AiMode.Race', () => {
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
				mockProviders.slice(0, 2),
				task,
			);

			expect(winner.providerId).toBe('provider-b');
			expect(winner.data).toEqual({ fast: true });
		});
	});

	describe('AiMode.Consensus', () => {
		it('should execute Consensus mode and mark consensus when keys match', async () => {
			const task = vi.fn()
				.mockResolvedValueOnce({ data: { rrule: 'FREQ=DAILY' }, providerId: 'provider-a', consensusKey: 'FREQ=DAILY', confidence: 0.9 })
				.mockResolvedValueOnce({ data: { rrule: 'FREQ=DAILY' }, providerId: 'provider-b', consensusKey: 'FREQ=DAILY', confidence: 0.9 });

			const winner = await executeWithMode(
				AiMode.Consensus,
				mockProviders.slice(0, 2),
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
				mockProviders.slice(0, 2),
				task,
			);

			expect(winner.providerId).toBe('provider-b');
			expect(winner.confidence).toBe(0.95);
			expect(winner.ambiguous).toBe(true);
		});
	});

	describe('AiMode.Hedged', () => {
		it('should only call primary provider when it finishes before hedgeDelay', async () => {
			const task = vi.fn().mockImplementation(async (provider: AiProvider) => {
				await new Promise(resolve => setTimeout(resolve, 20));
				return { data: { hedged: false }, providerId: provider.id, confidence: 0.95 };
			});

			const winner = await executeWithMode(
				AiMode.Hedged,
				mockProviders,
				task,
				{ hedgeDelay: 100 },
			);

			expect(winner.providerId).toBe('provider-a');
			expect(winner.data).toEqual({ hedged: false });
			expect(task).toHaveBeenCalledTimes(1);
			expect(task).toHaveBeenCalledWith(mockProviders[0], expect.any(AbortSignal));
		});

		it('should launch speculative secondary provider when primary exceeds hedgeDelay', async () => {
			const task = vi.fn().mockImplementation(async (provider: AiProvider, signal?: AbortSignal) => {
				if (provider.id === 'provider-a') {
					await new Promise((resolve, reject) => {
						const timer = setTimeout(resolve, 200);
						signal?.addEventListener('abort', () => {
							clearTimeout(timer);
							reject(new Error('Aborted'));
						});
					});
					return { data: { winner: 'a' }, providerId: 'provider-a', confidence: 0.9 };
				}
				if (provider.id === 'provider-b') {
					await new Promise(resolve => setTimeout(resolve, 20));
					return { data: { winner: 'b' }, providerId: 'provider-b', confidence: 0.95 };
				}
				return { data: { winner: 'c' }, providerId: 'provider-c', confidence: 0.5 };
			});

			const winner = await executeWithMode(
				AiMode.Hedged,
				mockProviders,
				task,
				{ hedgeDelay: 50 },
			);

			expect(winner.providerId).toBe('provider-b');
			expect(winner.data).toEqual({ winner: 'b' });
			// Provider A and Provider B were initiated, Provider C was not needed
			expect(task).toHaveBeenCalledTimes(2);
		});

		it('should handle primary failure and resolve with secondary candidate', async () => {
			const task = vi.fn().mockImplementation(async (provider: AiProvider) => {
				if (provider.id === 'provider-a') {
					throw new TempoAiError('Provider A Network Error', 502);
				}
				await new Promise(resolve => setTimeout(resolve, 30));
				return { data: { winner: 'b' }, providerId: 'provider-b', confidence: 0.9 };
			});

			const winner = await executeWithMode(
				AiMode.Hedged,
				mockProviders,
				task,
				{ hedgeDelay: 20 },
			);

			expect(winner.providerId).toBe('provider-b');
			expect(winner.data).toEqual({ winner: 'b' });
		});

		it('should reject when all hedged providers fail', async () => {
			const task = vi.fn().mockImplementation(async () => {
				throw new TempoAiError('Provider unavailable', 503);
			});

			await expect(
				executeWithMode(AiMode.Hedged, mockProviders.slice(0, 2), task, { hedgeDelay: 10 }),
			).rejects.toThrow(TempoAiError);
		});
	});

	describe('AiMode.RoundRobin', () => {
		it('should rotate starting provider cyclically on successive invocations', async () => {
			const calledProviders: string[] = [];
			const task = vi.fn().mockImplementation(async (provider: AiProvider) => {
				calledProviders.push(provider.id);
				return { data: { provider: provider.id }, providerId: provider.id, confidence: 0.9 };
			});

			// Call 1 -> should start with provider-a
			const win1 = await executeWithMode(AiMode.RoundRobin, mockProviders, task);
			// Call 2 -> should start with provider-b
			const win2 = await executeWithMode(AiMode.RoundRobin, mockProviders, task);
			// Call 3 -> should start with provider-c
			const win3 = await executeWithMode(AiMode.RoundRobin, mockProviders, task);
			// Call 4 -> should wrap around to provider-a
			const win4 = await executeWithMode(AiMode.RoundRobin, mockProviders, task);

			expect(win1.providerId).toBe('provider-a');
			expect(win2.providerId).toBe('provider-b');
			expect(win3.providerId).toBe('provider-c');
			expect(win4.providerId).toBe('provider-a');
			expect(calledProviders).toEqual(['provider-a', 'provider-b', 'provider-c', 'provider-a']);
		});

		it('should cascade to remaining providers in cyclic order when rotated primary fails', async () => {
			const task = vi.fn().mockImplementation(async (provider: AiProvider) => {
				if (provider.id === 'provider-a') {
					throw new TempoAiError('Provider A down', 500);
				}
				return { data: { success: true }, providerId: provider.id, confidence: 0.9 };
			});

			// Provider A is starting provider on this call, fails and cascades to Provider B
			const winner = await executeWithMode(AiMode.RoundRobin, mockProviders.slice(0, 2), task);
			expect(winner.providerId).toBe('provider-b');
		});
	});

	describe('AiMode.Adaptive', () => {
		it('should prioritize providers with active quota over exhausted providers in cooldown', async () => {
			// Simulate rate limit telemetry in state
			const resetFuture = new Tempo().add('2 minutes');
			_state.providerLimits.set('provider-a', {
				remainingRequests: 0,
				remainingTokens: 0,
				resetAt: resetFuture,
			});
			_state.providerLimits.set('provider-b', {
				remainingRequests: 250,
				remainingTokens: 50000,
				resetAt: null,
			});

			const callSequence: string[] = [];
			const task = vi.fn().mockImplementation(async (provider: AiProvider) => {
				callSequence.push(provider.id);
				return { data: { id: provider.id }, providerId: provider.id, confidence: 0.9 };
			});

			const winner = await executeWithMode(AiMode.Adaptive, mockProviders.slice(0, 2), task);

			// provider-b should be prioritized before provider-a because provider-a has remainingRequests: 0
			expect(callSequence[0]).toBe('provider-b');
			expect(winner.providerId).toBe('provider-b');
		});

		it('should sort providers by highest remaining request quota descending', async () => {
			_state.providerLimits.set('provider-a', {
				remainingRequests: 50,
				remainingTokens: 1000,
				resetAt: null,
			});
			_state.providerLimits.set('provider-b', {
				remainingRequests: 400,
				remainingTokens: 80000,
				resetAt: null,
			});
			_state.providerLimits.set('provider-c', {
				remainingRequests: 150,
				remainingTokens: 30000,
				resetAt: null,
			});

			const callSequence: string[] = [];
			const task = vi.fn().mockImplementation(async (provider: AiProvider) => {
				callSequence.push(provider.id);
				return { data: { id: provider.id }, providerId: provider.id, confidence: 0.9 };
			});

			const winner = await executeWithMode(AiMode.Adaptive, mockProviders, task);

			// Expected order: provider-b (400) -> provider-c (150) -> provider-a (50)
			expect(callSequence[0]).toBe('provider-b');
			expect(winner.providerId).toBe('provider-b');
		});

		it('should always prefer local providers (no rate-limit telemetry) over constrained remote providers', async () => {
			// provider-a is a local LLM (e.g. Ollama) — never sets rate-limit headers,
			// so providerLimits has no entry for it → remaining = Infinity.
			// provider-b is a remote API with plenty of quota remaining.
			// provider-a should still be preferred because Infinity > any finite value.
			_state.providerLimits.set('provider-b', {
				remainingRequests: 4500,
				remainingTokens: 900000,
				resetAt: null,
			});
			// provider-c is a remote API that is quota-exhausted
			const resetFuture = new Tempo().add('5 minutes');
			_state.providerLimits.set('provider-c', {
				remainingRequests: 0,
				remainingTokens: 0,
				resetAt: resetFuture,
			});

			const callSequence: string[] = [];
			const task = vi.fn().mockImplementation(async (provider: AiProvider) => {
				callSequence.push(provider.id);
				return { data: { id: provider.id }, providerId: provider.id, confidence: 0.9 };
			});

			const winner = await executeWithMode(AiMode.Adaptive, mockProviders, task);

			// Expected order: provider-a (Infinity, local) → provider-b (4500, remote) → provider-c (exhausted)
			expect(callSequence[0]).toBe('provider-a');
			expect(winner.providerId).toBe('provider-a');
		});
	});

	describe('Invalid Modes', () => {
		it('should throw TempoAiError with status 400 for invalid mode', async () => {
			const task = vi.fn();
			const promise = executeWithMode('unsupported' as any, mockProviders, task);
			await expect(promise).rejects.toThrow(TempoAiError);
			await expect(promise).rejects.toSatisfy((err: unknown) => {
				return err instanceof TempoAiError && err.status === 400 && err.code === 400;
			});
		});
	});
});
