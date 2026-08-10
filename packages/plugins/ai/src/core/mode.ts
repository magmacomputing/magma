import { TempoAiError } from './error.js';
import { AiMode } from './config.js';
import type { AiProvider } from '../types/index.js';

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
			const confidence = typeof candidate.confidence === 'number' ? candidate.confidence : 1.0;

			if (!bestCandidate || confidence > (bestCandidate.confidence ?? 0))
				bestCandidate = candidate;

			if (options?.minConfidence === undefined || confidence >= options.minConfidence)
				return candidate;

			if (options?.debug)
				console.log(`[${options.tag || 'tempo-plugin-ai'}] Provider '${candidate.providerId}' confidence (${confidence}) below minConfidence (${options.minConfidence}). Cascading to next provider...`);

		} catch (err: any) {
			lastError = err;
			if (err instanceof TempoAiError && err.code === 422 && options?.minConfidence === undefined) break;
			if (options?.debug)
				console.warn(`[${options.tag || 'tempo-plugin-ai'}] Provider '${provider.id}' failed:`, err);
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
): Promise<ModeCandidate<T>> {
	const controller = new AbortController();
	try {
		const promises = providers.map(p => task(p, controller.signal));
		const winner = await Promise.any(promises);
		controller.abort();
		return winner;
	} catch (err: any) {
		controller.abort();
		throw unwrapExecutionError(err, 'Provider race failed');
	}
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
		throw firstRejected?.reason || new TempoAiError('Consensus failed: all providers rejected.', 500);
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

	const sorted = [...fulfilled].sort((a, b) => (b.confidence ?? 0) - (a.confidence ?? 0));
	return {
		...sorted[0],
		ambiguous: true,
	};
}

/**
 * ## executeWithMode
 * Central multi-provider execution orchestrator for Tempo AI plugins.
 * Routes task execution through the configured multi-provider strategy:
 * - `Fallback`: Sequential cascade through providers until confidence threshold is met or highest confidence is found.
 * - `Race`: Concurrent speculative requests with AbortSignal cancellation returning the fastest resolution.
 * - `Consensus`: Dispatches concurrent calls across all providers and resolves matching/highest-confidence consensus.
 *
 * @internal
 * @template T - The domain-specific payload type.
 * @param mode - Execution strategy (`AiMode.Fallback` | `AiMode.Race` | `AiMode.Consensus`).
 * @param providers - Array of available configured `AiProvider` definitions.
 * @param task - Async task closure executed per provider.
 * @param options - Execution options including `minConfidence`, `debug`, and logging `tag`.
 * @returns Promise resolving to the winning `ModeCandidate<T>`.
 * @throws {TempoAiError} When the mode is invalid (400) or all providers fail (500/502).
 */
export async function executeWithMode<T>(
	mode: AiMode,
	providers: AiProvider[],
	task: ProviderTask<T>,
	options?: ExecuteModeOptions,
): Promise<ModeCandidate<T>> {
	switch (mode) {
		case AiMode.Fallback:
			return executeFallbackMode(providers, task, options);
		case AiMode.Race:
			return executeRaceMode(providers, task);
		case AiMode.Consensus:
			return executeConsensusMode(providers, task);
		default:
			throw new TempoAiError(`Invalid execution mode: '${mode}'. Supported modes: ${Object.values(AiMode).map(m => `'${m}'`).join(', ')}.`, 400);
	}
}
