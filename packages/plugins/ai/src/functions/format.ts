import { Tempo } from '@magmacomputing/tempo';
import { secure } from '@magmacomputing/tempo/library';
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
		const safeDateRep = typeof date === 'object' && date !== null ? JSON.stringify(date) : String(date);
		throw new TempoAiError(`Invalid date provided to formatAI: "${safeDateRep}"`, 400, undefined, { cause: err });
	}

	if (!targetTempo.isValid) {
		const safeDateRep = typeof date === 'object' && date !== null ? JSON.stringify(date) : String(date);
		throw new TempoAiError(`Invalid date provided to formatAI: "${safeDateRep}"`, 400);
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
		const safeAnchorRep = typeof anchor === 'object' && anchor !== null ? JSON.stringify(anchor) : String(anchor);
		throw new TempoAiError(`Invalid anchor date provided to formatAI: "${safeAnchorRep}"`, 400, undefined, { cause: err });
	}

	if (!anchorTempo.isValid) {
		const safeAnchorRep = typeof anchor === 'object' && anchor !== null ? JSON.stringify(anchor) : String(anchor);
		throw new TempoAiError(`Invalid anchor date provided to formatAI: "${safeAnchorRep}"`, 400);
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
	if (
		effectiveMinConfidence !== undefined &&
		(typeof effectiveMinConfidence !== 'number' ||
			!Number.isFinite(effectiveMinConfidence) ||
			effectiveMinConfidence < 0.0 ||
			effectiveMinConfidence > 1.0)
	) {
		throw new TempoAiError(`Invalid minConfidence provided to formatAI: "${String(effectiveMinConfidence)}"`, 400);
	}

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
					const reasoning = typeof parsedCache?.reasoning === 'string' ? parsedCache.reasoning : undefined;
					return secure({
						formatted: parsedCache.formatted,
						confidence: cachedConfidence,
						provider: 'cache',
						reasoning,
					});
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
			}
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
	}

	const resolvedTtl = resolveProviderTtl(providerId, availableProviders, ttl, 86_400_000);
	const cacheVal = JSON.stringify(finalResult);
	await writeMultiTierCache(cacheKey, cacheVal, resolvedTtl, {
		cache: aiCacheOption,
		cacheAdapter: adapter,
		debug: isDebug,
		tag: 'tempo-plugin-ai:format',
	});

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
		if (dateOrItems.length === 0) return [];
		const opts = (typeof promptOrOptions === 'object' && promptOrOptions !== null ? promptOrOptions : options) || {};
		const softErrors = opts.softErrors ?? false;
		const concurrencyLimit = Math.max(1, Math.min(opts.concurrency ?? 4, dateOrItems.length));

		const results: (TempoAiFormatResult | TempoAiError)[] = new Array(dateOrItems.length);
		let nextIdx = 0;
		let firstError: any = null;

		const worker = async () => {
			while (nextIdx < dateOrItems.length) {
				if (!softErrors && firstError) break;
				const currentIndex = nextIdx++;
				const item = dateOrItems[currentIndex];
				const itemOpts = item.options ? { ...opts, ...item.options } : opts;
				try {
					const res = await formatSingleInput(item.date, item.prompt, itemOpts);
					results[currentIndex] = res;
				} catch (err: any) {
					if (softErrors) {
						results[currentIndex] = err instanceof TempoAiError
							? err
							: new TempoAiError(
								err?.message || `Failed to format date at index ${currentIndex}`,
								typeof err?.status === 'number' ? err.status : 500,
							);
					} else {
						if (!firstError) firstError = err;
						break;
					}
				}
			}
		};

		const workers = Array.from({ length: concurrencyLimit }, () => worker());
		await Promise.all(workers);

		if (!softErrors && firstError) {
			throw firstError;
		}

		return results;
	}

	const prompt = typeof promptOrOptions === 'string' ? promptOrOptions : undefined;
	const opts = typeof promptOrOptions === 'object' && promptOrOptions !== null ? promptOrOptions : options;
	return formatSingleInput(dateOrItems, prompt, opts);
}
