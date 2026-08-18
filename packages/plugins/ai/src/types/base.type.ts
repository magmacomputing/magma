import type { Tempo } from '@magmacomputing/tempo';
import type { AiMode } from '../core/config.js';

/**
 * Universal date-time input representation accepted across AI operations.
 * Accepts any native Tempo instance, Temporal object, ISO string, Date, timestamp, or Tempo.DateTime.
 */
export type TempoDateInput = Tempo | Tempo.DateTime | (Record<string, any> & { readonly isValid?: boolean });

/**
 * ## AiBaseOptions
 * Fundamental execution, caching, timeout, and dispatch routing options 
 * accepted by all AI plugin functions.
 */
export interface AiBaseOptions {
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
	/** Optional request timeout in milliseconds (overrides provider and global timeout) */
	timeout?: number | undefined;
	/** Optional delay in milliseconds before initiating speculative hedging in AiMode.Hedged (default: 800ms) */
	hedgeDelay?: number | undefined;
	/** Optional max completion token limit override (default: 2048) */
	tokenLimit?: number | undefined;
	/** If true, returns an array containing both successful results and TempoAiErrors instead of throwing */
	softErrors?: boolean | undefined;
}

/**
 * ## AiDateContextOptions
 * Base options for operations requiring relative anchor dates, timezone, and calendar grounding.
 */
export interface AiDateContextOptions extends AiBaseOptions {
	/** Reference anchor date for relative calculations (defaults to current time). */
	anchor?: TempoDateInput | undefined;
	/** Target IANA timezone. */
	timeZone?: string | undefined;
	/** Target BCP 47 locale or language tag. */
	locale?: string | string[] | undefined;
	/** Preferred calendar system (e.g. 'gregory', 'islamic', 'hebrew'). */
	calendar?: string | undefined;
	/** Hemisphere ('north' | 'south') for seasonal and environmental calculations. */
	sphere?: 'north' | 'south' | string | undefined;
	/** Custom regional context (e.g. 'AU-NSW', 'US-CA'). */
	region?: string | undefined;
}

/**
 * ## TempoBaseAiResult
 * Standard base result structure shared across all AI operations returning structured metadata.
 */
export interface TempoBaseAiResult {
	/** Confidence rating from 0.0 (unparseable) to 1.0 (certain) */
	confidence: number;
	/** Provider ID responsible for processing (e.g., 'groq', 'gemini', 'openai', 'cache', 'native') */
	provider: string;
	/** Optional step-by-step reasoning or justification provided by the engine/LLM */
	reasoning?: string | undefined;
}

/**
 * ## TempoBaseAiMeta
 * Telemetry and provenance metadata attached to parsed Tempo instances via `.ai`.
 */
