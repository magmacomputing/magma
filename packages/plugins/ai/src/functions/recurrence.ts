import { Tempo } from '@magmacomputing/tempo';
import { isRRuleString, isFiniteRRule, parseRRule, expandRRuleEpochs } from '@magmacomputing/tempo/library';
import { TempoAiError } from '../core/error.js';
import { AiMode } from '../core/config.js';
import { _state } from '../core/init.js';
import { executeWithMode } from '../core/dispatch.js';
import { fetchFromProvider, assertNoReservedProviderId } from '../core/support.js';
import { RE_MARKDOWN_JSON_PREFIX, RE_MARKDOWN_JSON_SUFFIX, RE_RRULE_PREFIX } from '../core/patterns.js';
import type { TempoRecurrenceOptions, TempoRecurrenceResult } from '../types/index.js';

function expandOccurrences(rrule: string, anchor: Tempo, options?: { count?: number; after?: any; before?: any }): Tempo[] {
	const afterTempo = options?.after ? new Tempo(options.after, anchor.config) : undefined;
	const beforeTempo = options?.before ? new Tempo(options.before, anchor.config) : undefined;
	const epochs = expandRRuleEpochs(rrule, anchor.epoch.ms, {
		count: options?.count,
		afterMs: afterTempo ? afterTempo.epoch.ms : undefined,
		beforeMs: beforeTempo ? beforeTempo.epoch.ms : undefined,
	});

	return epochs.map(ms => new Tempo(ms, anchor.config));
}

function createRecurrenceResult(
	rruleStr: string,
	summaryText: string,
	confidence: number,
	providerId: string,
	reasoning: string | undefined,
	anchorTempo: Tempo,
	defaultBatchSize: number,
	options?: TempoRecurrenceOptions
): TempoRecurrenceResult {
	const rule = parseRRule(rruleStr);
	const hasWindow = Boolean(options?.after || options?.before);
	const isFinite = isFiniteRRule(rruleStr) || Boolean(options?.before);
	let sizeLimit: number;
	if (hasWindow && isFinite) {
		const windowOccurrences = expandOccurrences(rruleStr, anchorTempo, { count: rule.count ?? 1000, after: options?.after, before: options?.before });
		sizeLimit = rule.count !== undefined ? Math.min(rule.count, windowOccurrences.length) : windowOccurrences.length;
	} else if (rule.count !== undefined) {
		sizeLimit = rule.count;
	} else if (isFinite) {
		sizeLimit = expandOccurrences(rruleStr, anchorTempo, { count: 1000, after: options?.after, before: options?.before }).length;
	} else {
		sizeLimit = Number.POSITIVE_INFINITY;
	}

	const cachedOccurrences: Tempo[] = [];
	let offsetCursor = 0;
	let fullyExpanded = false;

	const ensureCached = (neededCount: number): void => {
		if (fullyExpanded || cachedOccurrences.length >= neededCount) return;
		const missingCount = neededCount - cachedOccurrences.length;
		const fetchCount = Math.max(missingCount, cachedOccurrences.length, defaultBatchSize);
		const lastOccurrence = cachedOccurrences.length > 0 ? cachedOccurrences[cachedOccurrences.length - 1] : undefined;
		const fresh = expandOccurrences(rruleStr, anchorTempo, {
			count: fetchCount,
			after: lastOccurrence ?? options?.after,
			before: options?.before,
		});
		cachedOccurrences.push(...fresh);
		if (fresh.length < fetchCount)
			fullyExpanded = true;
	};

	const take = (count?: number): Tempo[] => {
		const fetchCount = count ?? defaultBatchSize;
		if (isFinite && offsetCursor >= sizeLimit) return [];
		const actualCount = isFinite ? Math.min(fetchCount, sizeLimit - offsetCursor) : fetchCount;
		if (actualCount <= 0) return [];

		const needed = offsetCursor + actualCount;
		ensureCached(needed);

		const batch = cachedOccurrences.slice(offsetCursor, offsetCursor + actualCount);
		offsetCursor += batch.length;
		return batch;
	};

	function* createIterator(): Generator<Tempo, void, unknown> {
		let index = 0;
		const maxYield = isFinite ? sizeLimit : defaultBatchSize;
		while (index < maxYield) {
			ensureCached(index + 1);
			if (index >= cachedOccurrences.length) break;
			yield cachedOccurrences[index];
			index++;
		}
	}

	return {
		rrule: rruleStr,
		summary: summaryText,
		isFinite,
		size: sizeLimit,
		take,
		[Symbol.iterator]: () => createIterator(),
		confidence,
		provider: providerId,
		reasoning
	};
}

/**
 * ## recurrenceAI
 * Multi-directional recurrence rule parser and translator.
 * Accepts either a natural language schedule (e.g. "Every 2nd Tuesday of the month at 3pm") 
 * or a raw RFC 5545 RRULE string (e.g. "FREQ=MONTHLY;BYDAY=2TU;BYHOUR=15").
 */
