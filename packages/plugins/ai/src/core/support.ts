import { Tempo } from '@magmacomputing/tempo';
import { isNumber } from '@magmacomputing/tempo/library';
import { TempoAiError } from './error.js';
import { RESERVED_PROVIDER_IDS } from './config.js';
import { updateRateLimitsFromResponse, _state } from './init.js';
import { logDebug, attachCustomInspect, maskPii } from './logger.js';
import { RE_MARKDOWN_JSON_PREFIX, RE_MARKDOWN_JSON_SUFFIX } from './patterns.js';
import type { AiProvider, TempoParseAiMeta } from '../types/index.js';

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
 * Strips markdown JSON fences and parses JSON payload from provider response.
 *
 * @param rawContent - Raw content string returned from LLM
 * @param providerId - ID of the provider for error reporting
 * @returns Parsed JSON object
 * @throws TempoAiError(422) if JSON parsing fails
 */
export function parseJsonPayload<T = any>(rawContent: string, providerId: string): T {
	const cleanContent = rawContent.replace(RE_MARKDOWN_JSON_PREFIX, '').replace(RE_MARKDOWN_JSON_SUFFIX, '').trim();
	try {
		return JSON.parse(cleanContent);
	} catch (err: any) {
		throw new TempoAiError(`Provider ${providerId} returned invalid JSON payload.`, 422, undefined, { cause: err });
	}
}

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

export interface ResolvedAiContext {
	tz: string;
	loc: string;
	cal: string;
	sph: string;
	contextConfig: { timeZone: string; locale: string; calendar: string; sphere: string };
}

/**
 * Resolves complete regional, timezone, and calendar context hierarchy from options and/or anchor instance.
 *
 * @param options - Function options with potential context overrides
 * @param fallbackTempo - Anchor or fallback Tempo instance
 * @returns Resolved context fields and context configuration object
 */
export function resolveFullContext(
	options?: { timeZone?: string | undefined; locale?: string | string[] | undefined; calendar?: string | undefined; sphere?: 'north' | 'south' | string | undefined; [key: string]: any } | undefined,
	fallbackTempo?: Tempo | null,
): ResolvedAiContext {
	const resolvedOptions = (Tempo as any).options ?? {};
	const tz = String(options?.timeZone || fallbackTempo?.tz || resolvedOptions.timeZone || _state.config.timeZone || 'UTC');
	const rawLoc = (options?.locale !== undefined && (Array.isArray(options.locale) ? options.locale.length > 0 : Boolean(options.locale)))
		? options.locale
		: (fallbackTempo?.locale !== undefined && (Array.isArray(fallbackTempo.locale) ? fallbackTempo.locale.length > 0 : Boolean(fallbackTempo.locale)))
			? fallbackTempo.locale
			: resolvedOptions.locale || _state.config.locale || 'en-US';
	const firstLoc = Array.isArray(rawLoc) ? rawLoc[0] : rawLoc;
	const loc = typeof firstLoc === 'string' && firstLoc.trim().length > 0 ? firstLoc.trim() : 'en-US';
	const cal = String(options?.calendar || fallbackTempo?.cal || resolvedOptions.calendar || _state.config.calendar || 'iso8601');
	const sph = String(options?.sphere || fallbackTempo?.sphere || resolvedOptions.sphere || _state.config.sphere || 'north');
	const contextConfig = { timeZone: tz, locale: loc, calendar: cal, sphere: sph };

	return { tz, loc, cal, sph, contextConfig };
}

export function resolveTzAndLocale(
	options?: { timeZone?: string | undefined; locale?: string | string[] | undefined } | undefined,
	fallbackTempo?: Tempo | null,
): { tz: string; loc: string } {
	const { tz, loc } = resolveFullContext(options, fallbackTempo);
	return { tz, loc };
}

/**
 * Validates that minConfidence is a finite number between 0.0 and 1.0.
 *
 * @param minConfidence - Optional confidence threshold to validate
 * @param targetFnName - Optional function name for descriptive error messaging
 * @returns Validated minConfidence number or undefined
 * @throws TempoAiError(400) if minConfidence is invalid
 */
