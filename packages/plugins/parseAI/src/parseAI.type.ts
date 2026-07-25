import type { Tempo } from '@magmacomputing/tempo';

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
 * ## AiConfig
 * Configuration options for the AI parsing plugin.
 */
export interface AiConfig {
	/** An array of fallback providers to use for routing */
	providers?: AiProvider[] | undefined;
	/** Optional custom cache implementation for storing parsed strings */
	cache?: Map<string, string> | undefined;
	/** Maximum number of entries allowed in the default cache (default: 1000) */
	maxCacheSize?: number | undefined;
	/** Time to live in milliseconds for default cache entries (default: 24 hours) */
	cacheTtl?: number | undefined;
	/** If true, logs the spoon-fed LLM context prompt and raw LLM response to the console */
	debug?: boolean | undefined;
}

/**
 * ## AiRateLimits
 * Exposes the rate limit and billing statistics returned in the HTTP headers 
 * of the most recent LLM proxy request.
 */
export interface AiRateLimits {
	/** Number of remaining requests allowed in the current time window */
	remainingRequests: number;
	/** Number of remaining tokens allowed in the current time window */
	remainingTokens: number;
	/** A Tempo instance representing the exact time the limits reset */
	resetAt: Tempo;
}