export async function recurrenceAI(
	input: string,
	options?: TempoRecurrenceOptions,
): Promise<TempoRecurrenceResult> {
	const isDebug = options?.debug ?? _state.config.debug ?? false;
	const isRRule = isRRuleString(input);

	// Resolve full Tempo context hierarchy
	const tz = options?.timeZone || (options?.anchor instanceof Tempo ? options.anchor.config.timeZone : undefined) || Tempo.options.timeZone;
	const cal = options?.calendar || (options?.anchor instanceof Tempo ? options.anchor.config.calendar : undefined) || Tempo.options.calendar;
	const loc = options?.locale || (options?.anchor instanceof Tempo ? options.anchor.config.locale : undefined) || Tempo.options.locale;
	const sph = options?.sphere || (options?.anchor instanceof Tempo ? options.anchor.config.sphere : undefined) || Tempo.options.sphere;

	const contextConfig = { timeZone: tz, calendar: cal, locale: loc, sphere: sph };
	const anchorTempo = new Tempo(options?.anchor, contextConfig);
	const defaultBatchSize = options?.count ?? 5;

	if (isRRule) {
		const cleanRRule = input.trim().replace(RE_RRULE_PREFIX, '');
		if (isDebug)
			console.log(`[tempo-plugin-ai:recurrence] Detected raw RRULE string: "${cleanRRule}"`);

		return createRecurrenceResult(
			cleanRRule,
			`Recurring schedule (${cleanRRule})`,
			1.0,
			'rrule-parser',
			'Parsed natively from RFC 5545 RRULE string input.',
			anchorTempo,
			defaultBatchSize,
			options,
		);
	}

	const availableProviders = options?.providers || _state.config.providers;
	if (!availableProviders || availableProviders.length === 0)
		throw new TempoAiError('No AI providers configured. Please call initAI().', 400);

	assertNoReservedProviderId(availableProviders);

	const mode = options?.mode || _state.config.mode || AiMode.Fallback;
	const effectiveMinConfidence = options?.minConfidence ?? _state.config.minConfidence;
	const callTimeout = options?.timeout;
	const contextString = `Current Time: ${anchorTempo.format('{wkd}, {yyyy}-{mm}-{dd} {hh}:{mi}:{ss}')}, Timezone: ${tz}, Calendar: ${cal}, Locale: ${loc}, Hemisphere: ${sph}.`;

	const systemPrompt = `You are a calendar recurrence compiler. Read the user's natural language schedule and context. Return ONLY a valid JSON object matching this exact schema:
{
  "rrule": "Standard RFC 5545 RRULE string without RRULE: prefix (e.g., 'FREQ=WEEKLY;BYDAY=TU;BYHOUR=15')",
  "summary": "Clear, concise human-friendly description localized to locale '${loc}' (e.g., 'Every Tuesday at 15:00')",
  "reasoning": "Step-by-step calendar math explanation",
  "confidence": 0.95
}

Rules:
- Standard RFC 5545 uppercase keys: FREQ (DAILY|WEEKLY|MONTHLY|YEARLY), BYDAY (MO,TU,WE,TH,FR,SA,SU), BYHOUR, BYMINUTE, BYMONTH, BYSETPOS, INTERVAL.
- "confidence": Float score between 0.0 (unparseable) and 1.0 (certain).
Do not include markdown blocks or text outside the JSON.`;

	const winningCandidate = await executeWithMode<any>(
		mode,
		availableProviders,
		async (provider, signal) => {
			const { rawContent, providerId, rateLimits } = await fetchFromProvider(
				provider,
				input,
				contextString,
				isDebug,
				signal,
				callTimeout,
				systemPrompt,
			);
			const cleanContent = rawContent.replace(RE_MARKDOWN_JSON_PREFIX, '').replace(RE_MARKDOWN_JSON_SUFFIX, '');
			const parsedData = JSON.parse(cleanContent);
			const confidence = typeof parsedData?.confidence === 'number' ? parsedData.confidence : 0.9;

			return {
				data: parsedData,
				providerId,
				rateLimits,
				confidence,
				consensusKey: parsedData?.rrule,
			};
		},
		{ minConfidence: effectiveMinConfidence, debug: isDebug, tag: 'tempo-plugin-ai:recurrence', hedgeDelay: options?.hedgeDelay ?? _state.config.hedgeDelay },
	);

	_state.limits = winningCandidate.rateLimits ?? null;

	const { data: parsedData, providerId } = winningCandidate;
	if (typeof parsedData?.rrule !== 'string' || !parsedData.rrule.trim())
		throw new TempoAiError('Invalid recurrence response from AI provider: missing or empty rrule string.', 422);

	const rruleStr = parsedData.rrule.trim();
	const summaryText = typeof parsedData?.summary === 'string' ? parsedData.summary : (typeof parsedData?.humanReadable === 'string' ? parsedData.humanReadable : input);
	const confidence = typeof winningCandidate.confidence === 'number' ? winningCandidate.confidence : 0.9;
	const reasoning = typeof parsedData?.reasoning === 'string' ? parsedData.reasoning : undefined;

	if (effectiveMinConfidence !== undefined && confidence < effectiveMinConfidence)
		throw new TempoAiError(`Recurrence rule confidence (${confidence}) is below the required threshold of ${effectiveMinConfidence}.`, 422);

	return createRecurrenceResult(
		rruleStr,
		summaryText,
		confidence,
		providerId,
		reasoning,
		anchorTempo,
		defaultBatchSize,
		options,
	);
}