export function validateMinConfidence(minConfidence?: number, targetFnName?: string): number | undefined {
	const effective = minConfidence ?? _state.config.minConfidence;
	if (
		effective !== undefined &&
		(typeof effective !== 'number' ||
			!Number.isFinite(effective) ||
			effective < 0.0 ||
			effective > 1.0)
	) {
		const target = targetFnName ? ` to ${targetFnName}` : '';
		throw new TempoAiError(`Invalid minConfidence provided${target}: "${String(effective)}"`, 400);
	}
	return effective;
}

/**
 * Concurrently processes an array of items with bounded concurrency and optional soft error normalization.
 *
 * @param items - Array of input items to process
 * @param workerFn - Asynchronous transformation function for each item
 * @param options - Batch options containing softErrors and concurrency limits
 * @returns Array of results or TempoAiErrors
 */
export async function executeBatch<TIn, TOut>(
	items: TIn[],
	workerFn: (item: TIn, index: number) => Promise<TOut>,
	options?: { softErrors?: boolean | undefined; concurrency?: number | undefined } | undefined,
): Promise<(TOut | TempoAiError)[]> {
	if (items.length === 0) return [];
	const softErrors = Boolean(options?.softErrors);
	const customConcurrency = isNumber(options?.concurrency) ? options.concurrency : undefined;
	const resolvedConcurrency = customConcurrency ?? (softErrors ? 4 : items.length);
	const concurrencyLimit = Math.max(1, Math.min(16, Math.floor(resolvedConcurrency)));

	if (concurrencyLimit >= items.length && customConcurrency === undefined) {
		if (softErrors) {
			const settled = await Promise.allSettled(items.map((item, idx) => workerFn(item, idx)));
			return settled.map((s, idx) => {
				if (s.status === 'fulfilled') return s.value;
				return s.reason instanceof TempoAiError
					? s.reason
					: new TempoAiError(
						s.reason?.message || `Failed to process item at index ${idx}`,
						typeof s.reason?.status === 'number' ? s.reason.status : 500,
						undefined,
						{ cause: s.reason },
					);
			});
		}
		return Promise.all(items.map((item, idx) => workerFn(item, idx)));
	}

	const results: (TOut | TempoAiError)[] = new Array(items.length);
	let nextIdx = 0;
	let hasFailed = false;
	let firstError: any = undefined;

	const worker = async () => {
		while (nextIdx < items.length) {
			if (!softErrors && hasFailed) break;
			const currentIndex = nextIdx++;
			const item = items[currentIndex];
			try {
				const res = await workerFn(item, currentIndex);
				results[currentIndex] = res;
			} catch (err: any) {
				if (softErrors) {
					results[currentIndex] = err instanceof TempoAiError
						? err
						: new TempoAiError(
							err?.message || `Failed to process item at index ${currentIndex}`,
							typeof err?.status === 'number' ? err.status : 500,
							undefined,
							{ cause: err },
						);
				} else {
					if (!hasFailed) {
						hasFailed = true;
						firstError = err;
					}
					break;
				}
			}
		}
	};

	const workers = Array.from({ length: Math.min(concurrencyLimit, items.length) }, () => worker());
	await Promise.all(workers);

	if (!softErrors && hasFailed) throw firstError;
	return results;
}

