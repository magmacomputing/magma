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
	/** Rate limit snapshot returned by the provider HTTP headers for this request */
	readonly limits?: AiRateLimits | undefined;
}

declare module '@magmacomputing/tempo' {
	interface Tempo {
		/** Frozen AI resolution metadata attached when parsed via parseAI */
		ai?: TempoAiMeta | undefined;
	}
}

/**
 * ## AiCacheAdapter
 * Interface for synchronous or asynchronous custom storage engines (e.g. Redis, Cloudflare KV, Memcached).
 */
export interface AiCacheAdapter {
	/** Retrieve a value by key */
	get(key: string): Promise<string | undefined> | string | undefined;
	/** Store a value by key with optional TTL in milliseconds */
	set(key: string, value: string, ttlMs?: number): Promise<void> | void;
	/** Delete a specific entry by key */
	delete?(key: string): Promise<void> | void;
	/** Clear entries, optionally matching a key prefix */
	clear?(prefix?: string): Promise<void> | void;
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
	/** Optional cache TTL override in milliseconds for entries produced by this provider */
	ttl?: number | undefined;
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

/**
 * ## AiConfig
 * Configuration options for the AI parsing plugin.
 */
export interface AiConfig {
	/** An array of fallback providers to use for routing */
	providers?: AiProvider[] | undefined;
	/** Optional custom cache implementation for storing parsed strings */
	cache?: Map<string, string> | undefined;
	/** Optional custom cache storage engine (e.g., Redis, KV store) for storing parsed strings */
	cacheAdapter?: AiCacheAdapter | undefined;
	/** Optional global cache TTL in milliseconds for AI parsing entries (default: 3600000ms / 1 hour) */
	ttl?: number | undefined;
	/** Optional global timeout in milliseconds for AI requests (default: 15000ms) */
	timeout?: number | undefined;
	/** Optional remote manifest URL or false to disable remote defaults (default: 'https://tempo.magmacomputing.com.au/providers.v1.json') */
	remoteConfigUrl?: string | false | undefined;
	/** Optional custom resolver hook to fetch provider default options by ID */
	fetchDefaults?: ((providerId: string) => Promise<Partial<AiProvider> | null>) | undefined;
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
