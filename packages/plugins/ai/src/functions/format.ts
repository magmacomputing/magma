import type { Tempo } from '@magmacomputing/tempo';
import type { TempoAiError } from '../core/error.js';
import type { AiMode } from '../core/config.js';
import type { AiCacheAdapter, AiProvider } from '../types/common.type.js';

export interface FormatItem {
	/** Date-time instance or string to format. */
	date: Tempo | Date | string | number;
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
	anchor?: Tempo | Date | string | number | undefined;
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
	/** If true, returns TempoAiError into array index position instead of rejecting batch */
	softErrors?: boolean | undefined;
	/** Optional request timeout in milliseconds (overrides provider and global timeout) */
	timeout?: number | undefined;
	/** Optional delay in milliseconds before initiating speculative hedging in AiMode.Hedged (default: 800ms) */
	hedgeDelay?: number | undefined;
	/** Allow extra custom properties */
	[key: string]: any;
}

/**
 * @internal Draft implementation scaffolded for future releases.
 * ## formatAI (Upcoming Export)
 * Formats a `Tempo` instance into human-friendly, contextual narrative text 
 * tailored to specific UI tones, relative time frames, or business domains.
 * 
 * ### Why it fits Tempo:
 * Expands core `.format('{yyyy}-{mm}-{dd}')` into contextual, localized human 
 * descriptions that token patterns alone cannot capture.
 * 
 * ### Example Usage:
 * ```ts
 * const t = new Tempo('2026-08-07T17:00:00[America/New_York]');
 * 
 * // "this Friday at 5:00 PM EST (in 5 days)"
 * const result = await formatAI(t, 'friendly reminder tone with relative countdown');
 * console.log(result.formatted);
 * ```
 */
export async function formatAI(items: FormatItem[], options?: AiFormatOptions): Promise<(TempoAiFormatResult | TempoAiError)[]>;
export async function formatAI(date: any, prompt?: string, options?: AiFormatOptions): Promise<TempoAiFormatResult>;
export async function formatAI(
	dateOrItems: any,
	_promptOrOptions?: string | AiFormatOptions,
	_options?: AiFormatOptions,
): Promise<TempoAiFormatResult | (TempoAiFormatResult | TempoAiError)[]> {
	throw new Error('formatAI is not yet implemented in tempo-plugin-ai.');
}
