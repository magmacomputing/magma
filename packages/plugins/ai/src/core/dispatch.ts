import { TempoAiError } from './error.js';
import { AiMode } from './config.js';
import { _state } from './init.js';
import { logDebug, warnDebug } from './logger.js';
import type { AiProvider } from '../types/index.js';
import { asNumber, isUndefined } from '@magmacomputing/tempo/library';

/**
 * ## ModeCandidate
 * Represents the normalized execution result returned by a single AI provider task.
 *
 * @template T - The domain-specific payload type (e.g. parsed date components, RRULE structure, schedule slot).
 */
export interface ModeCandidate<T> {
	/** The domain-specific result payload returned by the provider. */
	data: T;
	/** The identifier of the AI provider that produced this candidate. */
	providerId: string;
	/** Confidence score between 0.0 (unusable) and 1.0 (certain). */
	confidence?: number | undefined;
	/** Rate limit metadata headers extracted from provider response. */
	rateLimits?: any;
	/**
	 * Unique token or key used to determine consensus between different providers
	 * (e.g. normalized ISO string in parse, RRULE string in recurrence, timestamp pair in schedule).
	 */
	consensusKey?: string | undefined;
	/** Whether the candidate was flagged as ambiguous or had conflicting alternatives. */
	ambiguous?: boolean | undefined;
}

/**
 * ## ProviderTask
 * Async closure that executes a provider-specific AI request.
 *
 * @template T - The domain-specific payload type.
 * @param provider - The target AI provider configuration to call.
 * @param signal - Optional AbortSignal for aborting in-flight requests during race conditions.
 * @returns Promise resolving to a normalized `ModeCandidate<T>`.
 */
export type ProviderTask<T> = (provider: AiProvider, signal?: AbortSignal | undefined) => Promise<ModeCandidate<T>>;

/**
 * ## ExecuteModeOptions
 * Optional configuration overrides passed to the mode execution orchestrator.
 */
export interface ExecuteModeOptions {
	/** Minimum confidence threshold (0.0 to 1.0) required to accept a result without cascading. */
	minConfidence?: number | undefined;
	/** Whether to emit debug telemetry and provider fallback warnings to stdout/stderr. */
	debug?: boolean | undefined;
	/** Logging tag prefix for debugging output (e.g. 'tempo-plugin-ai:parse'). */
	tag?: string | undefined;
	/** Optional delay in milliseconds before initiating speculative hedging in AiMode.Hedged (default: 800ms). */
	hedgeDelay?: number | undefined;
}

/**
 * Normalizes and extracts meaningful error details from multi-provider execution failures.
 * Unwraps `AggregateError` instances (from `Promise.any`), preserving internal `TempoAiError`
 * status codes and messages.
 *
 * @internal
 * @param err - The raw error caught from the provider execution promise.
 * @param fallbackPrefix - Contextual error prefix for generic error wrappers.
 * @returns Normalized `Error` instance.
 */
function unwrapExecutionError(err: unknown, fallbackPrefix: string): Error {
	if (err instanceof TempoAiError) return err;
	if (err instanceof AggregateError) {
		const firstTempoError = err.errors.find(e => e instanceof TempoAiError);
		if (firstTempoError) return firstTempoError;
		return new TempoAiError(`${fallbackPrefix}: ${err.message}`, 500);
	}
	const message = err instanceof Error ? err.message : String(err);
	return new TempoAiError(`${fallbackPrefix}: ${message}`, 500);
}

/**
 * Executes providers sequentially in configured order.
 * - Resolves immediately if a candidate meets or exceeds `minConfidence`.
 * - If no candidate meets the threshold, falls back to the candidate with the highest confidence score.
 * - Throws if all configured providers fail.
 *
 * @internal
 */
async function executeFallbackMode<T>(
	providers: AiProvider[],
	task: ProviderTask<T>,
	options?: ExecuteModeOptions,
): Promise<ModeCandidate<T>> {
	let lastError: any = null;
	let bestCandidate: ModeCandidate<T> | null = null;

	for (const provider of providers) {
		try {
			const candidate = await task(provider);
			const confidence = asNumber(candidate.confidence, 1.0);
			const bestConfidence = asNumber(bestCandidate?.confidence, -1);

			if (!bestCandidate || confidence > bestConfidence)
				bestCandidate = candidate;

			if (options?.minConfidence === undefined || confidence >= options.minConfidence)
				return candidate;

			logDebug(
				options?.tag || 'tempo-plugin-ai',
				`Provider '${candidate.providerId}' confidence (${confidence}) below minConfidence (${options.minConfidence}). Cascading to next provider...`,
				undefined,
				{ debug: options?.debug },
			);

		} catch (err: any) {
			lastError = err;
			if (err instanceof TempoAiError && err.code === 422 && options?.minConfidence === undefined) break;
			warnDebug(
				options?.tag || 'tempo-plugin-ai',
				`Provider '${provider.id}' failed`,
				err,
				{ debug: options?.debug },
			);
		}
	}

	if (bestCandidate) return bestCandidate;
	throw lastError || new TempoAiError('All configured AI providers failed.', 500);
}

