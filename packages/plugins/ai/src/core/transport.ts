import { TempoAiError } from './error.js';
import { RESERVED_PROVIDER_IDS } from './config.js';
import { updateRateLimitsFromResponse, _state } from './init.js';
import { logDebug } from './logger.js';
import type { AiProvider, AiBaseOptions } from '../types/index.js';
import { asText, isObject, isString, isText } from '@magmacomputing/tempo/library';

export interface FetchFromProviderOptions extends AiBaseOptions {
	/** AbortSignal for early cancellation / timeout handling */
	signal?: AbortSignal | undefined;
	/** Custom system prompt overriding default date-parsing schema */
	systemPrompt?: string | undefined;
}

/**
 * Asserts that none of the configured provider IDs collide with reserved system keywords.
 *
 * @param providers - Array of provider configurations to check
 * @throws TempoAiError(400) if a reserved provider ID is encountered
 */
export function assertNoReservedProviderId(providers: Partial<AiProvider>[]): void {
	for (const p of providers) {
		if (p.id && RESERVED_PROVIDER_IDS.has(p.id.toLowerCase()))
			throw new TempoAiError(`Provider ID '${p.id}' is a reserved keyword in AI provider configuration.`, 400);
	}
}

/**
 * Resolves available AI providers from options or global state, asserts validity, and ensures no reserved IDs.
 *
 * @param options - Function options containing an optional providers override array
 * @returns Array of validated AiProvider configurations
 * @throws TempoAiError(400) if no providers are available or if a reserved provider ID is used
 */
export function getAvailableProviders(options?: { providers?: Partial<AiProvider>[] | undefined } | undefined): AiProvider[] {
	const availableProviders = (options?.providers ?? _state.config.providers) as AiProvider[];
	if (!availableProviders || availableProviders.length === 0)
		throw new TempoAiError('No AI providers configured. Set GROQ_API_KEY, OPENAI_API_KEY, GEMINI_API_KEY, or configure tempo.config.json.', 400);

	assertNoReservedProviderId(availableProviders);
	return availableProviders;
}

/**
 * Resolves the effective TTL for a given provider or consensus call based on options and provider defaults.
 *
 * @param providerId - ID of the winning provider (or 'consensus')
 * @param availableProviders - Configured provider array
 * @param callTtl - Explicit call-level TTL override
 * @param defaultTtl - Fallback TTL in milliseconds (default: 86,400,000 / 24h)
 * @returns Resolved TTL in milliseconds
 */
export function resolveProviderTtl(
	providerId: string,
	availableProviders: AiProvider[],
	callTtl?: number,
	defaultTtl: number = 86_400_000,
): number {
	const providerTtl = providerId === 'consensus'
		? availableProviders.reduce<number | undefined>((min, p) => p.ttl === undefined ? min : (min === undefined ? p.ttl : Math.min(min, p.ttl)), undefined)
		: availableProviders.find(p => p.id === providerId)?.ttl;
	return callTtl ?? providerTtl ?? _state.config.ttl ?? defaultTtl;
}

/**
 * Resolves the specific model identifier from a provider definition according to tier or default fallbacks.
 *
 * @param provider - Provider configuration
 * @param requestedTier - Optional requested tier (e.g. 'default', 'fast', 'smart')
 * @returns Model string name or undefined
 */
export function resolveProviderModel(provider: AiProvider, requestedTier?: string): string | undefined {
	const explicitModel = asText(provider.model);
	if (explicitModel)
		return explicitModel;

	const models = provider.models;
	if (!models) return undefined;

	if (Array.isArray(models))
		return isString(models[0]) ? models[0] : undefined;

	if (isObject(models)) {
		const targetTier = requestedTier || provider.tier || 'default';
		return (models as Record<string, string>)[targetTier]
			|| (models as Record<string, string>).default
			|| Object.values(models)[0];
	}

	return undefined;
}

/**
 * Executes an HTTP fetch request against a target AI provider endpoint with timeout, cancellation,
 * token limit negotiation, and rate limit header extraction.
 *
 * @param provider - Target AI provider configuration
 * @param str - Input text / prompt
 * @param contextString - Contextual string injected into system message
 * @param options - Execution options (signal, timeout, systemPrompt, debug, tokenLimit)
 * @returns Object containing raw payload string, providerId, and parsed rate limits
 * @throws TempoAiError on network, timeout, or provider status errors
 */
