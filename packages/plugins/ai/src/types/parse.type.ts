import type { AiMode } from '../core/config.js';
import type { AiCacheAdapter, AiProvider, TempoBaseAiMeta } from './common.type.js';

declare module '@magmacomputing/tempo' {
	interface Tempo {
		/** Frozen AI resolution metadata attached when parsed via parseAI */
		ai?: TempoParseAiMeta | undefined;
	}
}

/**
 * ## TempoParseAiMeta
 * Frozen AI resolution metadata attached to Tempo instances produced by `parseAI`.
 */
export interface TempoParseAiMeta extends TempoBaseAiMeta {
	/** Whether the result was retrieved from cache */
	readonly cached: boolean;
	/** Whether the input prompt had multiple possible interpretations */
	readonly ambiguous: boolean;
	/** Granularity level of the parsed date ('year' | 'month' | 'day' | 'hour' | 'minute' | 'second' | 'unknown') */
	readonly granularity: string;
	/** Raw un-augmented ISO 8601 string returned by the LLM (if applicable) */
	readonly rawIso?: string | undefined;
}

/** Backward-compatible alias for TempoParseAiMeta */
export type TempoAiMeta = TempoParseAiMeta;

/**
 * ## AiParseOptions
 * Options passed to `parseAI(input, options)`.
 */
export interface AiParseOptions {
	/** Reference anchor date/time instance or string */
	anchor?: any;
	/** Target timeZone override */
	timeZone?: string;
	/** Target calendar override */
	calendar?: string;
	/** Target locale override */
	locale?: string;
	/** Target sphere override */
	sphere?: string;
	/** If true, bypasses cache and native parsing to force an LLM fetch */
	force?: boolean;
	/** If false, disables reading and writing to cache */
	cache?: boolean;
	/** Optional custom cache adapter engine (e.g. Redis, KV store) for this request */
	cacheAdapter?: AiCacheAdapter;
	/** Optional TTL override in milliseconds for cached result */
	ttl?: number;
	/** If true, logs prompt context and LLM payloads to console */
	debug?: boolean;
	/** Execution mode across provider farm (`AiMode.Fallback` | `AiMode.Race` | `AiMode.Consensus` or string literal) */
	mode?: AiMode;
	/** Per-request provider configuration overrides */
	providers?: AiProvider[];
	/** Strict minimum confidence threshold (0.0 to 1.0). Throws TempoAiError(422) if score is lower */
	minConfidence?: number;
	/** If true, places TempoAiError into array index position instead of rejecting batch */
	softErrors?: boolean;
	/** Optional request timeout in milliseconds (overrides provider and global timeout) */
	timeout?: number;
	/** Allow extra options */
	[key: string]: any;
}
