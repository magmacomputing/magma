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
import type { AiFormatOptions, FormatItem, TempoAiFormatResult } from '../types/format.type.js';

export type { AiFormatOptions, FormatItem, TempoAiFormatResult };

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
	date: Tempo.DateTime,
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
			: new Tempo(undefined, { timeZone: tz });
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
				const cachedConfidence = typeof parsedCache.confidence === 'number' && Number.isFinite(parsedCache.confidence)
					? parsedCache.confidence
					: 1.0;
				if (effectiveMinConfidence === undefined || cachedConfidence >= effectiveMinConfidence) {
					if (isDebug) console.log(`[tempo-plugin-ai:format] Cache hit: "${cacheKey}" -> ${cachedVal}`);
					return {
						formatted: parsedCache.formatted,
						confidence: cachedConfidence,
						provider: 'cache',
						reasoning: parsedCache.reasoning,
					};
				}
			}
		} catch {
			// If cached value is corrupted, proceed to fetch
		}
	}

	const availableProviders = providers || _state.config.providers;
	if (!availableProviders || availableProviders.length === 0) {
		throw new TempoAiError('No AI providers configured. Please call initAI().', 400);
	}

	assertNoReservedProviderId(availableProviders);

	const mode = aiMode || _state.config.mode || AiMode.Fallback;

	const contextString = `Grounding Context:
- Target Date-Time: ${grounding.iso} (${grounding.timeZone})
- Day of Week: ${grounding.dayOfWeek} (Day ${grounding.dayOfWeekOrdinal})
- Reference Anchor: ${anchorTempo.format('{yyyy}-{mm}-{dd}T{hh}:{mi}:{ss}')} (${anchorTempo.tz || tz})
- Relative Delta: ${grounding.calendarDays >= 0 ? '+' : ''}${grounding.calendarDays} calendar days (${grounding.elapsedHours >= 0 ? '+' : ''}${grounding.elapsedHours} hours) in the ${grounding.direction.toUpperCase()}
- Target Locale: ${loc}
${style ? `- Desired Style/Tone: ${style}` : ''}
${region ? `- Regional Context: ${region}` : ''}
- Formatting Instructions: "${promptText}"`;

	const systemPrompt = `You are a high-performance narrative date formatter. Your task is to format the given Target Date-Time according to the Formatting Instructions, Style, and Target Locale, strictly respecting the mathematical Grounding Context provided. Return ONLY a valid JSON object matching this schema:
{
  "formatted": "Contextual narrative string (e.g. 'this Friday at 5:00 PM EST (in 2 days)')",
  "confidence": 0.98,
  "reasoning": "Brief explanation of how the narrative reflects the grounding context and prompt."
}

Rules:
- Never hallucinate the weekday, date, or relative offset; adhere strictly to the Grounding Context.
- Apply the requested tone/style and locale conventions.
- Confidence must be a float between 0.0 and 1.0.
- Do not include markdown blocks or any text outside the JSON.`;

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

			const formatted = typeof parsedData?.formatted === 'string' ? parsedData.formatted.trim() : '';
			if (!formatted) {
				throw new TempoAiError(`Provider ${providerId} returned empty formatted string.`, 422);
			}

			const confidence = typeof parsedData?.confidence === 'number' && Number.isFinite(parsedData.confidence)
				? parsedData.confidence
				: 0.9;
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
	const confidence = typeof winningCandidate.confidence === 'number' && Number.isFinite(winningCandidate.confidence)
		? winningCandidate.confidence
		: 0.9;

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
export async function formatAI(date: Tempo.DateTime, prompt?: string, options?: AiFormatOptions): Promise<TempoAiFormatResult>;
export async function formatAI(
	dateOrItems: Tempo.DateTime | FormatItem[],
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
