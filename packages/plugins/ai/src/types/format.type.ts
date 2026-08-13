import type { Tempo } from '@magmacomputing/tempo';
import type { AiMode } from '../core/config.js';
import type { AiCacheAdapter, AiProvider } from './common.type.js';

/**
 * ## TempoDateInput
 * Flexible date-time input representation accepted by `formatAI`.
 * Supports `Tempo` instances, `Date`, ISO strings, timestamps, and TC39 `Temporal` objects.
 */
export type TempoDateInput = Tempo | Date | string | number | bigint | object;

export interface FormatItem {
	/** Date-time instance, Temporal object, or string to format. */
	date: TempoDateInput;
	/** Prompt instructions guiding the output narrative. */
	prompt?: string | undefined;
}

export interface TempoAiFormatResult {
	/** Formatted narrative string. */
	formatted: string;
	/** Confidence score between 0.0 and 1.0. */
	confidence: number;
	/** ID of the provider that fulfilled the request (or 'cache'). */
	provider: string;
	/** Optional step-by-step rationale from the LLM. */
	reasoning?: string | undefined;
}

export interface AiFormatOptions {
	/** Reference anchor date for relative calculations (defaults to now). */
	anchor?: TempoDateInput | undefined;
	/** Target IANA timezone (defaults to Tempo instance timezone or global options). */
	timeZone?: string | undefined;
	/** Target BCP 47 locale or language tag (defaults to global options or 'en-US'). */
	locale?: string | string[] | undefined;
	/** Desired narrative tone or formatting style hint (e.g. 'casual', 'formal', 'compact', 'countdown'). */
	style?: string | undefined;
	/** Custom regional context (e.g. 'AU-NSW', 'US-CA'). */
	region?: string | undefined;
	/** If true, bypasses cache to force a fresh LLM fetch */
	force?: boolean | undefined;
	/** If false, disables reading and writing to cache */
	cache?: boolean | undefined;
	/** Optional custom cache adapter engine (e.g. Redis, KV store) for this request */
	cacheAdapter?: AiCacheAdapter | undefined;
	/** Optional TTL override in milliseconds for cached result */
	ttl?: number | undefined;
	/** If true, logs prompt context and LLM payloads to console */
	debug?: boolean | undefined;
	/** Execution mode across provider farm (`AiMode.Fallback` | `AiMode.Race` | `AiMode.Consensus` | `AiMode.Hedged` | `AiMode.RoundRobin` | `AiMode.Adaptive` or string literal) */
	mode?: AiMode | undefined;
	/** Per-request provider configuration overrides */
	providers?: AiProvider[] | undefined;
	/** Strict minimum confidence threshold (0.0 to 1.0). Throws TempoAiError(422) if score is lower */
	minConfidence?: number | undefined;
	/** Optional request timeout in milliseconds for this operation */
	timeout?: number | undefined;
	/** Optional delay in milliseconds before initiating speculative hedging in AiMode.Hedged */
	hedgeDelay?: number | undefined;
	/** If true, returns an array containing both successful results and TempoAiErrors instead of throwing */
	softErrors?: boolean | undefined;
}
