import { Tempo } from '@magmacomputing/tempo';
import { asText, isDefined, isNumber, isObject, isText, secure, when } from '@magmacomputing/tempo/library';
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
	executeBatch,
	fetchFromProvider,
	resolveProviderTtl,
	resolveTzAndLocale,
	resolveExecutionOptions,
	sanitizeConfidence,
	assertMinConfidenceThreshold,
} from '../core/support.js';
import { logDebug, attachCustomInspect, sanitizeInspectAiMeta } from '../core/logger.js';
import type { TempoAiDiffResult, AiDiffOptions, DiffPair } from '../types/index.js';

/**
 * Calculates raw difference metrics and business days between two Tempo points.
 */
function calculateGroundingMetrics(startTempo: Tempo, endTempo: Tempo, holidays?: string[]) {
	const calendarDays = Math.round(startTempo.until(endTempo, 'day') * 100) / 100;
	const elapsedHours = Math.round(startTempo.until(endTempo, 'hour') * 100) / 100;

	const isReverse = startTempo.epoch.ms > endTempo.epoch.ms;
	const from = isReverse ? endTempo : startTempo;
	const to = isReverse ? startTempo : endTempo;

	const holidaySet = new Set<string>(holidays ?? []);
	const matchedHolidays: string[] = [];

	let curr = from.set({ start: 'day' });
	const limit = to.set({ start: 'day' });
	let businessDaysCount = 0;

	while (curr.epoch.ms < limit.epoch.ms) {
		const dow = curr.dow; // 1 = Monday, 7 = Sunday
		const dateStr = curr.format('{yyyy}-{mm}-{dd}');
		const isWeekend = dow === 6 || dow === 7;
		const isHoliday = holidaySet.has(dateStr);

		if (isHoliday) matchedHolidays.push(dateStr);

		if (!isWeekend && !isHoliday) businessDaysCount++;

		curr = curr.add({ day: 1 });
	}

	const businessDays = isReverse ? -businessDaysCount : businessDaysCount;

	return {
		calendarDays,
		elapsedHours,
		businessDays,
		isReverse,
		matchedHolidays,
	};
}

