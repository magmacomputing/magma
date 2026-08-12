import type { Tempo } from '@magmacomputing/tempo';
import type { TempoAiError } from '../core/error.js';
import type { AiMode } from '../core/config.js';
import type { AiCacheAdapter, AiProvider } from '../types/common.type.js';

export type TempoEventType = 'point' | 'interval' | 'deadline' | 'recurrence' | 'tentative';

export interface TempoExtractedEvent {
	/** Short descriptive label or title of the extracted event/activity. */
	label: string;
	/** Start date-time point as an instantiated Tempo instance. */
	start: Tempo;
	/** Optional end date-time point (if an interval or duration was mentioned). */
	end?: Tempo | undefined;
	/** Classification category of the temporal mention. */
	type: TempoEventType;
	/** Raw text snippet extracted from the source document. */
	rawText?: string | undefined;
	/** Confidence score for this specific entity extraction (0.0 to 1.0). */
	confidence: number;
}

/**
 * Backward compatibility alias for TempoExtractedEvent.
 */
export type TempoEvent = TempoExtractedEvent;

export interface TempoAiExtractResult {
	/** Array of extracted events with instantiated Tempo objects. */
	events: TempoExtractedEvent[];
	/** Overall confidence score. */
	confidence: number;
	/** Provider ID that fulfilled the request (or 'cache'). */
	provider: string;
	/** Optional summary or reasoning from the LLM. */
	reasoning?: string | undefined;
}

export interface AiExtractOptions {
	/** Reference anchor date-time for relative expressions (defaults to now). */
	anchor?: Tempo | Date | string | number | undefined;
	/** Reference IANA timezone (defaults to global options or 'UTC'). */
	timeZone?: string | undefined;
	/** Reference BCP 47 locale (defaults to global options or 'en-US'). */
	locale?: string | string[] | undefined;
	/** Preferred calendar system (e.g. 'gregory', 'islamic', 'hebrew'). */
	calendar?: string | undefined;
	/** Optional category filter to restrict extracted entities (e.g. ['meeting', 'deadline']). */
	categories?: string[] | undefined;
	/** Optional regional context (e.g. 'US-NY', 'GB'). */
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
 * ## extractAI (Upcoming Export)
 * Scans unstructured text (emails, transcripts, task notes) and extracts all 
 * embedded temporal entities, deadlines, and events into structured `TempoAiExtractResult` records.
 * 
 * ### Why it fits Tempo:
 * Essential for calendar apps and document processing workflows where temporal references 
 * are buried inside unstructured text.
 * 
 * ### Example Usage:
 * ```ts
 * const text = "Let's meet tomorrow at 10am. Final deliverables due next Friday EOD.";
 * const result = await extractAI(text, { anchor: new Tempo() });
 * // returns TempoAiExtractResult with parsed Tempo instances in result.events
 * ```
 */
export async function extractAI(texts: string[], options?: AiExtractOptions): Promise<(TempoAiExtractResult | TempoAiError)[]>;
export async function extractAI(text: string, options?: AiExtractOptions): Promise<TempoAiExtractResult>;
export async function extractAI(
	textOrTexts: string | string[],
	_options?: AiExtractOptions,
): Promise<TempoAiExtractResult | (TempoAiExtractResult | TempoAiError)[]> {
	throw new Error('extractAI is not yet implemented in tempo-plugin-ai.');
}