export function attachAiMeta(instance: Tempo, meta: TempoParseAiMeta): Tempo {
	const inspectableMeta = attachCustomInspect({ ...meta }, (obj, isProd) => ({
		provider: obj.provider,
		cached: obj.cached,
		confidence: obj.confidence,
		ambiguous: obj.ambiguous,
		granularity: obj.granularity,
		rawIso: obj.rawIso,
		...(obj.rawPrompt !== undefined ? { rawPrompt: maskPii(obj.rawPrompt, isProd) } : {}),
		...(obj.normalizedPrompt !== undefined ? { normalizedPrompt: maskPii(obj.normalizedPrompt, isProd) } : {}),
		...(obj.reasoning !== undefined ? { reasoning: maskPii(obj.reasoning, isProd) } : {}),
		...(obj.limits ? { limits: obj.limits } : {}),
	}));
	const frozenMeta = Object.freeze(inspectableMeta);
	const boundMethodCache = new Map<PropertyKey, Function>();

	return new Proxy(instance, {
		get(target, prop, _receiver) {
			if (prop === 'ai') return frozenMeta;
			if (prop === 'isValid') {
				if (meta.confidence === 0.0 || meta.rawIso === 'INVALID' || meta.ambiguous === true || !target.isValid)
					return false;
			}
			if (prop === 'constructor')
				return Reflect.get(target, prop, target);

			if (boundMethodCache.has(prop))
				return boundMethodCache.get(prop);

			const val = Reflect.get(target, prop, target);
			if (typeof val === 'function') {
				const bound = val.bind(target);
				boundMethodCache.set(prop, bound);
				return bound;
			}
			return val;
		},
		has(target, prop) {
			if (prop === 'ai') return true;
			return Reflect.has(target, prop);
		},
	});
}

export function resolveProviderModel(provider: AiProvider, requestedTier?: string): string | undefined {
	if (provider.model && typeof provider.model === 'string' && provider.model.trim().length > 0)
		return provider.model.trim();

	const models = provider.models;
	if (!models) return undefined;

	if (Array.isArray(models))
		return typeof models[0] === 'string' ? models[0] : undefined;

	if (typeof models === 'object') {
		const targetTier = requestedTier || provider.tier || 'default';
		return (models as Record<string, string>)[targetTier]
			|| (models as Record<string, string>).default
			|| Object.values(models)[0];
	}

	return undefined;
}

export async function fetchFromProvider(
	provider: AiProvider,
	str: string,
	contextString: string,
	isDebug: boolean,
	parentSignal?: AbortSignal,
	timeoutOverride?: number,
	customSystemPrompt?: string
): Promise<{ rawContent: string; providerId: string; rateLimits: ReturnType<typeof updateRateLimitsFromResponse> }> {
	const url = provider.url!;
	const model = resolveProviderModel(provider, provider.tier);

	if (!url || typeof url !== 'string')
		throw new TempoAiError(`Provider ${provider.id} missing valid endpoint URL.`, 400);

	if (!model || typeof model !== 'string')
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

	const systemPrompt = customSystemPrompt ?? defaultSystemPrompt;

	logDebug('tempo-plugin-ai', `Querying provider '${provider.id}' (model: ${model})...`, undefined, { debug: isDebug });

	const tokenParam = provider.tokenParam
		|| (provider.options?.max_completion_tokens !== undefined ? 'max_completion_tokens' : undefined)
		|| (provider.options?.max_tokens !== undefined ? 'max_tokens' : undefined)
		|| 'max_tokens';
	const tokenLimit = { [tokenParam]: 250 };

	const { timeout: _unusedTimeout, ...bodyOptions } = provider.options ?? {};
	const controller = new AbortController();
	const timeoutMs = timeoutOverride ?? provider.timeout ?? provider.options?.timeout ?? _state.config.timeout ?? 15000;
	const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

	const onParentAbort = () => controller.abort();
	if (parentSignal) {
		if (parentSignal.aborted) controller.abort();
		else parentSignal.addEventListener('abort', onParentAbort);
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
		if (typeof rawContent !== 'string')
			throw new TempoAiError(`Provider ${provider.id} returned invalid response payload.`, 422);

		const elapsed = Math.round(performance.now() - startTime);
		logDebug('tempo-plugin-ai', `Received response from '${provider.id}' in ${elapsed}ms`, undefined, { debug: isDebug });

		return { rawContent: rawContent.trim(), providerId: provider.id, rateLimits: limits };
	} finally {
		clearTimeout(timeoutId);
		if (parentSignal) {
			parentSignal.removeEventListener('abort', onParentAbort);
		}
	}
}
