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
	byMonth?: number[] | undefined;
	byDay?: Array<{ nth?: number | undefined; day: string }> | undefined;
	byHour?: number[] | undefined;
	byMinute?: number[] | undefined;
	bySetPos?: number[] | undefined;
}

function parseRRule(rrule: string): ParsedRRule {
	const parts = rrule.split(';');
	let freq = 'DAILY';
	let interval = 1;
	let count: number | undefined;
	let until: Tempo | undefined;
	let byMonth: number[] | undefined;
	let byDay: Array<{ nth?: number | undefined; day: string }> | undefined;
	let byHour: number[] | undefined;
	let byMinute: number[] | undefined;
	let bySetPos: number[] | undefined;

	for (const part of parts) {
		const [key, val] = part.split('=');
		if (!key || !val) continue;
		const k = key.toUpperCase();
		const trimmedVal = val.trim();

		if (k === 'FREQ') {
			freq = trimmedVal.toUpperCase();
		} else if (k === 'INTERVAL') {
			const parsed = parseInt(trimmedVal, 10);
			interval = !isNaN(parsed) && parsed > 0 ? parsed : 1;
		} else if (k === 'COUNT') {
			const parsed = parseInt(trimmedVal, 10);
			count = !isNaN(parsed) && parsed > 0 ? parsed : undefined;
		} else if (k === 'UNTIL') {
			if (/^\d{8}$/.test(trimmedVal)) {
				const year = trimmedVal.slice(0, 4);
				const month = trimmedVal.slice(4, 6);
				const day = trimmedVal.slice(6, 8);
				until = new Tempo(`${year}-${month}-${day}T23:59:59Z`);
			} else {
				const uStr = trimmedVal.replace(/^(\d{4})(\d{2})(\d{2})T?(\d{2})?(\d{2})?(\d{2})?Z?$/, '$1-$2-$3T$4:$5:$6');
				const t = new Tempo(uStr);
				until = t.isValid ? t : undefined;
			}
		} else if (k === 'BYMONTH') {
			const items = trimmedVal.split(',').map(v => parseInt(v, 10)).filter(v => !isNaN(v) && v >= 1 && v <= 12);
			if (items.length > 0) byMonth = items;
		} else if (k === 'BYDAY') {
			const items = trimmedVal.split(',').map(item => {
				const m = item.match(/^([+-]?\d+)?([A-Z]{2})$/i);
				const nthVal = m && m[1] ? parseInt(m[1], 10) : undefined;
				const dayVal = m ? m[2].toUpperCase() : item.toUpperCase();
				return { nth: nthVal !== undefined && !isNaN(nthVal) ? nthVal : undefined, day: dayVal };
			}).filter(d => DAY_MAP[d.day] !== undefined);
			if (items.length > 0) byDay = items;
		} else if (k === 'BYHOUR') {
			const items = trimmedVal.split(',').map(v => parseInt(v, 10)).filter(v => !isNaN(v) && v >= 0 && v <= 23);
			if (items.length > 0) byHour = items;
		} else if (k === 'BYMINUTE') {
			const items = trimmedVal.split(',').map(v => parseInt(v, 10)).filter(v => !isNaN(v) && v >= 0 && v <= 59);
			if (items.length > 0) byMinute = items;
		} else if (k === 'BYSETPOS') {
			const items = trimmedVal.split(',').map(v => parseInt(v, 10)).filter(v => !isNaN(v));
			if (items.length > 0) bySetPos = items;
		}
	}

	return { freq, interval, count, until, byMonth, byDay, byHour, byMinute, bySetPos };
}

function getMonthNum(t: Tempo): number {
	return parseInt(t.format('{mm}'), 10);
}

function getHourNum(t: Tempo): number {
	return parseInt(t.format('{hh}'), 10);
}

function getMinuteNum(t: Tempo): number {
	return parseInt(t.format('{mi}'), 10);
}