export interface TempoBaseAiMeta {
	/** Provider identifier that produced the result */
	readonly provider: string;
	/** Confidence rating from 0.0 (unparseable) to 1.0 (certain) */
	readonly confidence: number;
	/** Indicates if the result was served from cache */
	readonly cached?: boolean | undefined;
	/** Optional step-by-step reasoning or justification from LLM */
	readonly reasoning?: string | undefined;
	/** Upstream rate-limit diagnostic telemetry (if provided by response headers) */
	readonly limits?: AiRateLimits | undefined;
	/** Raw prompt passed by caller (available in debug mode) */
	readonly rawPrompt?: string | undefined;
	/** Normalized prompt used for caching and token counting (available in debug mode) */
	readonly normalizedPrompt?: string | undefined;
	/** Arbitrary provider-specific extra metadata */
	readonly [key: string]: any;
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
	delete?(key: string): Promise<boolean | void> | boolean | void;
	/** Clear entries, optionally matching a key prefix */
	clear?(prefix?: string): Promise<void> | void;
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

/**
 * ## AiModelTiers
 * Tiered dictionary of model identifiers for adaptive routing.
 */
export interface AiModelTiers {
	/** Default fallback model for standard inference */
	default?: string | undefined;
	/** High-speed / low-latency model for rapid processing */
	fast?: string | undefined;
	/** Extended reasoning / chain-of-thought model */
	reasoning?: string | undefined;
	/** High-capacity / large context model */
	large?: string | undefined;
	/** Custom named tier */
	[tier: string]: string | undefined;
}

/**
 * ## AiProvider
 * Represents an LLM provider and its respective BYOK API key and configuration options.
 */
export interface AiProvider {
	/** The provider identifier (e.g., 'groq', 'gemini', 'openai', 'mistral', 'custom') */
	id: string;
	/** The raw API key for the respective provider */
	key?: string | undefined;
	/** Optional custom API endpoint URL (e.g., for local Ollama or Azure OpenAI) */
	url?: string | undefined;
	/** Optional custom model identifier (e.g., to override the provider's default model) */
	model?: string | undefined;
	/** Tiered model dictionary (e.g. { default: '...', fast: '...', reasoning: '...' }) */
	models?: AiModelTiers | undefined;
	/** Model tier preference ('default' | 'fast' | 'reasoning' | 'large' | string) */
	tier?: 'default' | 'fast' | 'reasoning' | 'large' | string | undefined;
	/** Optional parameter name for max token limit (e.g. 'max_tokens' or 'max_completion_tokens') */
	tokenParam?: string | undefined;
	/** Optional max completion token limit for this provider (default: 2048) */
	tokenLimit?: number | undefined;
	/** Optional cache TTL override in milliseconds for entries produced by this provider */
	ttl?: number | undefined;
	/** Optional HTTP request timeout override in milliseconds for requests to this provider */
	timeout?: number | undefined;
	/** Optional provider weight for probabilistic routing */
	weight?: number | undefined;
	/** Requests-per-minute quota limit for client-side Adaptive dispatch throttling */
	rpm?: number | undefined;
	/** Tokens-per-minute quota limit for client-side Adaptive dispatch throttling */
	tpm?: number | undefined;
	/** Optional LLM parameters (e.g. temperature, max_tokens, top_p) */
	options?: Record<string, any> | undefined;
}

/**
 * ## AiConfig
 * Configuration options for the AI parsing plugin.
 */
export interface AiConfig {
	/** An array of fallback providers to use for routing */
	providers?: AiProvider[] | undefined;
	/** Execution mode across provider farm (`AiMode.Fallback` | `AiMode.Race` | `AiMode.Consensus` or string literal) */
	mode?: AiMode | undefined;
	/** Strict minimum confidence threshold (0.0 to 1.0) */
	minConfidence?: number | undefined;
	/** Optional max completion token limit default across providers (default: 2048) */
	tokenLimit?: number | undefined;
	/** Optional custom cache implementation for storing parsed strings or boolean flag to enable/disable */
	cache?: Map<string, string> | boolean | undefined;
	/** Optional custom cache storage engine (e.g., Redis, KV store) for storing parsed strings */
	cacheAdapter?: AiCacheAdapter | undefined;
	/** Optional default IANA timezone for AI operations */
	timeZone?: string | undefined;
	/** Optional default BCP 47 locale for AI operations */
	locale?: string | string[] | undefined;
	/** Optional default calendar system for AI operations (e.g. 'iso8601', 'gregory', 'islamic', 'hebrew') */
	calendar?: string | undefined;
	/** Optional default hemisphere ('north' | 'south') for seasonal and environmental calculations */
	sphere?: 'north' | 'south' | string | undefined;
	/** Optional global cache TTL in milliseconds for AI parsing entries (default: 3600000ms / 1 hour) */
	ttl?: number | undefined;
	/** Optional global timeout in milliseconds for AI requests (default: 15000ms) */
	timeout?: number | undefined;
	/** Optional remote manifest URL or false to disable remote defaults (default: 'https://tempo.magmacomputing.com.au/providers.v1.json') */
	remoteConfigUrl?: string | false | undefined;
	/** Optional custom resolver hook to fetch provider default options by ID */
	fetchDefaults?: ((providerId: string) => Promise<Partial<AiProvider> | null>) | undefined;
	/** Optional delay in milliseconds before initiating speculative hedging in AiMode.Hedged (default: 800ms) */
	hedgeDelay?: number | undefined;
	/** If true, logs the spoon-fed LLM context prompt and raw LLM response to the console */
	debug?: boolean | undefined;
}