async function diffSingleInput(
	start: any,
	end: any,
	prompt?: string,
	options?: AiDiffOptions,
): Promise<TempoAiDiffResult> {
	const fallbackTempo = Tempo.isTempo(start) ? start : (Tempo.isTempo(end) ? end : null);
	const { tz, loc } = resolveTzAndLocale(options, fallbackTempo);

	const startTempo = Tempo.isTempo(start) ? (start.tz === tz ? start : start.set({ timeZone: tz })) : new Tempo(start, { timeZone: tz });
	const endTempo = Tempo.isTempo(end) ? (end.tz === tz ? end : end.set({ timeZone: tz })) : new Tempo(end, { timeZone: tz });

	if (!startTempo.isValid)
		throw new TempoAiError(`Invalid start date provided to diffAI: "${start}"`, 400);
	if (!endTempo.isValid)
		throw new TempoAiError(`Invalid end date provided to diffAI: "${end}"`, 400);

	const holidays = options?.holidays;
	const region = String(options?.region || '');
	const grounding = calculateGroundingMetrics(startTempo, endTempo, holidays);

	const promptText = asText(prompt, 'Provide a natural summary of the temporal difference between these two dates.');
	const normalizedPrompt = normalizeCacheInput(promptText);

	const { force, cache: aiCacheOption, ttl, cacheAdapter } = options || {};

	const sortedHolidays = holidays ? [...holidays].sort().join(',') : '';
	const cacheKey = getNamespacedCacheKey('diff', `${startTempo.epoch.ms}::${endTempo.epoch.ms}::${normalizedPrompt}::${tz}::${loc}::${region}::${sortedHolidays}`);

	const { mode, minConfidence: effectiveMinConfidence, isDebug, executeOptions } = resolveExecutionOptions(options, 'diff');

	const cachedVal = await readMultiTierCache(cacheKey, {
		force,
		cache: aiCacheOption,
		cacheAdapter,
		debug: isDebug,
		tag: 'tempo-plugin-ai:diff',
	});

	if (cachedVal) {
		try {
			const parsedCache = JSON.parse(cachedVal);
			if (isText(parsedCache?.formatted)) {
				const cachedConfidence = sanitizeConfidence(parsedCache.confidence, 0.9);
				if (isDefined(effectiveMinConfidence) && cachedConfidence < effectiveMinConfidence) {
					logDebug('tempo-plugin-ai:diff', `Cached confidence (${cachedConfidence}) is below minConfidence (${effectiveMinConfidence}), ignoring cache.`, undefined, { debug: isDebug });
				} else {
					const cachedResult: TempoAiDiffResult = {
						formatted: parsedCache.formatted,
						days: parsedCache.days ?? grounding.calendarDays,
						hours: parsedCache.hours ?? grounding.elapsedHours,
						businessDays: parsedCache.businessDays ?? grounding.businessDays,
						holidays: parsedCache.holidays ?? (grounding.matchedHolidays.length > 0 ? grounding.matchedHolidays : undefined),
						confidence: cachedConfidence,
						provider: 'cache',
						reasoning: parsedCache.reasoning,
					};
					attachCustomInspect(cachedResult, (obj, isProd) => ({
						formatted: obj.formatted,
						days: obj.days,
						hours: obj.hours,
						businessDays: obj.businessDays,
						...(obj.holidays ? { holidays: obj.holidays } : {}),
						...sanitizeInspectAiMeta(obj, isProd),
					}));
					return secure(cachedResult);
				}
			}
		} catch {
			// If cached value is corrupted, proceed to fetch
		}
	}

	const availableProviders = getAvailableProviders(options);

	const contextString = `Grounding Context:
- Start Timestamp: ${startTempo.format('{yyyy}-{mm}-{dd}T{hh}:{mi}:{ss}')} (${startTempo.tz || tz})
- End Timestamp: ${endTempo.format('{yyyy}-{mm}-{dd}T{hh}:{mi}:{ss}')} (${endTempo.tz || tz})
- Direction: ${grounding.isReverse ? 'Past/Backward (End is earlier than Start)' : 'Future/Forward (Start is earlier than End)'}
- Computed Calendar Days: ${grounding.calendarDays}
- Computed Calendar Hours: ${grounding.elapsedHours}
- Computed Business Working Days: ${grounding.businessDays} (excluding weekends${holidays && holidays.length > 0 ? ' and specified holidays' : ''})
${grounding.matchedHolidays.length > 0 ? `- Matching Excluded Holidays: ${grounding.matchedHolidays.join(', ')}` : ''}
${options?.region ? `- Region Context: ${options.region}` : ''}
- Target Locale: ${loc}
- User Instructions / Request: "${promptText}"`;

	const systemPrompt = `You are an expert temporal difference and natural language formatting engine.
Analyze the two timestamps and the pre-computed mathematical grounding metrics to express the difference according to the user's instructions.
Return ONLY a valid JSON object matching this exact schema:
{
  "formatted": "Concise, human-friendly natural summary of the difference according to the prompt instructions",
  "days": ${grounding.calendarDays},
  "hours": ${grounding.elapsedHours},
  "businessDays": ${grounding.businessDays},
  "reasoning": "Step-by-step rationale for the formatting and tone",
  "confidence": 0.95
}
Rules:
- "formatted": Must directly fulfill the user's prompt (e.g. accounting terms, working days, human relative explanation, or business SLAs).
- "confidence": Float score between 0.0 (highly ambiguous) and 1.0 (certain).
- Do not contradict the pre-computed grounding metrics unless explicitly instructed otherwise.
Do not include markdown blocks or text outside the JSON.`;

	const winningCandidate = await executeWithMode<any>(
		mode,
		availableProviders,
		async (provider, signal) => {
			const { rawContent, providerId, rateLimits } = await fetchFromProvider(
				provider,
				promptText,
				contextString,
				{ ...options, signal, systemPrompt },
			);
			const parsedData = parseJsonPayload(rawContent, providerId);

			const formatted = asText(parsedData?.formatted);
			if (!formatted)
				throw new TempoAiError(`Provider ${providerId} returned empty or missing 'formatted' text.`, 422);

			const days = grounding.calendarDays;
			const hours = grounding.elapsedHours;
			const businessDays = grounding.businessDays;
			const confidence = sanitizeConfidence(parsedData?.confidence);
			const reasoning = asText(parsedData?.reasoning);

			return {
				data: {
					formatted,
					days,
					hours,
					businessDays,
					reasoning,
				},
				providerId,
				rateLimits,
				confidence,
				consensusKey: `${formatted}::${businessDays}`,
			};
		},
		executeOptions,
	);

	const { data: parsedData, providerId } = winningCandidate;
	const confidence = sanitizeConfidence(winningCandidate.confidence);
	assertMinConfidenceThreshold(confidence, effectiveMinConfidence, 'diffAI');

	const finalResult: TempoAiDiffResult = {
		formatted: parsedData.formatted,
		days: parsedData.days,
		hours: parsedData.hours,
		businessDays: parsedData.businessDays,
		holidays: grounding.matchedHolidays.length > 0 ? grounding.matchedHolidays : undefined,
		confidence,
		provider: providerId,
		reasoning: parsedData.reasoning,
	};

	const resolvedTtl = resolveProviderTtl(providerId, availableProviders, ttl, 86_400_000);
	const cacheVal = JSON.stringify({
		formatted: finalResult.formatted,
		days: finalResult.days,
		hours: finalResult.hours,
		businessDays: finalResult.businessDays,
		holidays: finalResult.holidays,
		confidence: finalResult.confidence,
		reasoning: finalResult.reasoning,
	});

	await writeMultiTierCache(cacheKey, cacheVal, resolvedTtl, {
		cache: aiCacheOption,
		cacheAdapter,
		debug: isDebug,
		tag: 'tempo-plugin-ai:diff',
	});

	attachCustomInspect(finalResult, (obj, isProd) => ({
		formatted: obj.formatted,
		days: obj.days,
		hours: obj.hours,
		businessDays: obj.businessDays,
		...(obj.holidays ? { holidays: obj.holidays } : {}),
		...sanitizeInspectAiMeta(obj, isProd),
	}));

	return secure(finalResult);
}