export async function fetchFromProvider(
	provider: AiProvider,
	str: string,
	contextString: string,
	options?: FetchFromProviderOptions,
): Promise<{ rawContent: string; providerId: string; rateLimits: ReturnType<typeof updateRateLimitsFromResponse> }> {
	const url = provider.url;
	const model = resolveProviderModel(provider, provider.tier);

	if (!isText(url))
		throw new TempoAiError(`Provider ${provider.id} missing valid endpoint URL.`, 400);

	if (!isText(model))
		throw new TempoAiError(`Provider ${provider.id} missing valid model identifier.`, 400);

	try {
		const parsed = new URL(url);
		if (parsed.protocol !== 'https:' && !(parsed.protocol === 'http:' && (parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1')))
			throw new TempoAiError(`Provider ${provider.id} endpoint URL '${url}' must use secure HTTPS protocol.`, 400);
	} catch (err: any) {
		if (err instanceof TempoAiError) throw err;
		throw new TempoAiError(`Provider ${provider.id} has invalid endpoint URL '${url}'.`, 400);
	}

	const defaultSystemPrompt = `You are a high-performance date parser. Read the user's string and the provided context. Return ONLY a valid JSON object matching this exact schema:
{
  "reasoning": "Step-by-step calendar math from Current Time.",
  "iso": "Local ISO 8601 string (YYYY-MM-DDThh:mm:ss) without offset or Z suffix, or 'INVALID' if ambiguous/unparseable.",
  "confidence": 0.95,
  "ambiguous": false,
  "granularity": "minute"
}

Ambiguity Rules:
- "next [weekday/unit]": Immediate next chronological occurrence after Current Time.
- "last [weekday/unit]" / "previous [weekday/unit]": Most recent past occurrence prior to Current Time.
- "this [weekday]": Occurrence in the current calendar week containing Current Time.
- "confidence": Float score between 0.0 (gibberish/unparseable) and 1.0 (100% certain).
- "granularity": Primary time precision level ('year' | 'month' | 'day' | 'hour' | 'minute' | 'second' | 'unknown').

Do not include markdown blocks or any text outside the JSON.`;

	const isDebug = options?.debug ?? _state.config.debug ?? false;
	const systemPrompt = options?.systemPrompt ?? defaultSystemPrompt;

	logDebug('tempo-plugin-ai', `Querying provider '${provider.id}' (model: ${model})...`, undefined, { debug: isDebug });

	const tokenParam = provider.tokenParam
		|| (provider.options?.max_completion_tokens !== undefined ? 'max_completion_tokens' : undefined)
		|| (provider.options?.max_tokens !== undefined ? 'max_tokens' : undefined)
		|| 'max_tokens';
	const resolvedLimit = options?.tokenLimit
		?? provider.tokenLimit
		?? provider.options?.tokenLimit
		?? provider.options?.max_completion_tokens
		?? provider.options?.max_tokens
		?? _state.config.tokenLimit
		?? 2048;
	const tokenLimit = { [tokenParam]: resolvedLimit };

	const { timeout: _unusedTimeout, ...bodyOptions } = provider.options ?? {};
	const controller = new AbortController();
	const timeoutMs = options?.timeout ?? provider.timeout ?? provider.options?.timeout ?? _state.config.timeout ?? 15000;
	const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

	const onParentAbort = () => controller.abort();
	if (options?.signal) {
		if (options.signal.aborted) controller.abort();
		else options.signal.addEventListener('abort', onParentAbort);
	}

	const startTime = performance.now();

	try {
		const response = await fetch(url, {
			method: 'POST',
			redirect: 'error',
			headers: {
				'Content-Type': 'application/json',
				'Authorization': `Bearer ${provider.key}`
			},
			body: JSON.stringify({
				model: model,
				messages: [
					{ role: 'system', content: `${systemPrompt}\n${contextString}` },
					{ role: 'user', content: str }
				],
				temperature: 0,
				...tokenLimit,
				response_format: { type: 'json_object' },
				...bodyOptions
			}),
			signal: controller.signal
		});

		const limits = updateRateLimitsFromResponse(response);
		if (limits)
			_state.providerLimits.set(provider.id, limits);

		if (!response.ok) {
			const errorText = await response.text();
			const boundedError = errorText.length > 500 ? `${errorText.slice(0, 500)}... (truncated)` : errorText;
			const resetTime = limits?.resetAt ?? undefined;
			_state.limits = limits;
			throw new TempoAiError(`Provider ${provider.id} failed with status ${response.status}. Details: ${boundedError}`, response.status, resetTime);
		}

		const data = await response.json();
		const rawContent = data?.choices?.[0]?.message?.content;
		if (!isString(rawContent))
			throw new TempoAiError(`Provider ${provider.id} returned invalid response payload.`, 422);

		const elapsed = Math.round(performance.now() - startTime);
		logDebug('tempo-plugin-ai', `Received response from '${provider.id}' in ${elapsed}ms`, undefined, { debug: isDebug });

		return { rawContent: rawContent.trim(), providerId: provider.id, rateLimits: limits };
	} finally {
		clearTimeout(timeoutId);
		if (options?.signal)
			options.signal.removeEventListener('abort', onParentAbort);
	}
}