/**
 * Executes providers concurrently, resolving with the fastest successful response.
 * Uses an `AbortController` to cancel in-flight requests once a winner emerges.
 *
 * @internal
 */
async function executeRaceMode<T>(
	providers: AiProvider[],
	task: ProviderTask<T>,
	options?: ExecuteModeOptions,
): Promise<ModeCandidate<T>> {
	if (providers.length <= 1) return executeFallbackMode(providers, task, options);

	const controller = new AbortController();
	const minConfidence = options?.minConfidence;
	const errors: any[] = [];
	let bestCandidate: ModeCandidate<T> | null = null;
	let settled = false;
	let completedCount = 0;

	return new Promise<ModeCandidate<T>>((resolve, reject) => {
		const handleOutcome = (candidate: ModeCandidate<T> | null, error: any) => {
			if (settled) return;

			completedCount++;

			if (candidate) {
				const confidence = asNumber(candidate.confidence, 1.0);
				const bestConf = asNumber(bestCandidate?.confidence, -1);
				if (!bestCandidate || confidence > bestConf)
					bestCandidate = candidate;

				if (isUndefined(minConfidence) || confidence >= minConfidence) {
					settled = true;
					controller.abort();
					resolve(candidate);
					return;
				}
			} else {
				errors.push(error);
			}

			if (completedCount >= providers.length) {
				settled = true;
				controller.abort();
				if (bestCandidate)
					resolve(bestCandidate);
				else {
					const unwrapped = unwrapExecutionError(
						errors.length > 1 ? new AggregateError(errors, 'All raced providers failed') : errors[0],
						'Provider race failed'
					);
					reject(unwrapped);
				}
			}
		};

		providers.forEach(p => {
			task(p, controller.signal)
				.then(candidate => handleOutcome(candidate, null))
				.catch(err => handleOutcome(null, err));
		});
	});
}

/**
 * Dispatches concurrent requests across all providers and evaluates consensus:
 * - If all responding providers yield the same `consensusKey`, confidence is elevated to 1.0 (unanimous).
 * - If candidates disagree, selects the candidate with highest confidence and flags it as `ambiguous: true`.
 * - Throws if all providers reject.
 *
 * @internal
 */
async function executeConsensusMode<T>(
	providers: AiProvider[],
	task: ProviderTask<T>,
): Promise<ModeCandidate<T>> {
	const controller = new AbortController();
	const promises = providers.map(p => task(p, controller.signal));
	const settled = await Promise.allSettled(promises);

	const fulfilled = settled
		.filter((s): s is PromiseFulfilledResult<ModeCandidate<T>> => s.status === 'fulfilled')
		.map(s => s.value);

	if (fulfilled.length === 0) {
		const firstRejected = settled.find(s => s.status === 'rejected') as PromiseRejectedResult | undefined;
		throw unwrapExecutionError(firstRejected?.reason, 'Consensus failed: all providers rejected.');
	}

	if (fulfilled.length === 1) return fulfilled[0];

	const firstKey = fulfilled[0].consensusKey;
	const allMatch = firstKey !== undefined && fulfilled.every(f => f.consensusKey === firstKey);

	if (allMatch) {
		return {
			...fulfilled[0],
			confidence: 1.0,
			ambiguous: false,
			providerId: AiMode.Consensus,
		};
	}

	const sorted = [...fulfilled].sort((a, b) => {
		const confB = asNumber(b.confidence, 1.0);
		const confA = asNumber(a.confidence, 1.0);
		return confB - confA;
	});
	return {
		...sorted[0],
		ambiguous: true,
	};
}

/**
 * Executes providers with speculative staggered hedging:
 * - Dispatches request to the primary provider immediately.
 * - If primary provider does not respond within `hedgeDelay` (default: 800ms), dispatches speculative requests to subsequent providers.
 * - Resolves with the first valid candidate meeting `minConfidence`.
 * - Uses an `AbortController` to cancel in-flight and pending requests once a winner emerges.
 *
 * @internal
 */
