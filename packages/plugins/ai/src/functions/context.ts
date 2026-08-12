import { Tempo } from '@magmacomputing/tempo';
import { TempoAiError } from '../core/error.js';
import { AiMode } from '../core/config.js';
import { _state } from '../core/init.js';
import { executeWithMode } from '../core/dispatch.js';
import { normalizeCacheInput, fetchFromProvider, assertNoReservedProviderId } from '../core/support.js';
import { RE_MARKDOWN_JSON_PREFIX, RE_MARKDOWN_JSON_SUFFIX } from '../core/patterns.js';
import type { TempoContext, AiContextOptions } from '../types/index.js';

async function contextSingleInput(text: string, options?: AiContextOptions): Promise<TempoContext> {
	const isDebug = options?.debug ?? _state.config.debug ?? false;
	const normalizedStr = normalizeCacheInput(text);

	const { force, debug, mode: aiMode, providers, minConfidence, cache: aiCacheOption, timeout: callTimeout, ttl, cacheAdapter, hedgeDelay } = options || {};
	const effectiveMinConfidence = minConfidence ?? _state.config.minConfidence;

	const resolvedOptions = Tempo.options;
	const tz = String(options?.timeZone || resolvedOptions.timeZone);
	const cal = String(options?.calendar || resolvedOptions.calendar);
	const loc = String(Array.isArray(options?.locale) ? options?.locale[0] : (options?.locale || resolvedOptions.locale));
	const sph = String(options?.sphere || resolvedOptions.sphere || 'north');

	const cacheKey = `context::${normalizedStr}::${tz}::${loc}::${cal}::${sph}`;
	const adapter = cacheAdapter ?? _state.config.cacheAdapter;

	let cachedVal: string | undefined;
	if (!force && aiCacheOption !== false) {
		if (adapter) {
			try {
				const val = await adapter.get(cacheKey);
				if (val) {
					cachedVal = val;
				}
			} catch (err: any) {
				if (isDebug) console.log('[tempo-plugin-ai:context] Cache adapter read error:', err?.message);
			}
		}

		cachedVal ??= Tempo.cache.get(cacheKey);
	}

	if (cachedVal) {
		try {
			const parsedCache = JSON.parse(cachedVal);
			if (typeof parsedCache.timeZone === 'string') {
				Intl.DateTimeFormat(undefined, { timeZone: parsedCache.timeZone });
				const cachedConfidence = typeof parsedCache.confidence === 'number' && Number.isFinite(parsedCache.confidence)
					? parsedCache.confidence
					: 1.0;
				if (effectiveMinConfidence === undefined || cachedConfidence >= effectiveMinConfidence) {
					if (isDebug) console.log(`[tempo-plugin-ai:context] Cache hit: "${text}" -> ${cachedVal}`);
					return {
						timeZone: parsedCache.timeZone,
						locale: parsedCache.locale,
						calendar: parsedCache.calendar,
						sphere: parsedCache.sphere === 'north' || parsedCache.sphere === 'south' ? parsedCache.sphere : undefined,
						confidence: cachedConfidence,
						provider: 'cache',
						reasoning: parsedCache.reasoning,
					}
				}
			}
		} catch {
			// If cached value is corrupted, invalid, or fails timezone validation, proceed to fetch
		}
	}

	const contextString = `Workstation baseline context - Timezone: ${tz}, Locale: ${loc}, Calendar: ${cal}, Hemisphere: ${sph}. Use these baseline settings as the default if the input text contains no geographic or regional clues.`;

	const availableProviders = providers || _state.config.providers;
	if (!availableProviders || availableProviders.length === 0)
		throw new TempoAiError('No AI providers configured. Please call initAI().', 400);

	assertNoReservedProviderId(availableProviders);

	const mode = aiMode || _state.config.mode || AiMode.Fallback;
	const effectiveHedgeDelay = hedgeDelay ?? _state.config.hedgeDelay;

	const systemPrompt = `You are a locale and timezone inference engine. Analyze the provided text (like location names, user descriptions, meeting context) and infer the timezone (IANA format), locale (BCP 47 language/region tag), preferred calendar system (Unicode type, default 'gregory'), and hemisphere ('north' or 'south').
Return ONLY a valid JSON object matching this exact schema:
{
  "timeZone": "IANA timezone name (e.g., 'America/New_York' or 'Asia/Tokyo')",
  "locale": "BCP 47 locale tag (e.g., 'en-US' or 'ja-JP')",
  "calendar": "Unicode calendar system type (default 'gregory')",
  "sphere": "Hemisphere, must be either 'north' or 'south', or null if completely unknowable from the text",
  "reasoning": "Step-by-step logic explaining the inference",
  "confidence": 0.95
}
Rules:
- "confidence": Float score between 0.0 (highly ambiguous) and 1.0 (certain).
- "sphere": Must be exactly 'north' or 'south', or null. Do not use other cardinal directions.
Do not include markdown blocks or text outside the JSON.`;

	const winningCandidate = await executeWithMode<any>(
		mode,
		availableProviders,
		async (provider, signal) => {
			const { rawContent, providerId, rateLimits } = await fetchFromProvider(
				provider,
				text,
				contextString,
				isDebug,
				signal,
				callTimeout,
				systemPrompt,
			);
			const cleanContent = rawContent.replace(RE_MARKDOWN_JSON_PREFIX, '').replace(RE_MARKDOWN_JSON_SUFFIX, '');
			let parsedData: any;
			try {
				parsedData = JSON.parse(cleanContent);
			} catch {
				throw new TempoAiError(`Provider ${providerId} returned invalid JSON payload.`, 422);
			}

			const timeZone = typeof parsedData?.timeZone === 'string' ? parsedData.timeZone.trim() : '';
			const locale = typeof parsedData?.locale === 'string' ? parsedData.locale.trim() : '';
			const calendar = typeof parsedData?.calendar === 'string' ? parsedData.calendar.trim() : 'gregory';
			const rawSphere = typeof parsedData?.sphere === 'string' ? parsedData.sphere.trim().toLowerCase() : null;
			const sphere = rawSphere === 'north' || rawSphere === 'south' ? rawSphere : undefined;
			const confidence = parsedData?.confidence;

			if (typeof confidence !== 'number' || !Number.isFinite(confidence) || confidence < 0 || confidence > 1)
				throw new TempoAiError(`Provider ${providerId} returned invalid confidence score.`, 422);

			return {
				data: {
					timeZone,
					locale,
					calendar,
					sphere,
					reasoning: typeof parsedData?.reasoning === 'string' ? parsedData.reasoning : undefined,
				},
				providerId,
				rateLimits,
				confidence,
				consensusKey: `${timeZone}::${locale}::${calendar}::${sphere}`,
			}
		},
		{ minConfidence: effectiveMinConfidence, debug: isDebug, tag: 'tempo-plugin-ai:context', hedgeDelay: effectiveHedgeDelay },
	);

	_state.limits = winningCandidate.rateLimits ?? null;

	const { data: parsedData, providerId, rateLimits } = winningCandidate;
	const confidence = typeof winningCandidate.confidence === 'number' ? winningCandidate.confidence : 1.0;
	const reasoning = parsedData.reasoning;

	if (effectiveMinConfidence !== undefined && confidence < effectiveMinConfidence)
		throw new TempoAiError(`Inferred context confidence (${confidence}) is below the required threshold of ${effectiveMinConfidence}.`, 422);

	// Validate IANA timezone
	try {
		Intl.DateTimeFormat(undefined, { timeZone: parsedData.timeZone });
	} catch {
		throw new TempoAiError(`Inferred context returned an invalid or unsupported IANA timeZone: '${parsedData.timeZone}'`, 422);
	}

	const finalResult: TempoContext = {
		timeZone: parsedData.timeZone,
		locale: parsedData.locale,
		calendar: parsedData.calendar,
		sphere: parsedData.sphere,
		confidence,
		provider: providerId,
		reasoning,
	};

	if (aiCacheOption !== false) {
		const providerTtl = providerId === AiMode.Consensus
			? availableProviders.reduce<number | undefined>((min, p) => p.ttl === undefined ? min : (min === undefined ? p.ttl : Math.min(min, p.ttl)), undefined)
			: availableProviders.find(p => p.id === providerId)?.ttl;
		const resolvedTtl = ttl ?? providerTtl ?? _state.config.ttl ?? 86_400_000; // Default to 24 hours for context

		const cacheVal = JSON.stringify({
			timeZone: finalResult.timeZone,
			locale: finalResult.locale,
			calendar: finalResult.calendar,
			sphere: finalResult.sphere,
			confidence: finalResult.confidence,
			reasoning: finalResult.reasoning,
		});

		if (adapter) {
			try {
				const res = adapter.set(cacheKey, cacheVal, resolvedTtl);
				if (res instanceof Promise) await res;
			} catch (err: any) {
				if (isDebug) console.log('[tempo-plugin-ai:context] Cache adapter write error:', err?.message);
			}
		}
		Tempo.cache.set(cacheKey, cacheVal);
	}

	return finalResult;
}

