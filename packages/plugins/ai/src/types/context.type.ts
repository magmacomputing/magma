import type { AiMode } from '../core/config.js';
import type { AiCacheAdapter, AiProvider } from './common.type.js';

/**
 * ## TempoContext
 * The inferred regional and calendar settings resolved by `contextAI`.
 */
export interface TempoContext {
	/** Inferred IANA time zone identifier (e.g. 'America/New_York') */
	timeZone: string;
	/** Inferred BCP 47 language/region tag (e.g. 'en-US') */
	locale: string;
	/** Inferred Unicode calendar system type (e.g. 'gregory') */
	calendar: string;
	/** Inferred hemisphere, constrained strictly to 'north' or 'south' (omitted if unknowable) */
	sphere?: 'north' | 'south' | undefined;
	/** Confidence score between 0.0 (highly ambiguous) and 1.0 (certain) */
	confidence: number;
	/** The identifier of the AI provider that successfully produced this context */
	provider: string;
	/** Step-by-step reasoning explaining the inference */
	reasoning?: string | undefined;
}

/**
 * ## AiContextOptions
 * Configuration options passed to `contextAI(text, options)`.
 */
export interface AiContextOptions {
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
	/** Execution mode across provider farm (`AiMode.Fallback` | `AiMode.Race` | `AiMode.Consensus` or string literal) */
	mode?: AiMode | undefined;
	/** Per-request provider configuration overrides */
	providers?: AiProvider[] | undefined;
	/** Strict minimum confidence threshold (0.0 to 1.0). Throws TempoAiError(422) if score is lower */
	minConfidence?: number | undefined;
	/** Optional request timeout in milliseconds (overrides provider and global timeout) */
	timeout?: number | undefined;
	/** Optional delay in milliseconds before initiating speculative hedging in AiMode.Hedged (default: 800ms) */
	hedgeDelay?: number | undefined;
	/** Allow extra custom properties */
	[key: string]: any;
}