async function executeHedgedMode<T>(
	providers: AiProvider[],
	task: ProviderTask<T>,
	options?: ExecuteModeOptions,
): Promise<ModeCandidate<T>> {
	if (providers.length <= 1) return executeFallbackMode(providers, task, options);

	const controller = new AbortController();
	const delay = options?.hedgeDelay ?? 800;
	const minConfidence = options?.minConfidence;
	const errors: any[] = [];
	let bestCandidate: ModeCandidate<T> | null = null;

	return new Promise<ModeCandidate<T>>((resolve, reject) => {
		let settled = false;
		let completedCount = 0;
		const timeouts: any[] = [];

		const cleanup = () => {
			timeouts.forEach(t => clearTimeout(t));
		};

		const runProvider = async (index: number) => {
			if (settled) return;
			const provider = providers[index];
			try {
				const candidate = await task(provider, controller.signal);
				if (settled) return;

				const confidence = asNumber(candidate.confidence, 1.0);
				const bestConf = asNumber(bestCandidate?.confidence, -1);
				if (!bestCandidate || confidence > bestConf)
					bestCandidate = candidate;

				if (isUndefined(minConfidence) || confidence >= minConfidence) {
					settled = true;
					cleanup();
					controller.abort();
					resolve(candidate);
					return;
				}
			} catch (err: any) {
				if (settled) return;
				errors.push(err);
			} finally {
				completedCount++;
				if (!settled && completedCount >= providers.length) {
					settled = true;
					cleanup();
					controller.abort();
					if (bestCandidate) {
						resolve(bestCandidate);
					} else {
						const unwrapped = unwrapExecutionError(
							errors.length > 1 ? new AggregateError(errors, 'All hedged providers failed') : errors[0],
							'Hedged dispatch failed'
						);
						reject(unwrapped);
					}
				}
			}
		};

		// Start first provider immediately
		runProvider(0);

		// Stagger remaining providers
		for (let i = 1; i < providers.length; i++) {
			const t = setTimeout(() => {
				if (!settled) runProvider(i);
			}, delay * i);
			timeouts.push(t);
		}
	});
}

let _rrIndex = 0;

/**
 * Dispatches requests rotating the starting provider across the provider pool in round-robin fashion.
 * Cascades to remaining providers in cyclic order if the selected primary provider fails.
 *
 * @internal
 */
async function executeRoundRobinMode<T>(
	providers: AiProvider[],
	task: ProviderTask<T>,
	options?: ExecuteModeOptions,
): Promise<ModeCandidate<T>> {
	if (providers.length <= 1) return executeFallbackMode(providers, task, options);

	const start = (_rrIndex++) % providers.length;
	const rotated = [...providers.slice(start), ...providers.slice(0, start)];
	return executeFallbackMode(rotated, task, options);
}

/**
 * Executes providers adaptively based on real-time rate limit telemetry:
 * - Deprioritizes or temporarily avoids providers whose request quota is exhausted (`remainingRequests === 0` with an active reset window).
 * - Sorts available providers by remaining request quota descending.
 * - Delegates to sequential fallback execution across the sorted provider list.
 *
 * @internal
 */
async function executeAdaptiveMode<T>(
	providers: AiProvider[],
	task: ProviderTask<T>,
	options?: ExecuteModeOptions,
): Promise<ModeCandidate<T>> {
	if (providers.length <= 1) return executeFallbackMode(providers, task, options);

	const now = Date.now();
	const scored = providers.map((provider, index) => {
		const limits = _state.providerLimits.get(provider.id);

		// Providers with no rate-limit telemetry (local LLMs, first-call remotes) have
		// no quota ceiling — assign Infinity so they naturally sort above constrained providers.
		const remaining = asNumber(limits?.remainingRequests, Infinity);
		let isExhausted = false;

		if (limits) {
			const resetMs = limits.resetAt?.epoch?.ms ?? now;
			isExhausted = (limits.remainingRequests === 0 || limits.remainingTokens === 0) && resetMs > now;
		}

		return {
			provider,
			index,
			isExhausted,
			remaining,
		}
	});

	scored.sort((a, b) => {
		// Non-exhausted providers before exhausted ones
		if (a.isExhausted !== b.isExhausted) return a.isExhausted ? 1 : -1;
		// Higher remaining requests first
		if (a.remaining !== b.remaining) return b.remaining - a.remaining;
		// Preserve original order
		return a.index - b.index;
	});

	const sortedProviders = scored.map(s => s.provider);
	return executeFallbackMode(sortedProviders, task, options);
}

