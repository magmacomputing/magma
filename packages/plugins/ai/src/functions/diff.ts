import { Tempo } from '@magmacomputing/tempo';
import { TempoAiError } from '../core/error.js';
import { AiMode } from '../core/config.js';
import { _state } from '../core/init.js';
import { executeWithMode } from '../core/dispatch.js';
import { normalizeCacheInput, fetchFromProvider, assertNoReservedProviderId } from '../core/support.js';
import { RE_MARKDOWN_JSON_PREFIX, RE_MARKDOWN_JSON_SUFFIX } from '../core/patterns.js';
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
	const isDebug = options?.debug ?? _state.config.debug ?? false;
	const resolvedOptions = Tempo.options;
	const tz = String(options?.timeZone || resolvedOptions.timeZone || 'UTC');
	const loc = String(Array.isArray(options?.locale) ? options?.locale[0] : (options?.locale || resolvedOptions.locale || 'en-US'));

	const startTempo = Tempo.isTempo(start) ? start : new Tempo(start, { timeZone: tz });
	const endTempo = Tempo.isTempo(end) ? end : new Tempo(end, { timeZone: tz });

	if (!startTempo.isValid)
		throw new TempoAiError(`Invalid start date provided to diffAI: "${start}"`, 400);
	if (!endTempo.isValid)
		throw new TempoAiError(`Invalid end date provided to diffAI: "${end}"`, 400);

	const holidays = options?.holidays;
	const grounding = calculateGroundingMetrics(startTempo, endTempo, holidays);

	const promptText = prompt?.trim() || 'Provide a natural summary of the temporal difference between these two dates.';
	const normalizedPrompt = normalizeCacheInput(promptText);

	const { force, mode: aiMode, providers, minConfidence, cache: aiCacheOption, timeout: callTimeout, ttl, cacheAdapter, hedgeDelay } = options || {};

	const sortedHolidays = holidays ? [...holidays].sort().join(',') : '';
	const cacheKey = `diff::${startTempo.epoch.ms}::${endTempo.epoch.ms}::${normalizedPrompt}::${tz}::${loc}::${sortedHolidays}`;
	const adapter = cacheAdapter ?? _state.config.cacheAdapter;

	let cachedVal: string | undefined;
	if (!force && aiCacheOption !== false) {
		if (adapter) {
			try {
				const val = await adapter.get(cacheKey);
				if (val) cachedVal = val;
			} catch (err: any) {
				if (isDebug) console.log('[tempo-plugin-ai:diff] Cache adapter read error:', err?.message);
			}
		}

		cachedVal ??= Tempo.cache.get(cacheKey);
	}

	if (cachedVal) {
		if (isDebug) console.log(`[tempo-plugin-ai:diff] Cache hit: "${cacheKey}" -> ${cachedVal}`);
		try {
			const parsedCache = JSON.parse(cachedVal);
			return {
				formatted: parsedCache.formatted,
				days: parsedCache.days ?? grounding.calendarDays,
				hours: parsedCache.hours ?? grounding.elapsedHours,
				businessDays: parsedCache.businessDays ?? grounding.businessDays,
				holidays: parsedCache.holidays ?? (grounding.matchedHolidays.length > 0 ? grounding.matchedHolidays : undefined),
				confidence: 1.0,
				provider: 'cache',
				reasoning: parsedCache.reasoning,
			};
		} catch {
			// If cached value is corrupted, proceed to fetch
		}
	}

	const availableProviders = providers || _state.config.providers;
	if (!availableProviders || availableProviders.length === 0)
		throw new TempoAiError('No AI providers configured. Please call initAI().', 400);

	assertNoReservedProviderId(availableProviders);

	const mode = aiMode || _state.config.mode || AiMode.Fallback;
	const effectiveMinConfidence = minConfidence ?? _state.config.minConfidence;
	const effectiveHedgeDelay = hedgeDelay ?? _state.config.hedgeDelay;

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

			const formatted = typeof parsedData?.formatted === 'string' ? parsedData.formatted.trim() : '';
			if (!formatted)
				throw new TempoAiError(`Provider ${providerId} returned empty or missing 'formatted' text.`, 422);

			const days = typeof parsedData?.days === 'number' ? parsedData.days : grounding.calendarDays;
			const hours = typeof parsedData?.hours === 'number' ? parsedData.hours : grounding.elapsedHours;
			const businessDays = typeof parsedData?.businessDays === 'number' ? parsedData.businessDays : grounding.businessDays;
			const confidence = typeof parsedData?.confidence === 'number' ? parsedData.confidence : 0.9;
			const reasoning = typeof parsedData?.reasoning === 'string' ? parsedData.reasoning : undefined;

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
		{ minConfidence: effectiveMinConfidence, debug: isDebug, tag: 'tempo-plugin-ai:diff', hedgeDelay: effectiveHedgeDelay },
	);

	_state.limits = winningCandidate.rateLimits ?? null;

	const { data: parsedData, providerId } = winningCandidate;
	const confidence = typeof winningCandidate.confidence === 'number' ? winningCandidate.confidence : 0.9;

	if (effectiveMinConfidence !== undefined && confidence < effectiveMinConfidence)
		throw new TempoAiError(`diffAI confidence (${confidence}) is below the required threshold of ${effectiveMinConfidence}.`, 422);

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

	if (aiCacheOption !== false) {
		const providerTtl = providerId === AiMode.Consensus
			? availableProviders.reduce<number | undefined>((min, p) => p.ttl === undefined ? min : (min === undefined ? p.ttl : Math.min(min, p.ttl)), undefined)
			: availableProviders.find(p => p.id === providerId)?.ttl;
		const resolvedTtl = ttl ?? providerTtl ?? _state.config.ttl ?? 86_400_000;

		const cacheVal = JSON.stringify({
			formatted: finalResult.formatted,
			days: finalResult.days,
			hours: finalResult.hours,
			businessDays: finalResult.businessDays,
			holidays: finalResult.holidays,
			reasoning: finalResult.reasoning,
		});

		if (adapter) {
			try {
				const res = adapter.set(cacheKey, cacheVal, resolvedTtl);
				if (res instanceof Promise) await res;
			} catch (err: any) {
				if (isDebug) console.log('[tempo-plugin-ai:diff] Cache adapter write error:', err?.message);
			}
		}
		Tempo.cache.set(cacheKey, cacheVal);
	}

	return finalResult;
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
		if (resolvedOptions.softErrors) {
			const settled = await Promise.allSettled(
				startOrPairs.map(pair => diffSingleInput(pair.start, pair.end, pair.prompt, resolvedOptions))
			);
			return settled.map(s => s.status === 'fulfilled' ? s.value : (s.reason as TempoAiError));
		}
		return Promise.all(
			startOrPairs.map(pair => diffSingleInput(pair.start, pair.end, pair.prompt, resolvedOptions))
		);
	}

	const promptStr = typeof promptOrOptions === 'string' ? promptOrOptions : undefined;
	const resolvedOptions = (typeof promptOrOptions === 'object' ? promptOrOptions : options) || {};

	return diffSingleInput(startOrPairs, endOrOptions, promptStr, resolvedOptions);
}
