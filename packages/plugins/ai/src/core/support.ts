import { Tempo } from '@magmacomputing/tempo';
import { TempoAiError } from './error.js';
import { RESERVED_PROVIDER_IDS } from './config.js';
import { updateRateLimitsFromResponse, _state } from './init.js';
import { logDebug, attachCustomInspect, maskPii } from './logger.js';
import type { AiProvider, TempoParseAiMeta } from '../types/index.js';

export function assertNoReservedProviderId(providers: Partial<AiProvider>[]): void {
	for (const p of providers) {
		if (p.id && RESERVED_PROVIDER_IDS.has(p.id.toLowerCase()))
			throw new TempoAiError(`Provider ID '${p.id}' is a reserved keyword in AI provider configuration.`, 400);
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

export function resolveTzAndLocale(
	options?: { timeZone?: string | undefined; locale?: string | string[] | undefined } | undefined,
	fallbackTempo?: Tempo | null,
): { tz: string; loc: string } {
	const resolvedOptions = (Tempo as any).options ?? {};
	const tz = String(options?.timeZone || fallbackTempo?.tz || resolvedOptions.timeZone || _state.config.timeZone || 'UTC');
	const rawLoc = (options?.locale !== undefined && (Array.isArray(options.locale) ? options.locale.length > 0 : Boolean(options.locale)))
		? options.locale
		: (fallbackTempo?.locale !== undefined && (Array.isArray(fallbackTempo.locale) ? fallbackTempo.locale.length > 0 : Boolean(fallbackTempo.locale)))
			? fallbackTempo.locale
			: resolvedOptions.locale || _state.config.locale || 'en-US';
	const firstLoc = Array.isArray(rawLoc) ? rawLoc[0] : rawLoc;
	const loc = typeof firstLoc === 'string' && firstLoc.trim().length > 0 ? firstLoc.trim() : 'en-US';
	return { tz, loc };
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
		getOwnPropertyDescriptor(target, prop) {
			if (prop === 'ai') {
				return {
					value: frozenMeta,
					writable: false,
					configurable: true,
					enumerable: true
				};
			}
			return Reflect.getOwnPropertyDescriptor(target, prop);
		},
		ownKeys(target) {
			const keys = Reflect.ownKeys(target);
			if (!keys.includes('ai')) keys.push('ai');
			return keys;
		}
	});
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
	const model = provider.model!;

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
