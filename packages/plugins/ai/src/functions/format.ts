import { Tempo } from '@magmacomputing/tempo';
import { TempoAiError } from '../core/error.js';
import { AiMode } from '../core/config.js';
import { _state } from '../core/init.js';
import { executeWithMode } from '../core/dispatch.js';
import {
	assertNoReservedProviderId,
	fetchFromProvider,
	normalizeCacheInput,
	readMultiTierCache,
	resolveProviderTtl,
	resolveTzAndLocale,
	writeMultiTierCache,
} from '../core/support.js';
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
	const dayOfWeekOrdinal = targetTempo.dow;
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
	const isDebug = options?.debug ?? _state.config.debug ?? false;
	const { tz, loc } = resolveTzAndLocale(options, Tempo.isTempo(date) ? date : null);

	let targetTempo: Tempo;
	try {
		targetTempo = Tempo.isTempo(date)
			? (date.tz === tz ? date : date.set({ timeZone: tz }))
			: new Tempo(date as any, { timeZone: tz });
	} catch (err: any) {
		throw new TempoAiError(`Invalid date provided to formatAI: "${String(date)}"`, 400);
	}

	if (!targetTempo.isValid) {
		throw new TempoAiError(`Invalid date provided to formatAI: "${String(date)}"`, 400);
	}

	const anchor = options?.anchor;
	let anchorTempo: Tempo;
	try {
		anchorTempo = anchor !== undefined
			? (Tempo.isTempo(anchor)
				? (anchor.tz === tz ? anchor : anchor.set({ timeZone: tz }))
				: new Tempo(anchor as any, { timeZone: tz }))
			: new Tempo(Math.floor(Date.now() / 60_000) * 60_000, { timeZone: tz });
	} catch (err: any) {
		throw new TempoAiError(`Invalid anchor date provided to formatAI: "${String(anchor)}"`, 400);
	}

	if (!anchorTempo.isValid) {
		throw new TempoAiError(`Invalid anchor date provided to formatAI: "${String(anchor)}"`, 400);
	}

	const style = options?.style ? String(options.style).trim() : '';
	const region = options?.region ? String(options.region).trim() : '';
	const grounding = calculateFormatGroundingMetrics(targetTempo, anchorTempo);

	const promptText = prompt?.trim() || 'Express this date and time in a clear, human-friendly narrative.';
	const normalizedPrompt = normalizeCacheInput(promptText);

	const {
		force,
		mode: aiMode,
		providers,
		minConfidence,
		cache: aiCacheOption,
		timeout: callTimeout,
		ttl,
		cacheAdapter,
		hedgeDelay,
	} = options || {};

	const cacheKey = `format::${targetTempo.epoch.ms}::${anchorTempo.epoch.ms}::${normalizedPrompt}::${tz}::${loc}::${region}::${style}`;
	const adapter = cacheAdapter ?? _state.config.cacheAdapter;

	const effectiveMinConfidence = minConfidence ?? _state.config.minConfidence;
	const effectiveHedgeDelay = hedgeDelay ?? _state.config.hedgeDelay;

	const cachedVal = await readMultiTierCache(cacheKey, {
		force,
		cache: aiCacheOption,
		cacheAdapter: adapter,
		debug: isDebug,
		tag: 'tempo-plugin-ai:format',
	});

	if (cachedVal) {
		try {
			const parsedCache = JSON.parse(cachedVal);
			if (typeof parsedCache?.formatted === 'string' && parsedCache.formatted.trim().length > 0) {
				const cachedConfidence = typeof parsedCache?.confidence === 'number' && Number.isFinite(parsedCache.confidence)
					? Math.max(0.0, Math.min(1.0, parsedCache.confidence))
					: 1.0;

				if (effectiveMinConfidence !== undefined && cachedConfidence < effectiveMinConfidence) {
					if (isDebug) console.log(`[tempo-plugin-ai:format] Cached confidence (${cachedConfidence}) is below minConfidence (${effectiveMinConfidence}), ignoring cache.`);
				} else {
					return {
						formatted: parsedCache.formatted,
						confidence: cachedConfidence,
						provider: 'cache',
						reasoning: parsedCache.reasoning,
					};
				}
			}
		} catch (err: any) {
			if (isDebug) console.warn(`[tempo-plugin-ai:format] Failed to parse cached payload:`, err?.message ?? err);
		}
	}

	const availableProviders = providers || _state.config.providers;
	if (!availableProviders || availableProviders.length === 0) {
		throw new TempoAiError('No AI providers configured. Please call initAI().', 400);
	}

	assertNoReservedProviderId(availableProviders);

	const systemPrompt = `You are an expert natural language temporal formatting engine.
Generate human-friendly, contextual narrative representations of dates and times based on the grounding context.

Grounding Context:
- Target Date-Time: ${grounding.iso} (${tz})
- Target Day of Week: ${grounding.dayOfWeek} (Day ${grounding.dayOfWeekOrdinal})
- Reference Anchor: ${anchorTempo.format('{yyyy}-{mm}-{dd}T{hh}:{mi}:{ss}')} (${tz})
- Relative Time Delta: ${grounding.calendarDays >= 0 ? '+' : ''}${grounding.calendarDays} calendar days (${grounding.elapsedHours >= 0 ? '+' : ''}${grounding.elapsedHours} hours) in the ${grounding.direction.toUpperCase()}
- Target Locale: ${loc}${region ? `\n- Regional Context: ${region}` : ''}${style ? `\n- Desired Style/Tone: ${style}` : ''}

Rules:
1. Always return a single, valid JSON object matching the schema below.
2. The "formatted" field must contain the contextual narrative string (e.g., "this Friday at 5:00 PM EST (in 5 days)", "Tomorrow afternoon at 3:00 PM").
3. Respect the target locale, style, and timezone conventions.
4. "confidence" must be a float between 0.0 and 1.0 representing certainty.
5. "reasoning" should briefly describe how the formatted output was constructed.

Output JSON Schema:
{
  "formatted": "string",
  "confidence": 0.95,
  "reasoning": "string"
}`;

	const contextString = `Grounding Context:
- Target Date-Time: ${grounding.iso} (${grounding.timeZone})
- Day of Week: ${grounding.dayOfWeek} (Day ${grounding.dayOfWeekOrdinal})
- Reference Anchor: ${anchorTempo.format('{yyyy}-{mm}-{dd}T{hh}:{mi}:{ss}')} (${anchorTempo.tz || tz})
- Relative Delta: ${grounding.calendarDays >= 0 ? '+' : ''}${grounding.calendarDays} calendar days (${grounding.elapsedHours >= 0 ? '+' : ''}${grounding.elapsedHours} hours) in the ${grounding.direction.toUpperCase()}
- Target Locale: ${loc}
${style ? `- Desired Style/Tone: ${style}` : ''}
${region ? `- Regional Context: ${region}` : ''}
- Formatting Instructions: "${promptText}"`;

	const mode = aiMode || _state.config.mode || AiMode.Fallback;

	const winningCandidate = await executeWithMode(
		mode,
		availableProviders,
		async (provider, signal) => {
			const { rawContent, providerId, rateLimits } = await fetchFromProvider(
				provider,
				promptText,
				contextString,
				isDebug,
				signal,
				callTimeout,
				systemPrompt,
			);

			let parsedData: any;
			try {
				parsedData = JSON.parse(rawContent);
			} catch (err: any) {
				throw new TempoAiError(`Provider ${providerId} returned invalid JSON: ${err?.message}`, 422);
			}

			if (typeof parsedData !== 'object' || parsedData === null)
				throw new TempoAiError(`Provider ${providerId} returned non-object JSON payload.`, 422);

			const formatted = typeof parsedData?.formatted === 'string' ? parsedData.formatted.trim() : '';
			if (!formatted)
				throw new TempoAiError(`Provider ${providerId} returned empty formatted string.`, 422);

			const rawConfidence = typeof parsedData?.confidence === 'number' && Number.isFinite(parsedData.confidence)
				? parsedData.confidence
				: 0.9;
			const confidence = Math.max(0.0, Math.min(1.0, rawConfidence));
			const reasoning = typeof parsedData?.reasoning === 'string' ? parsedData.reasoning : undefined;

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
		{ minConfidence: effectiveMinConfidence, debug: isDebug, tag: 'tempo-plugin-ai:format', hedgeDelay: effectiveHedgeDelay },
	);

	_state.limits = winningCandidate.rateLimits ?? null;

	const { data: parsedData, providerId } = winningCandidate;
	const rawConfidence = typeof winningCandidate.confidence === 'number' && Number.isFinite(winningCandidate.confidence)
		? winningCandidate.confidence
		: 0.9;
	const confidence = Math.max(0.0, Math.min(1.0, rawConfidence));

	if (effectiveMinConfidence !== undefined && confidence < effectiveMinConfidence) {
		throw new TempoAiError(`formatAI confidence (${confidence}) is below the required threshold of ${effectiveMinConfidence}.`, 422);
	}

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
		cacheAdapter: adapter,
		debug: isDebug,
		tag: 'tempo-plugin-ai:format',
	});

	return finalResult;
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
 * // "this Friday at 5:00 PM EST (in 5 days)"
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
		const opts = (typeof promptOrOptions === 'object' && promptOrOptions !== null ? promptOrOptions : options) || {};
		const softErrors = opts.softErrors ?? false;

		if (softErrors) {
			const settled = await Promise.allSettled(
				dateOrItems.map(item => formatSingleInput(item.date, item.prompt, opts)),
			);
			return settled.map((res, index) => {
				if (res.status === 'fulfilled') return res.value;
				const rawReason = res.reason;
				if (rawReason instanceof TempoAiError) return rawReason;
				return new TempoAiError(
					rawReason?.message || `Failed to format date at index ${index}`,
					typeof rawReason?.status === 'number' ? rawReason.status : 500,
				);
			});
		}

		return Promise.all(dateOrItems.map(item => formatSingleInput(item.date, item.prompt, opts)));
	}

	const prompt = typeof promptOrOptions === 'string' ? promptOrOptions : undefined;
	const opts = typeof promptOrOptions === 'object' && promptOrOptions !== null ? promptOrOptions : options;
	return formatSingleInput(dateOrItems, prompt, opts);
}
