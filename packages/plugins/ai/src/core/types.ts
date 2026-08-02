import type { Tempo } from '@magmacomputing/tempo';
import type { AiMode } from './config.js';

/**
 * ## TempoAiMeta
 * Frozen metadata object attached to Tempo instances produced by `parseAI`.
 */
export interface TempoAiMeta {
	/** Resolution source ('native', 'cache', or provider ID like 'groq', 'openai', 'ollama') */
	readonly provider: string;
	/** Whether the result was retrieved from cache */
	readonly cached: boolean;
	/** Confidence rating from 0.0 (unparseable) to 1.0 (certain) */
	readonly confidence: number;
	/** Whether the input prompt had multiple possible interpretations */
	readonly ambiguous: boolean;
	/** Granularity level of the parsed date ('year' | 'month' | 'day' | 'hour' | 'minute' | 'second' | 'unknown') */
	readonly granularity: string;
	/** Raw un-augmented ISO 8601 string returned by the LLM (if applicable) */
	readonly rawIso?: string | undefined;
	/** Step-by-step calendar math reasoning (included when debug: true or when provided by LLM) */
	readonly reasoning?: string | undefined;
	/** Raw prompt input (only included when debug: true) */
	readonly rawPrompt?: string | undefined;
	/** Normalized prompt input (only included when debug: true) */
	readonly normalizedPrompt?: string | undefined;
}

declare module '@magmacomputing/tempo' {
	interface Tempo {
		/** Frozen AI resolution metadata attached when parsed via parseAI */
		ai?: TempoAiMeta | undefined;
	}
}

/**
 * ## AiProvider
 * Represents an LLM provider and its respective BYOK API key.
 */
export interface AiProvider {
	/** The provider identifier (e.g., 'groq', 'gemini', 'openai', 'mistral', 'custom') */
	id: string;
	/** The raw API key for the respective provider */
	key: string;
	/** Optional custom API endpoint URL (e.g., for local Ollama or Azure OpenAI) */
	url?: string;
	/** Optional custom model identifier (e.g., to override the provider's default model) */
	model?: string;
	/** Optional parameter name for max token limit (e.g. 'max_tokens' or 'max_completion_tokens') */
	tokenParam?: string | undefined;
	/** Optional LLM parameters (e.g. temperature, max_tokens, top_p) */
	options?: Record<string, any>;
}

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
	/** Allow extra options */
	[key: string]: any;
}

/**
 * ## AiConfig
 * Configuration options for the AI parsing plugin.
 */
export interface AiConfig {
	/** An array of fallback providers to use for routing */
	providers?: AiProvider[] | undefined;
	/** Optional custom cache implementation for storing parsed strings */
	cache?: Map<string, string> | undefined;
	/** If true, logs the spoon-fed LLM context prompt and raw LLM response to the console */
	debug?: boolean | undefined;
}

/**
 * ## AiRateLimits
 * Exposes the rate limit and billing statistics returned in the HTTP headers 
 * of the most recent LLM proxy request.
 */
export interface AiRateLimits {
	/** Number of remaining requests allowed in the current time window, or null if unknown */
	remainingRequests: number | null;
	/** Number of remaining tokens allowed in the current time window, or null if unknown */
	remainingTokens: number | null;
	/** A Tempo instance representing the exact time the limits reset, or null if unknown */
	resetAt: Tempo | null;
}
