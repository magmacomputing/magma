import { Tempo } from '@magmacomputing/tempo';
import { asNumber, asText, isDefined, isObject, isReference, isText, secure, when } from '@magmacomputing/tempo/library';
import { TempoAiError } from '../core/error.js';
import { executeWithMode } from '../core/dispatch.js';
import {
	normalizeCacheInput,
	readMultiTierCache,
	writeMultiTierCache,
} from '../core/cache.js';
import {
	getAvailableProviders,
	parseJsonPayload,
	executeBatch,
	fetchFromProvider,
	resolveProviderTtl,
	resolveFullContext,
	resolveAnchorTempo,
	resolveExecutionOptions,
	sanitizeConfidence,
	assertMinConfidenceThreshold,
} from '../core/support.js';
import { logDebug, warnDebug, attachCustomInspect, sanitizeInspectAiMeta } from '../core/logger.js';
import type { AiFormatOptions, FormatItem, TempoAiFormatResult, TempoDateInput } from '../types/format.type.js';

export type { AiFormatOptions, FormatItem, TempoAiFormatResult, TempoDateInput };

interface FormatGroundingMetrics {
	iso: string;
	timeZone: string;
	dayOfWeek: string;
	dayOfWeekOrdinal: number;
	calendarDays: number;
	elapsedHours: number;
	direction: 'past' | 'present' | 'future';
}