function getDaysInMonth(year: number, month: number): number {
	return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function expandOccurrences(rrule: string, anchor: Tempo, options?: { count?: number; after?: any; before?: any }): Tempo[] {
	const rule = parseRRule(rrule);
	const afterTempo = options?.after ? new Tempo(options.after) : undefined;
	const beforeTempo = options?.before ? new Tempo(options.before) : undefined;

	const results: Tempo[] = [];
	const maxToFetch = rule.count !== undefined ? rule.count : (options?.count ?? 100);

	let totalGeneratedFromAnchor = 0;
	let resultsCount = 0;
	let step = 0;
	const MAX_STEPS = 1000;

	while (resultsCount < maxToFetch && step < MAX_STEPS) {
		let periodBases: Tempo[] = [];

		if (rule.freq === 'DAILY') {
			periodBases = [anchor.add(`${step * rule.interval} days`)];
		} else if (rule.freq === 'WEEKLY') {
			const weekBase = anchor.add(`${step * rule.interval} weeks`);
			if (rule.byDay && rule.byDay.length > 0) {
				periodBases = rule.byDay.map(bd => {
					const targetDay = DAY_MAP[bd.day] ?? 1;
					const diff = (targetDay - weekBase.dow + 7) % 7;
					return weekBase.add(`${diff} days`);
				});
			} else {
				periodBases = [weekBase];
			}
		} else if (rule.freq === 'MONTHLY') {
			const monthBase = anchor.add(`${step * rule.interval} months`);
			const yearStr = monthBase.format('{yyyy}');
			const monthStr = monthBase.format('{mm}');
			const daysInMonth = getDaysInMonth(parseInt(yearStr, 10), parseInt(monthStr, 10));

			if (rule.byDay && rule.byDay.length > 0) {
				const candidateDays: Tempo[] = [];
				for (const bd of rule.byDay) {
					const targetDow = DAY_MAP[bd.day] ?? 1;
					const matchingDates: Tempo[] = [];
					for (let d = 1; d <= daysInMonth; d++) {
						const dateStr = `${yearStr}-${monthStr}-${String(d).padStart(2, '0')}T${anchor.format('{hh}:{mi}:{ss}')}`;
						const t = new Tempo(dateStr);
						if (t.dow === targetDow) {
							matchingDates.push(t);
						}
					}

					if (bd.nth !== undefined) {
						if (bd.nth > 0 && bd.nth <= matchingDates.length) {
							candidateDays.push(matchingDates[bd.nth - 1]);
						} else if (bd.nth < 0 && Math.abs(bd.nth) <= matchingDates.length) {
							candidateDays.push(matchingDates[matchingDates.length + bd.nth]);
						}
					} else {
						candidateDays.push(...matchingDates);
					}
				}
				periodBases = candidateDays;
			} else {
				periodBases = [monthBase];
			}
		} else if (rule.freq === 'YEARLY') {
			periodBases = [anchor.add(`${step * rule.interval} years`)];
		} else {
			periodBases = [anchor.add(`${step * rule.interval} days`)];
		}

		// Filter period bases by BYMONTH if specified
		if (rule.byMonth && rule.byMonth.length > 0) {
			periodBases = periodBases.filter(b => rule.byMonth!.includes(getMonthNum(b)));
		}

		// Cartesian expansion for BYHOUR and BYMINUTE
		const periodCandidates: Tempo[] = [];
		for (const base of periodBases) {
			const hours = rule.byHour && rule.byHour.length > 0 ? rule.byHour : [getHourNum(base)];
			const minutes = rule.byMinute && rule.byMinute.length > 0 ? rule.byMinute : [getMinuteNum(base)];

			for (const h of hours) {
				for (const m of minutes) {
					periodCandidates.push(base.set({ hour: h, minute: m }));
				}
			}
		}

		// Apply BYSETPOS if specified
		let finalPeriodCandidates = periodCandidates;
		if (rule.bySetPos && rule.bySetPos.length > 0 && periodCandidates.length > 0) {
			finalPeriodCandidates = [];
			for (const pos of rule.bySetPos) {
				if (pos > 0 && pos <= periodCandidates.length) {
					finalPeriodCandidates.push(periodCandidates[pos - 1]);
				} else if (pos < 0 && Math.abs(pos) <= periodCandidates.length) {
					finalPeriodCandidates.push(periodCandidates[periodCandidates.length + pos]);
				}
			}
		}

		step++;

		// Evaluate candidates sequentially with COUNT and window filtering
		let stopSeries = false;
		for (const cand of finalPeriodCandidates) {
			totalGeneratedFromAnchor++;

			if (rule.until && cand > rule.until) {
				stopSeries = true;
				break;
			}
			if (rule.count !== undefined && totalGeneratedFromAnchor > rule.count) {
				stopSeries = true;
				break;
			}
			if (beforeTempo && cand > beforeTempo) {
				stopSeries = true;
				break;
			}

			if (afterTempo && cand < afterTempo) {
				continue;
			}

			results.push(cand);
			resultsCount++;

			if (resultsCount >= maxToFetch) {
				stopSeries = true;
				break;
			}
		}

		if (stopSeries) break;
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

	const cachedOccurrences: Tempo[] = [];
	let offsetCursor = 0;
	let fullyExpanded = false;

	const ensureCached = (neededCount: number): void => {
		if (fullyExpanded || cachedOccurrences.length >= neededCount) return;
		const fresh = expandOccurrences(rruleStr, anchorTempo, {
			count: neededCount,
			after: options?.after,
			before: options?.before
		});
		cachedOccurrences.length = 0;
		cachedOccurrences.push(...fresh);
		if (fresh.length < neededCount) {
			fullyExpanded = true;
		}
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
	if (mode !== AiMode.Fallback && mode !== AiMode.Race && mode !== AiMode.Consensus) {
		throw new TempoAiError(`Invalid execution mode: '${mode}'. Supported modes are 'fallback', 'race', 'consensus'.`, 400);
	}

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

			// Attach no-op rejection handler to suppress unhandled promise warnings on aborted/slower requests
			promises.forEach(p => p.catch(() => {}));

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

	if (!successfulResult) {
		throw lastError || new TempoAiError('All configured AI providers failed.', 500);
	}

	_state.limits = successfulResult.rateLimits ?? null;

	const { parsedData, providerId } = successfulResult;
	if (typeof parsedData?.rrule !== 'string' || !parsedData.rrule.trim()) {
		throw new TempoAiError('Invalid recurrence response from AI provider: missing or empty rrule string.', 422);
	}

	const rruleStr = parsedData.rrule.trim();
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