/**
 * ## diffAI
 * Calculates and expresses the temporal delta between two `Tempo` instances, dates, or timestamps
 * in human, business, or domain-specific language.
 *
 * Utilizes pre-computed grounding metrics (calendar days, total hours, business days with weekend & holiday exclusion)
 * to provide reliable arithmetic backing for the LLM formatting.
 *
 * @param start - Start date-time point (Tempo instance, Date, ISO string, or timestamp)
 * @param end - End date-time point (Tempo instance, Date, ISO string, or timestamp)
 * @param prompt - Formatting instruction or explanation goal (e.g. 'explain in working business days')
 * @param options - Configuration options (holidays, timeZone, locale, execution mode, caching, minConfidence)
 * @returns Promise resolving to TempoAiDiffResult
 *
 * @example
 * ```ts
 * const start = new Tempo('2026-08-01T09:00:00Z');
 * const end = new Tempo('2026-08-10T17:00:00Z');
 *
 * const result = await diffAI(start, end, 'explain in terms of business working days');
 * console.log(result.formatted); // '5 business days (or ~224 calendar hours)'
 * console.log(result.businessDays); // 5
 * ```
 */
export async function diffAI(pairs: DiffPair[], options?: AiDiffOptions): Promise<(TempoAiDiffResult | TempoAiError)[]>;
export async function diffAI(start: any, end: any, prompt?: string, options?: AiDiffOptions): Promise<TempoAiDiffResult>;
export async function diffAI(
	startOrPairs: any,
	endOrOptions?: any,
	promptOrOptions?: string | AiDiffOptions,
	options?: AiDiffOptions,
): Promise<TempoAiDiffResult | (TempoAiDiffResult | TempoAiError)[]> {
	if (Array.isArray(startOrPairs)) {
		const resolvedOptions = (endOrOptions as AiDiffOptions) || {};
		return executeBatch(
			startOrPairs,
			pair => diffSingleInput(pair?.start, pair?.end, pair?.prompt, resolvedOptions),
			resolvedOptions,
		);
	}

	const promptStr = asText(promptOrOptions);
	const resolvedOptions = when(promptOrOptions, isObject<AiDiffOptions>, options) || {};

	return diffSingleInput(startOrPairs, endOrOptions, promptStr, resolvedOptions);
}
