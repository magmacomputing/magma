import { asText, isNumber, isString, isDefined, secure, when } from '@magmacomputing/tempo/library';
import { TempoAiError } from '../core/error.js';
import { executeWithMode } from '../core/dispatch.js';
import {
	getNamespacedCacheKey,
	normalizeCacheInput,
	readMultiTierCache,
	writeMultiTierCache,
} from '../core/cache.js';
import {
	getAvailableProviders,
	parseJsonPayload,
	resolveFullContext,
	executeBatch,
	fetchFromProvider,
	resolveProviderTtl,
	resolveExecutionOptions,
	sanitizeConfidence,
	assertMinConfidenceThreshold,
} from '../core/support.js';
import { logDebug, attachCustomInspect, sanitizeInspectAiMeta } from '../core/logger.js';
import type { TempoContext, AiContextOptions } from '../types/index.js';

async function contextSingleInput(text: string, options?: AiContextOptions): Promise<TempoContext> {
	const normalizedStr = normalizeCacheInput(text);

	const { force, cache: aiCacheOption, ttl, cacheAdapter } = options || {};
	const { tz, loc, cal, sph } = resolveFullContext(options);

	const cacheKey = getNamespacedCacheKey('context', `${normalizedStr}::${tz}::${loc}::${cal}::${sph}`);

	const { mode, minConfidence: effectiveMinConfidence, isDebug, executeOptions } = resolveExecutionOptions(options, 'context');

	const cachedVal = await readMultiTierCache(cacheKey, {
		force,
		cache: aiCacheOption,
		cacheAdapter,
		debug: isDebug,
		tag: 'tempo-plugin-ai:context',
	});

	if (cachedVal) {
		try {
			const parsedCache = JSON.parse(cachedVal);
			if (isString(parsedCache.timeZone)) {
				Intl.DateTimeFormat(undefined, { timeZone: parsedCache.timeZone });
				const cachedConfidence = sanitizeConfidence(parsedCache.confidence, 1.0);
				if (isDefined(effectiveMinConfidence) && cachedConfidence < effectiveMinConfidence) {
					logDebug('tempo-plugin-ai:context', `Cached confidence (${cachedConfidence}) is below minConfidence (${effectiveMinConfidence}), ignoring cache.`, undefined, { debug: isDebug });
				} else {
					logDebug('tempo-plugin-ai:context', `Cache hit: "${text}" -> ${cachedVal}`, undefined, { debug: isDebug });
					const cachedResult: TempoContext = {
						timeZone: parsedCache.timeZone,
						locale: parsedCache.locale,
						calendar: parsedCache.calendar,
						sphere: when(parsedCache.sphere, (s): s is 'north' | 'south' => s === 'north' || s === 'south'),
						confidence: cachedConfidence,
						provider: 'cache',
						reasoning: parsedCache.reasoning,
					};
					attachCustomInspect(cachedResult, (obj, isProd) => ({
						timeZone: obj.timeZone,
						locale: obj.locale,
						calendar: obj.calendar,
						sphere: obj.sphere,
						...sanitizeInspectAiMeta(obj, isProd),
					}));
					return secure(cachedResult);
				}
			}
		} catch {
			// If cached value is corrupted, invalid, or fails timezone validation, proceed to fetch
		}
	}

	const contextString = `Workstation baseline context - Timezone: ${tz}, Locale: ${loc}, Calendar: ${cal}, Hemisphere: ${sph}. Use these baseline settings as the default if the input text contains no geographic or regional clues.`;

	const availableProviders = getAvailableProviders(options);

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
				{ ...options, signal, systemPrompt },
			);
			const parsedData = parseJsonPayload(rawContent, providerId);

			const timeZone = asText(parsedData?.timeZone, '');
			const locale = asText(parsedData?.locale, '');
			const calendar = asText(parsedData?.calendar, 'gregory');
			const rawSphere = asText(parsedData?.sphere)?.toLowerCase();
			const sphere = when(rawSphere, (s): s is 'north' | 'south' => s === 'north' || s === 'south');
			const confidence = parsedData?.confidence;

			if (!isNumber(confidence) || confidence < 0 || confidence > 1)
				throw new TempoAiError(`Provider ${providerId} returned invalid confidence score.`, 422);

			return {
				data: {
					timeZone,
					locale,
					calendar,
					sphere,
					reasoning: asText(parsedData?.reasoning),
				},
				providerId,
				rateLimits,
				confidence,
				consensusKey: `${timeZone}::${locale}::${calendar}::${sphere}`,
			};
		},
		executeOptions,
	);

	const { data: parsedData, providerId } = winningCandidate;
	const confidence = sanitizeConfidence(winningCandidate.confidence, 1.0);
	const reasoning = parsedData.reasoning;

	assertMinConfidenceThreshold(confidence, effectiveMinConfidence, 'Inferred context');

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

	const resolvedTtl = resolveProviderTtl(providerId, availableProviders, ttl, 86_400_000);
	const cacheVal = JSON.stringify({
		timeZone: finalResult.timeZone,
		locale: finalResult.locale,
		calendar: finalResult.calendar,
		sphere: finalResult.sphere,
		confidence: finalResult.confidence,
		reasoning: finalResult.reasoning,
	});

	await writeMultiTierCache(cacheKey, cacheVal, resolvedTtl, {
		cache: aiCacheOption,
		cacheAdapter,
		debug: isDebug,
		tag: 'tempo-plugin-ai:context',
	});

	attachCustomInspect(finalResult, (obj, isProd) => ({
		timeZone: obj.timeZone,
		locale: obj.locale,
		calendar: obj.calendar,
		sphere: obj.sphere,
		...sanitizeInspectAiMeta(obj, isProd),
	}));

	return secure(finalResult);
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
	if (Array.isArray(input))
		return executeBatch(input, str => contextSingleInput(str, options), options);

	return contextSingleInput(input, options);
}