function calculateFormatGroundingMetrics(targetTempo: Tempo, anchorTempo: Tempo): FormatGroundingMetrics {
	const iso = targetTempo.format('{yyyy}-{mm}-{dd}T{hh}:{mi}:{ss}');
	const timeZone = targetTempo.tz || 'UTC';
	const dayOfWeekOrdinal = asNumber(targetTempo.dow, 0);
	const weekdayNames = ['', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
	const dayOfWeek = weekdayNames[dayOfWeekOrdinal] || targetTempo.format('{www}');

	const calendarDays = Math.round(anchorTempo.until(targetTempo, 'day') * 100) / 100;
	const elapsedHours = Math.round(anchorTempo.until(targetTempo, 'hour') * 100) / 100;

	let direction: 'past' | 'present' | 'future' = 'future';
	if (calendarDays < 0 || elapsedHours < 0) {
		direction = 'past';
	} else if (calendarDays === 0 && elapsedHours === 0) {
		direction = 'present';
	}

	return {
		iso,
		timeZone,
		dayOfWeek,
		dayOfWeekOrdinal,
		calendarDays,
		elapsedHours,
		direction,
	};
}

async function formatSingleInput(
	date: TempoDateInput,
	prompt?: string,
	options?: AiFormatOptions,
): Promise<TempoAiFormatResult> {
	const fallbackTempo = Tempo.isTempo(date) ? date : null;
	const context = resolveFullContext(options, fallbackTempo);
	const { tz, loc } = context;

	let targetTempo: Tempo;
	try {
		targetTempo = Tempo.isTempo(date)
			? (date.tz === tz ? date : date.set({ timeZone: tz }))
			: new Tempo(date as any, { timeZone: tz });
	} catch (err: any) {
		const safeDateRep = isReference(date) ? JSON.stringify(date) : String(date);
		throw new TempoAiError(`Invalid date provided to formatAI: "${safeDateRep}"`, 400, undefined, { cause: err });
	}

	if (!targetTempo.isValid) {
		const safeDateRep = isReference(date) ? JSON.stringify(date) : String(date);
		throw new TempoAiError(`Invalid date provided to formatAI: "${safeDateRep}"`, 400);
	}

	const anchorTempo = resolveAnchorTempo(options?.anchor, context, {
		defaultAnchor: Math.floor(Date.now() / 60_000) * 60_000,
		operationName: 'formatAI',
	});

	const style = asText(options?.style, '');
	const region = asText(options?.region, '');
	const grounding = calculateFormatGroundingMetrics(targetTempo, anchorTempo);

	const promptText = asText(prompt, 'Express this date and time in a clear, human-friendly narrative.');
	const normalizedPrompt = normalizeCacheInput(promptText);

	const {
		force,
		cache: aiCacheOption,
		ttl,
		cacheAdapter,
	} = options || {};

	const cacheKey = `format::${targetTempo.epoch.ms}::${anchorTempo.epoch.ms}::${normalizedPrompt}::${tz}::${loc}::${region}::${style}`;

	const { mode, minConfidence: effectiveMinConfidence, isDebug, executeOptions } = resolveExecutionOptions(options, 'format');

	const cachedVal = await readMultiTierCache(cacheKey, {
		force,
		cache: aiCacheOption,
		cacheAdapter,
		debug: isDebug,
		tag: 'tempo-plugin-ai:format',
	});

	if (cachedVal) {
		try {
			const parsedCache = JSON.parse(cachedVal);
			if (isText(parsedCache?.formatted)) {
				const cachedConfidence = sanitizeConfidence(parsedCache?.confidence, 1.0);

				if (isDefined(effectiveMinConfidence) && cachedConfidence < effectiveMinConfidence) {
					logDebug('tempo-plugin-ai:format', `Cached confidence (${cachedConfidence}) is below minConfidence (${effectiveMinConfidence}), ignoring cache.`, undefined, { debug: isDebug });
				} else {
					const reasoning = asText(parsedCache?.reasoning);
					const cachedResult: TempoAiFormatResult = {
						formatted: parsedCache.formatted,
						confidence: cachedConfidence,
						provider: 'cache',
						reasoning,
					};
					attachCustomInspect(cachedResult, (obj, isProd) => ({
						formatted: obj.formatted,
						...sanitizeInspectAiMeta(obj, isProd),
					}));
					return secure(cachedResult);
				}
			}
		} catch (err: any) {
			warnDebug('tempo-plugin-ai:format', 'Failed to parse cached payload', err, { debug: isDebug });
		}
	}

	const availableProviders = getAvailableProviders(options);

	const systemPrompt = `You are an expert natural language temporal formatting engine.
Generate human-friendly, contextual narrative representations of dates and times based on the grounding context.

Rules:
1. Always return a single, valid JSON object matching the schema below.
2. The "formatted" field must contain the contextual narrative string (e.g., "this Friday at 5:00 PM EDT (in 5 days)", "Tomorrow afternoon at 3:00 PM").
3. Respect the target locale, style, and timezone conventions.
4. "confidence" must be a float between 0.0 and 1.0 representing certainty.
5. "reasoning" should briefly describe how the formatted output was constructed.

Output JSON Schema:
{
  "formatted": "string",
  "confidence": 0.95,
  "reasoning": "string"
}`;

	const contextParts = [
		'Grounding Context:',
		`- Target Date-Time: ${grounding.iso} (${grounding.timeZone})`,
		`- Day of Week: ${grounding.dayOfWeek} (Day ${grounding.dayOfWeekOrdinal})`,
		`- Reference Anchor: ${anchorTempo.format('{yyyy}-{mm}-{dd}T{hh}:{mi}:{ss}')} (${anchorTempo.tz || tz})`,
		`- Relative Delta: ${grounding.calendarDays >= 0 ? '+' : ''}${grounding.calendarDays} calendar days (${grounding.elapsedHours >= 0 ? '+' : ''}${grounding.elapsedHours} hours) in the ${grounding.direction.toUpperCase()}`,
		`- Target Locale: ${loc}`,
	];
	if (style) contextParts.push(`- Desired Style/Tone: ${style}`);
	if (region) contextParts.push(`- Regional Context: ${region}`);
	contextParts.push(`- Formatting Instructions: "${promptText}"`);
	const contextString = contextParts.join('\n');

	const winningCandidate = await executeWithMode(
		mode,
		availableProviders,
		async (provider, signal) => {
			const { rawContent, providerId, rateLimits } = await fetchFromProvider(
				provider,
				promptText,
				contextString,
				{ ...options, signal, systemPrompt },
			);

			const parsedData = parseJsonPayload<any>(rawContent, providerId);

			if (!isObject(parsedData))
				throw new TempoAiError(`Provider ${providerId} returned non-object JSON payload.`, 422);

			const formatted = asText(parsedData?.formatted);
			if (!formatted)
				throw new TempoAiError(`Provider ${providerId} returned empty formatted string.`, 422);

			const confidence = sanitizeConfidence(parsedData?.confidence);
			const reasoning = asText(parsedData?.reasoning);

			return {
				data: {
					formatted,
					reasoning,
				},
				providerId,
				rateLimits,
				confidence,
				consensusKey: formatted.toLowerCase(),
			};
		},
		executeOptions,
	);

	const { data: parsedData, providerId } = winningCandidate;
	const confidence = sanitizeConfidence(winningCandidate.confidence);
	assertMinConfidenceThreshold(confidence, effectiveMinConfidence, 'formatAI');

	const finalResult: TempoAiFormatResult = {
		formatted: parsedData.formatted,
		confidence,
		provider: providerId,
		reasoning: parsedData.reasoning,
	};

	const resolvedTtl = resolveProviderTtl(providerId, availableProviders, ttl, 86_400_000);
	const cacheVal = JSON.stringify(finalResult);
	await writeMultiTierCache(cacheKey, cacheVal, resolvedTtl, {
		cache: aiCacheOption,
		cacheAdapter,
		debug: isDebug,
		tag: 'tempo-plugin-ai:format',
	});

	attachCustomInspect(finalResult, (obj, isProd) => ({
		formatted: obj.formatted,
		...sanitizeInspectAiMeta(obj, isProd),
	}));

	return secure(finalResult);
}

/**
 * ## formatAI
 * Formats a `Tempo` instance, Temporal object, Date, or timestamp into human-friendly, contextual narrative text 
 * tailored to specific UI tones, relative time frames, or business domains.
 * 
 * ### Why it fits Tempo:
 * Expands core `.format('{yyyy}-{mm}-{dd}')` into contextual, localized human 
 * descriptions that token patterns alone cannot capture, backed by mathematical grounding.
 * 
 * ### Example Usage:
 * ```ts
 * const t = new Tempo('2026-08-07T17:00:00[America/New_York]');
 * 
 * // "this Friday at 5:00 PM EDT (in 5 days)"
 * const result = await formatAI(t, 'friendly reminder tone with relative countdown');
 * console.log(result.formatted);
 * ```
 */
export async function formatAI(items: FormatItem[], options?: AiFormatOptions): Promise<(TempoAiFormatResult | TempoAiError)[]>;
export async function formatAI(date: TempoDateInput, prompt?: string, options?: AiFormatOptions): Promise<TempoAiFormatResult>;
export async function formatAI(
	dateOrItems: TempoDateInput | FormatItem[],
	promptOrOptions?: string | AiFormatOptions,
	options?: AiFormatOptions,
): Promise<TempoAiFormatResult | (TempoAiFormatResult | TempoAiError)[]> {
	if (Array.isArray(dateOrItems)) {
		const opts = when(promptOrOptions, isObject<AiFormatOptions>, options) || {};
		return executeBatch(
			dateOrItems,
			item => formatSingleInput(item.date, item.prompt, item.options ? { ...opts, ...item.options } : opts),
			opts,
		);
	}

	const prompt = asText(promptOrOptions);
	const opts = when(promptOrOptions, isObject<AiFormatOptions>, options);
	return formatSingleInput(dateOrItems, prompt, opts);
}
