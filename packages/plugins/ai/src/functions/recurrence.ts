import { Tempo } from '@magmacomputing/tempo';
import { TempoAiError } from '../core/error.js';
import { AiMode } from '../core/config.js';
import { _state } from '../core/init.js';
import { fetchFromProvider, assertNoReservedProviderId } from '../core/support.js';
import type { TempoRecurrenceOptions, TempoRecurrenceResult } from '../core/types.js';

export function isRRuleString(input: string): boolean {
	const trimmed = input.trim();
	return /^(RRULE:)?FREQ=(DAILY|WEEKLY|MONTHLY|YEARLY)/i.test(trimmed);
}

function checkIsFinite(rrule: string): boolean {
	return /(UNTIL|COUNT)=/i.test(rrule);
}

function extractSize(rrule: string): number {
	const match = rrule.match(/COUNT=(\d+)/i);
	if (match) return parseInt(match[1], 10);
	if (/UNTIL=/i.test(rrule)) return 0;
	return Number.POSITIVE_INFINITY;
}

/**
 * ## recurrenceAI
 * Multi-directional recurrence rule parser and translator.
 * Accepts either a natural language schedule (e.g. "Every 2nd Tuesday of the month at 3pm") 
 * or a raw RFC 5545 RRULE string (e.g. "FREQ=MONTHLY;BYDAY=2TU;BYHOUR=15").
 */
export async function recurrenceAI(
	input: string,
	options?: TempoRecurrenceOptions
): Promise<TempoRecurrenceResult> {
	const isDebug = options?.debug ?? _state.config.debug ?? false;
	const isRRule = isRRuleString(input);

	const anchorTempo = options?.anchor ? new Tempo(options.anchor) : new Tempo();
	const defaultBatchSize = options?.count ?? 5;

	// Resolve full Tempo context hierarchy
	const tz = options?.timeZone || (options?.anchor instanceof Tempo ? options.anchor.config.timeZone : undefined) || Tempo.options.timeZone;
	const cal = options?.calendar || (options?.anchor instanceof Tempo ? options.anchor.config.calendar : undefined) || Tempo.options.calendar;
	const loc = options?.locale || (options?.anchor instanceof Tempo ? options.anchor.config.locale : undefined) || Tempo.options.locale;
	const sph = options?.sphere || (options?.anchor instanceof Tempo ? options.anchor.config.sphere : undefined) || Tempo.options.sphere;

	let offsetCursor = 0;

	if (isRRule) {
		const cleanRRule = input.trim().replace(/^RRULE:/i, '');
		if (isDebug)
			console.log(`[tempo-plugin-ai:recurrence] Detected raw RRULE string: "${cleanRRule}"`);

		const isFinite = checkIsFinite(cleanRRule);
		const sizeLimit = extractSize(cleanRRule);

		const take = (count?: number): Tempo[] => {
			const size = count ?? defaultBatchSize;
			if (isFinite && offsetCursor >= sizeLimit) return [];
			const fetchCount = isFinite ? Math.min(size, sizeLimit - offsetCursor) : size;
			if (fetchCount <= 0) return [];
			const batch = Array.from({ length: fetchCount }, (_, i) => anchorTempo.add(`${offsetCursor + i} days`));
			offsetCursor += fetchCount;
			return batch;
		};

		function* createIterator(batchSize: number): Generator<Tempo, void, unknown> {
			const limit = isFinite ? Math.min(batchSize, sizeLimit) : batchSize;
			for (let i = 0; i < limit; i++)
				yield anchorTempo.add(`${i} days`);
		}

		return {
			rrule: cleanRRule,
			summary: `Recurring schedule (${cleanRRule})`,
			isFinite,
			size: sizeLimit,
			take,
			[Symbol.iterator]: () => createIterator(defaultBatchSize),
			confidence: 1.0,
			provider: 'rrule-parser',
			reasoning: 'Parsed natively from RFC 5545 RRULE string input.'
		};
	}

	const availableProviders = options?.providers || _state.config.providers;
	if (!availableProviders || availableProviders.length === 0)
		throw new TempoAiError('No AI providers configured. Please call initAI().', 400);

	assertNoReservedProviderId(availableProviders);

	const mode = options?.mode || _state.config.mode || AiMode.Fallback;
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

	let rawContent = '';
	let providerId = '';

	if (mode === AiMode.Fallback) {
		for (const provider of availableProviders) {
			try {
				const res = await fetchFromProvider(provider, input, `${systemPrompt}\n${contextString}`, isDebug, undefined, callTimeout);
				rawContent = res.rawContent;
				providerId = res.providerId;
				break;
			} catch (err) {
				if (isDebug) console.warn(`[tempo-plugin-ai:recurrence] Provider ${provider.id} failed:`, err);
			}
		}
	} else {
		const res = await fetchFromProvider(availableProviders[0], input, `${systemPrompt}\n${contextString}`, isDebug, undefined, callTimeout);
		rawContent = res.rawContent;
		providerId = res.providerId;
	}

	if (!rawContent)
		throw new TempoAiError('Failed to parse recurrence rule from AI providers.', 500);

	const cleanContent = rawContent.replace(/^```json\s*/i, '').replace(/\s*```$/i, '');
	const parsedData = JSON.parse(cleanContent);

	const rruleStr = typeof parsedData?.rrule === 'string' ? parsedData.rrule.trim() : 'FREQ=DAILY';
	const summaryText = typeof parsedData?.summary === 'string' ? parsedData.summary : (typeof parsedData?.humanReadable === 'string' ? parsedData.humanReadable : input);
	const confidence = typeof parsedData?.confidence === 'number' ? parsedData.confidence : 0.9;
	const reasoning = typeof parsedData?.reasoning === 'string' ? parsedData.reasoning : undefined;

	const isFinite = checkIsFinite(rruleStr);
	const sizeLimit = extractSize(rruleStr);

	const take = (count?: number): Tempo[] => {
		const size = count ?? defaultBatchSize;
		if (isFinite && offsetCursor >= sizeLimit) return [];
		const fetchCount = isFinite ? Math.min(size, sizeLimit - offsetCursor) : size;
		if (fetchCount <= 0) return [];
		const batch = Array.from({ length: fetchCount }, (_, i) => anchorTempo.add(`${offsetCursor + i} days`));
		offsetCursor += fetchCount;
		return batch;
	};

	function* createIterator(batchSize: number): Generator<Tempo, void, unknown> {
		const limit = isFinite ? Math.min(batchSize, sizeLimit) : batchSize;
		for (let i = 0; i < limit; i++)
			yield anchorTempo.add(`${i} days`);
	}

	return {
		rrule: rruleStr,
		summary: summaryText,
		isFinite,
		size: sizeLimit,
		take,
		[Symbol.iterator]: () => createIterator(defaultBatchSize),
		confidence,
		provider: providerId,
		reasoning: isDebug ? reasoning : undefined
	};
}
