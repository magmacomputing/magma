import { TempoAiError } from './error.js';
import { DEFAULT_PROVIDERS, RESERVED_PROVIDER_IDS } from './config.js';
import { resolveProviderApiKey } from './discovery.js';
import { updateRateLimitsFromResponse, _state } from './init.js';
import { logDebug } from './logger.js';
import type { AiProvider, AiBaseOptions } from '../types/index.js';
import { asNumber, asText, isNumber, isObject, isString, isText, evaluate, evaluateAsync, ephemeral } from '@magmacomputing/tempo/library';

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
 * @param options - Operation options containing potential per-request provider overrides
 * @returns Array of valid provider configurations
 */
export function getAvailableProviders(options?: AiBaseOptions): AiProvider[] {
	const customProviders = options?.providers;
	const globalProviders = _state.config.providers;
	const resolved = (customProviders && customProviders.length > 0)
		? customProviders
		: (globalProviders && globalProviders.length > 0)
			? globalProviders
			: [];

	if (resolved.length === 0)
		throw new TempoAiError('No AI providers configured. Call initAI() or pass providers in options.', 400);

	assertNoReservedProviderId(resolved);
	return resolved as AiProvider[];
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
 * Normalizes model resolution for a provider based on configured tiers.
 *
 * @param provider - Target AI provider configuration
 * @param tier - Preferred model tier ('fast' | 'reasoning' | 'large' | 'default')
 * @returns Resolved model identifier string
 */
export function resolveProviderModel(
	provider: AiProvider,
	tier?: 'fast' | 'reasoning' | 'large' | 'default',
): string {
	const defaultTemplate = DEFAULT_PROVIDERS[provider.id];
	const explicitModel = asText(evaluate(provider.model, defaultTemplate?.model));
	if (explicitModel) return explicitModel;

	const models = provider.models ?? defaultTemplate?.models;

	if (isString(models)) return models;
	if (Array.isArray(models)) {
		const first = asText(models[0]);
		if (first) return first;
	}
	if (isObject(models)) {
		if (tier && (models as any)[tier]) return (models as any)[tier];
		if (models.default) return models.default;
		const values = Object.values(models);
		for (const val of values) {
			const textVal = asText(val);
			if (textVal) return textVal;
		}
	}
	return '';
}

/**
 * Sends a date-parsing request to an AI provider and returns its response content.
 *
 * @param provider - Target provider configuration
 * @param str - Input string to parse
 * @param contextString - Contextual instructions for interpreting the input
 * @param options - Optional request settings, including cancellation, timeout, prompt, debugging, and token limit
 * @returns The trimmed response content, provider identifier, and rate-limit information
 * @throws `TempoAiError` if configuration resolution, validation, cancellation, timeout, network communication, or provider processing fails
 */
export async function fetchFromProvider(
	provider: AiProvider,
	str: string,
	contextString: string,
	options?: FetchFromProviderOptions,
): Promise<{ rawContent: string; providerId: string; rateLimits: ReturnType<typeof updateRateLimitsFromResponse> }> {
	let rawUrl: string | undefined;
	let rawModel: string | undefined;
	let rawKey: string | undefined;

	const defaultUrl = DEFAULT_PROVIDERS[provider.id]?.url;
	const defaultKey = resolveProviderApiKey(provider.id);

	const controller = new AbortController();
	const rawTimeout = options?.timeout ?? provider.timeout ?? provider.options?.timeout ?? _state.config.timeout ?? 15000;
	const timeoutMs = Math.max(1, asNumber(rawTimeout, 15000));
	const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

	const onParentAbort = () => controller.abort();
	if (options?.signal) {
		if (options.signal.aborted) controller.abort();
		else options.signal.addEventListener('abort', onParentAbort);
	}

	try {
		if (controller.signal.aborted) {
			if (options?.signal?.aborted) throw new TempoAiError('Request was aborted.', 499);
			throw new TempoAiError(`Provider ${provider.id} request timed out after ${timeoutMs}ms.`, 408);
		}

		try {
			rawUrl = asText(evaluate(provider.url, defaultUrl));
			rawModel = resolveProviderModel(provider, provider.tier as any);

			let abortListener: (() => void) | undefined;
			const abortPromise = new Promise<never>((_, reject) => {
				if (controller.signal.aborted) {
					reject(new Error('Aborted'));
				} else {
					abortListener = () => reject(new Error('Aborted'));
					controller.signal.addEventListener('abort', abortListener, { once: true });
				}
			});

			try {
				const resolvedKey = await Promise.race([evaluateAsync(provider.key, defaultKey), abortPromise]);
				rawKey = asText(resolvedKey);
			} finally {
				if (abortListener) {
					controller.signal.removeEventListener('abort', abortListener);
				}
			}
		} catch (err: any) {
			if (controller.signal.aborted) {
				if (options?.signal?.aborted) throw new TempoAiError('Request was aborted.', 499);
				throw new TempoAiError(`Provider ${provider.id} request timed out after ${timeoutMs}ms.`, 408);
			}
			if (err instanceof TempoAiError) throw err;
			throw new TempoAiError(`Failed to resolve dynamic configuration for provider ${provider.id}: ${err?.message ?? err}`, 500, undefined, { cause: err });
		}

		if (!isText(rawUrl))
			throw new TempoAiError(`Provider ${provider.id} missing valid endpoint URL.`, 400);

		if (!isText(rawModel))
			throw new TempoAiError(`Provider ${provider.id} missing valid model identifier.`, 400);

		if (!isText(rawKey))
			throw new TempoAiError(`Provider ${provider.id} missing valid API key.`, 400);

		const url: string = rawUrl;
		const model: string = rawModel;
		const key: string = rawKey;

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
			|| DEFAULT_PROVIDERS[provider.id]?.tokenParam
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
		const { timeout: _unusedTimeout, max_completion_tokens: _unusedMct, max_tokens: _unusedMt, tokenLimit: _unusedTl, ...bodyOptions } = provider.options ?? {};
		const startTime = performance.now();

		const requestHeaders = {
			'Content-Type': 'application/json',
			'Authorization': `Bearer ${key}`
		};

		const response = await ephemeral(requestHeaders, (headers) => {
			return fetch(url, {
				method: 'POST',
				redirect: 'error',
				headers,
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
	} catch (err: any) {
		if (err instanceof TempoAiError) throw err;
		if (controller.signal.aborted) {
			if (options?.signal?.aborted)
				throw new TempoAiError('Request was aborted.', 499);
			throw new TempoAiError(`Provider ${provider.id} request timed out after ${timeoutMs}ms.`, 408);
		}
		throw new TempoAiError(`Network error querying provider ${provider.id}: ${err?.message ?? err}`, 503);
	} finally {
		clearTimeout(timeoutId);
		if (options?.signal)
			options.signal.removeEventListener('abort', onParentAbort);
	}
}
