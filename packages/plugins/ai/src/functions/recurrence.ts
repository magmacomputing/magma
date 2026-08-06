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

const DAY_MAP: Record<string, number> = {
	MO: 1, TU: 2, WE: 3, TH: 4, FR: 5, SA: 6, SU: 7
};

interface ParsedRRule {
	freq: string;
	interval: number;
	count?: number | undefined;
	until?: Tempo | undefined;
	byDay?: Array<{ nth?: number | undefined; day: string }> | undefined;
	byHour?: number[] | undefined;
	byMinute?: number[] | undefined;
}

function parseRRule(rrule: string): ParsedRRule {
	const parts = rrule.split(';');
	let freq = 'DAILY';
	let interval = 1;
	let count: number | undefined;
	let until: Tempo | undefined;
	let byDay: Array<{ nth?: number | undefined; day: string }> | undefined;
	let byHour: number[] | undefined;
	let byMinute: number[] | undefined;

	for (const part of parts) {
		const [key, val] = part.split('=');
		if (!key || !val) continue;
		const k = key.toUpperCase();
		if (k === 'FREQ') freq = val.toUpperCase();
		else if (k === 'INTERVAL') interval = Math.max(1, parseInt(val, 10) || 1);
		else if (k === 'COUNT') count = parseInt(val, 10);
		else if (k === 'UNTIL') {
			const uStr = val.replace(/^(\d{4})(\d{2})(\d{2})T?(\d{2})?(\d{2})?(\d{2})?Z?$/, '$1-$2-$3T$4:$5:$6');
			until = new Tempo(uStr);
		} else if (k === 'BYDAY') {
			byDay = val.split(',').map(item => {
				const m = item.match(/^([+-]?\d+)?([A-Z]{2})$/i);
				const nthVal = m && m[1] ? parseInt(m[1], 10) : undefined;
				const dayVal = m ? m[2].toUpperCase() : item.toUpperCase();
				return { nth: nthVal, day: dayVal };
			});
		} else if (k === 'BYHOUR') {
			byHour = val.split(',').map(v => parseInt(v, 10));
		} else if (k === 'BYMINUTE') {
			byMinute = val.split(',').map(v => parseInt(v, 10));
		}
	}

	return { freq, interval, count, until, byDay, byHour, byMinute };
}