/**
 * Checks if a provider has exhausted its request quota and is currently within an active cooldown window.
 *
 * @internal
 */
export function isProviderInCooldown(provider: AiProvider, now = Date.now()): boolean {
	const limits = _state.providerLimits.get(provider.id);
	if (!limits) return false;
	const resetMs = limits.resetAt?.epoch?.ms ?? now;
	const isExhausted = limits.remainingRequests === 0 || limits.remainingTokens === 0;
	return isExhausted && resetMs > now;
}

/**
 * Filters out providers currently in an active rate-limit cooldown window,
 * provided there is at least one non-exhausted provider available.
 * If all providers are in cooldown, returns all providers so execution can attempt or fail naturally.
 *
 * @internal
 */
export function filterCooldownProviders(
	providers: AiProvider[],
	options?: ExecuteModeOptions,
): AiProvider[] {
	if (providers.length <= 1) return providers;
	const now = Date.now();
	const available: AiProvider[] = [];
	const skipped: string[] = [];

	for (const p of providers) {
		if (isProviderInCooldown(p, now)) {
			skipped.push(p.id);
		} else {
			available.push(p);
		}
	}

	if (available.length > 0 && skipped.length > 0) {
		logDebug(
			options?.tag || 'tempo-plugin-ai',
			`Proactively filtered ${skipped.length} provider(s) in active 429 cooldown: ${skipped.join(', ')}`,
			undefined,
			{ debug: options?.debug },
		);
		return available;
	}
	return providers;
}

/**
 * ## executeWithMode
 * Central multi-provider execution orchestrator for Tempo AI plugins.
 * Routes task execution through the configured multi-provider strategy:
 * - `Fallback`: Sequential cascade through providers until confidence threshold is met or highest confidence is found.
 * - `Race`: Concurrent speculative requests with AbortSignal cancellation returning the fastest resolution.
 * - `Consensus`: Dispatches concurrent calls across all providers and resolves matching/highest-confidence consensus.
 * - `Hedged`: Staggered latency hedging dispatch with speculative cancellation.
 * - `RoundRobin`: Cyclic provider rotation across the configured pool.
 * - `Adaptive`: Real-time rate-limit telemetry-aware provider prioritization.
 *
 * @internal
 * @template T - The domain-specific payload type.
 * @param mode - Execution strategy (`AiMode.Fallback` | `AiMode.Race` | `AiMode.Consensus` | `AiMode.Hedged` | `AiMode.RoundRobin` | `AiMode.Adaptive`).
 * @param providers - Array of available configured `AiProvider` definitions.
 * @param task - Async task closure executed per provider.
 * @param options - Execution options including `minConfidence`, `debug`, logging `tag`, and `hedgeDelay`.
 * @returns Promise resolving to the winning `ModeCandidate<T>`.
 * @throws {TempoAiError} When the mode is invalid (400) or all providers fail (500/502).
 */
export async function executeWithMode<T>(
	mode: AiMode,
	providers: AiProvider[],
	task: ProviderTask<T>,
	options?: ExecuteModeOptions,
): Promise<ModeCandidate<T>> {
	const effectiveProviders = filterCooldownProviders(providers, options);

	let candidate: ModeCandidate<T>;
	switch (mode) {
		case AiMode.Fallback:
			candidate = await executeFallbackMode(effectiveProviders, task, options);
			break;

		case AiMode.Race:
			candidate = await executeRaceMode(effectiveProviders, task, options);
			break;

		case AiMode.Consensus:
			candidate = await executeConsensusMode(effectiveProviders, task);
			break;

		case AiMode.Hedged:
			candidate = await executeHedgedMode(effectiveProviders, task, options);
			break;

		case AiMode.RoundRobin:
			candidate = await executeRoundRobinMode(effectiveProviders, task, options);
			break;

		case AiMode.Adaptive:
			candidate = await executeAdaptiveMode(providers, task, options);
			break;

		default:
			throw new TempoAiError(`Invalid execution mode: '${mode}'. Supported modes: ${Object.values(AiMode).map(m => `'${m}'`).join(', ')}.`, 400);
	}

	_state.limits = candidate.rateLimits ?? null;
	return candidate;
}

