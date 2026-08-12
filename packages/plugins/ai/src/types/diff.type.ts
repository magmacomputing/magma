import type { AiMode } from '../core/config.js';
import type { AiCacheAdapter, AiProvider } from './common.type.js';

/**
 * ## TempoAiDiffResult
 * The calculated and AI-formatted natural difference between two date-time points.
 */
export interface TempoAiDiffResult {
	/** Human-friendly, contextual narrative text summarizing the difference */
	formatted: string;
	/** Total calendar days between start and end */
	days?: number | undefined;
	/** Total elapsed calendar hours between start and end */
	hours?: number | undefined;
	/** Total business working days (excluding weekends and matching holidays) between start and end */
	businessDays?: number | undefined;
	/** List of holiday dates (YYYY-MM-DD) encountered within the interval */
	holidays?: string[] | undefined;
	/** Confidence rating from 0.0 (unparseable) to 1.0 (certain) */
	confidence: number;
	/** Resolution source ('cache' or provider ID like 'groq', 'gemini', 'openai') */
	provider: string;
	/** Step-by-step reasoning or justification provided by the engine/LLM */
	reasoning?: string | undefined;
}

/**
 * ## DiffPair
 * Input pair representation for batch diff processing.
 */
export interface DiffPair {
	start: any;
	end: any;
	prompt?: string | undefined;
}

/**
 * ## AiDiffOptions
 * Configuration options passed to `diffAI(start, end, prompt, options)`.
 */
export interface AiDiffOptions {
	/** Optional target timeZone for relative calculation and business day boundaries */
	timeZone?: string | undefined;
	/** Optional target locale override for language/formatting specific output */
	locale?: string | string[] | undefined;
	/** Explicit array of holiday dates to exclude from business days (format: 'YYYY-MM-DD') */
	holidays?: string[] | undefined;
	/** Expected country/region code (e.g. 'AU', 'US') */
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
	/** Execution mode across provider farm (`AiMode.Fallback` | `AiMode.Race` | `AiMode.Consensus` or string literal) */
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