function expandOccurrences(rrule: string, anchor: Tempo, options?: { count?: number; after?: any; before?: any }): Tempo[] {
	const rule = parseRRule(rrule);
	const afterTempo = options?.after ? new Tempo(options.after) : undefined;
	const beforeTempo = options?.before ? new Tempo(options.before) : undefined;

	const results: Tempo[] = [];
	const maxToFetch = rule.count !== undefined ? rule.count : (options?.count ?? 100);

	let countProduced = 0;
	let step = 0;
	const MAX_STEPS = 1000;

	while (countProduced < maxToFetch && step < MAX_STEPS) {
		let cand: Tempo;

		if (rule.freq === 'DAILY') {
			cand = anchor.add(`${step * rule.interval} days`);
		} else if (rule.freq === 'WEEKLY') {
			cand = anchor.add(`${step * rule.interval} weeks`);
			if (rule.byDay && rule.byDay.length > 0) {
				const targetDay = DAY_MAP[rule.byDay[0].day] ?? 1;
				const diff = (targetDay - cand.dow + 7) % 7;
				cand = cand.add(`${diff} days`);
			}
		} else if (rule.freq === 'MONTHLY') {
			const baseMonth = anchor.add(`${step * rule.interval} months`);
			if (rule.byDay && rule.byDay.length > 0) {
				const { nth, day } = rule.byDay[0];
				const targetDay = DAY_MAP[day] ?? 1;
				const firstOfMonth = new Tempo(`${baseMonth.format('{yyyy}-{mm}')}-01`);
				let firstOcc = (targetDay - firstOfMonth.dow + 7) % 7 + 1;
				if (nth && nth > 1) {
					firstOcc += (nth - 1) * 7;
				}
				cand = new Tempo(`${baseMonth.format('{yyyy}-{mm}')}-${String(firstOcc).padStart(2, '0')}T${anchor.format('{hh}:{mi}:{ss}')}`);
			} else {
				cand = baseMonth;
			}
		} else if (rule.freq === 'YEARLY') {
			cand = anchor.add(`${step * rule.interval} years`);
		} else {
			cand = anchor.add(`${step * rule.interval} days`);
		}

		if (rule.byHour && rule.byHour.length > 0) {
			cand = cand.set({ hour: rule.byHour[0] });
		}
		if (rule.byMinute && rule.byMinute.length > 0) {
			cand = cand.set({ minute: rule.byMinute[0] });
		}

		step++;

		if (afterTempo && cand < afterTempo) continue;
		if (beforeTempo && cand > beforeTempo) break;
		if (rule.until && cand > rule.until) break;

		results.push(cand);
		countProduced++;

		if (rule.count !== undefined && countProduced >= rule.count) break;
	}

	return results;
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
	const isFinite = checkIsFinite(rruleStr) || Boolean(options?.before);
	let sizeLimit: number;
	if (rule.count !== undefined) {
		sizeLimit = rule.count;
	} else if (isFinite) {
		sizeLimit = expandOccurrences(rruleStr, anchorTempo, { count: 1000, after: options?.after, before: options?.before }).length;
	} else {
		sizeLimit = Number.POSITIVE_INFINITY;
	}

	let offsetCursor = 0;

	const take = (count?: number): Tempo[] => {
		const fetchCount = count ?? defaultBatchSize;
		if (isFinite && offsetCursor >= sizeLimit) return [];
		const actualCount = isFinite ? Math.min(fetchCount, sizeLimit - offsetCursor) : fetchCount;
		if (actualCount <= 0) return [];
		const expanded = expandOccurrences(rruleStr, anchorTempo, {
			count: offsetCursor + actualCount,
			after: options?.after,
			before: options?.before
		});
		const batch = expanded.slice(offsetCursor, offsetCursor + actualCount);
		offsetCursor += batch.length;
		return batch;
	};

	function* createIterator(batchSize: number): Generator<Tempo, void, unknown> {
		const expanded = expandOccurrences(rruleStr, anchorTempo, {
			count: isFinite ? Math.min(batchSize, sizeLimit) : batchSize,
			after: options?.after,
			before: options?.before
		});
		for (const item of expanded) {
			yield item;
		}
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

	if (isRRule) {
		const cleanRRule = input.trim().replace(/^RRULE:/i, '');
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
			options
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

	let successfulResult: { parsedData: any; providerId: string; rateLimits?: any } | null = null;
	let lastError: any = null;
	let bestCandidate: { parsedData: any; providerId: string; rateLimits?: any } | null = null;

	if (mode === AiMode.Fallback) {
		for (const provider of availableProviders) {
			try {
				const { rawContent, providerId, rateLimits } = await fetchFromProvider(
					provider,
					input,
					contextString,
					isDebug,
					undefined,
					callTimeout,
					systemPrompt
				);
				const cleanContent = rawContent.replace(/^```json\s*/i, '').replace(/\s*```$/i, '');
				const parsedData = JSON.parse(cleanContent);
				const candidateConfidence = typeof parsedData?.confidence === 'number' ? parsedData.confidence : 0.9;

				if (!bestCandidate || candidateConfidence > (bestCandidate.parsedData?.confidence ?? 0)) {
					bestCandidate = { parsedData, providerId, rateLimits };
				}

				if (effectiveMinConfidence === undefined || candidateConfidence >= effectiveMinConfidence) {
					successfulResult = { parsedData, providerId, rateLimits };
					break;
				}

				if (isDebug)
					console.log(`[tempo-plugin-ai:recurrence] Provider '${providerId}' confidence (${candidateConfidence}) below minConfidence (${effectiveMinConfidence}). Cascading to next provider...`);
			} catch (err: any) {
				lastError = err;
				if (isDebug)
					console.warn(`[tempo-plugin-ai:recurrence] Provider ${provider.id} failed:`, err);
			}
		}

		if (!successfulResult) {
			if (bestCandidate) {
				successfulResult = bestCandidate;
			} else {
				throw lastError || new TempoAiError('All configured AI providers failed.', 500);
			}
		}
	} else if (mode === AiMode.Race) {
		const parentController = new AbortController();
		try {
			const promises = availableProviders.map(async (provider) => {
				const { rawContent, providerId, rateLimits } = await fetchFromProvider(
					provider,
					input,
					contextString,
					isDebug,
					parentController.signal,
					callTimeout,
					systemPrompt
				);
				const cleanContent = rawContent.replace(/^```json\s*/i, '').replace(/\s*```$/i, '');
				return { parsedData: JSON.parse(cleanContent), providerId, rateLimits };
			});
			successfulResult = await Promise.race(promises);
			parentController.abort();
		} catch (err: any) {
			parentController.abort();
			throw err instanceof TempoAiError ? err : new TempoAiError(`Provider race failed: ${err.message}`, 500);
		}
	} else if (mode === AiMode.Consensus) {
		const promises = availableProviders.map(async (provider) => {
			const { rawContent, providerId, rateLimits } = await fetchFromProvider(
				provider,
				input,
				contextString,
				isDebug,
				undefined,
				callTimeout,
				systemPrompt
			);
			const cleanContent = rawContent.replace(/^```json\s*/i, '').replace(/\s*```$/i, '');
			return { parsedData: JSON.parse(cleanContent), providerId, rateLimits };
		});

		const settled = await Promise.allSettled(promises);
		const fulfilled = settled
			.filter((s): s is PromiseFulfilledResult<{ parsedData: any; providerId: string; rateLimits: any }> => s.status === 'fulfilled')
			.map(s => s.value);

		if (fulfilled.length === 0) {
			const firstRejected = settled.find(s => s.status === 'rejected') as PromiseRejectedResult | undefined;
			throw firstRejected?.reason || new TempoAiError('Consensus failed: all providers rejected.', 500);
		}

		if (fulfilled.length === 1) {
			successfulResult = fulfilled[0];
		} else {
			const firstRrule = fulfilled[0].parsedData?.rrule;
			const allMatch = fulfilled.every(f => f.parsedData?.rrule === firstRrule);

			if (allMatch) {
				successfulResult = {
					parsedData: {
						...fulfilled[0].parsedData,
						confidence: 1.0
					},
					providerId: AiMode.Consensus,
					rateLimits: fulfilled[0].rateLimits
				};
			} else {
				const sorted = [...fulfilled].sort((a, b) => (b.parsedData?.confidence ?? 0) - (a.parsedData?.confidence ?? 0));
				successfulResult = {
					parsedData: sorted[0].parsedData,
					providerId: sorted[0].providerId,
					rateLimits: sorted[0].rateLimits
				};
			}
		}
	}

	_state.limits = successfulResult?.rateLimits ?? null;

	const { parsedData, providerId } = successfulResult!;
	const rruleStr = typeof parsedData?.rrule === 'string' ? parsedData.rrule.trim() : 'FREQ=DAILY';
	const summaryText = typeof parsedData?.summary === 'string' ? parsedData.summary : (typeof parsedData?.humanReadable === 'string' ? parsedData.humanReadable : input);
	const confidence = typeof parsedData?.confidence === 'number' ? parsedData.confidence : 0.9;
	const reasoning = typeof parsedData?.reasoning === 'string' ? parsedData.reasoning : undefined;

	if (effectiveMinConfidence !== undefined && confidence < effectiveMinConfidence) {
		throw new TempoAiError(`Recurrence rule confidence (${confidence}) is below the required threshold of ${effectiveMinConfidence}.`, 422);
	}

	return createRecurrenceResult(
		rruleStr,
		summaryText,
		confidence,
		providerId,
		isDebug ? reasoning : undefined,
		anchorTempo,
		defaultBatchSize,
		options
	);
}