/**
 * ## contextAI
 * Infers regional and calendar settings (`timeZone`, `locale`, `calendar`, `sphere`) from ambiguous text,
 * user bios, or geographic descriptions using the configured AI provider farm.
 *
 * Supports single strings or batch arrays, hierarchical TTL/caching, execution modes (Fallback, Race, Consensus),
 * and dynamic environment variable fallbacks.
 *
 * @param input - A geographic description, user bio, or context string (or an array of strings for batch resolution)
 * @param options - Optional configuration including provider overrides, timeout, caching, and execution modes
 * @returns Promise resolving to a TempoContext object (or an array of TempoContexts / TempoAiErrors for batch requests)
 * @example
 * ```ts
 * const context = await contextAI('We are meeting near Shibuya Crossing in Tokyo');
 * console.log(context.timeZone); // 'Asia/Tokyo'
 * console.log(context.locale); // 'ja-JP'
 * console.log(context.sphere); // 'north'
 * ```
 */
export async function contextAI(input: string, options?: AiContextOptions): Promise<TempoContext>;
export async function contextAI(input: string[], options?: AiContextOptions): Promise<(TempoContext | TempoAiError)[]>;
export async function contextAI(
	input: string | string[],
	options?: AiContextOptions,
): Promise<TempoContext | (TempoContext | TempoAiError)[]> {
	if (Array.isArray(input)) {
		if (options?.softErrors) {
			const settled = await Promise.allSettled(input.map(str => contextSingleInput(str, options)));
			return settled.map(s => s.status === 'fulfilled' ? s.value : (s.reason as TempoAiError));
		}
		return Promise.all(input.map(str => contextSingleInput(str, options)));
	}

	return contextSingleInput(input, options);
}
