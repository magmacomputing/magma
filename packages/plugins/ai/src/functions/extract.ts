import { Tempo } from '@magmacomputing/tempo';
import { asNumber, asText, isDefined, isObject, isString, isText, secure, when } from '@magmacomputing/tempo/library';
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
import { logDebug, warnDebug, attachCustomInspect, maskPii, sanitizeInspectAiMeta } from '../core/logger.js';
import type {
	AiExtractOptions,
	TempoAiExtractResult,
	TempoExtractedEvent,
	TempoEventType,
} from '../types/extract.type.js';

export type {
	AiExtractOptions,
	TempoAiExtractResult,
	TempoExtractedEvent,
	TempoEventType,
};

async function extractSingleInput(
	text: string,
	options?: AiExtractOptions,
): Promise<TempoAiExtractResult> {
	if (!isText(text))
		throw new TempoAiError('Invalid text input provided to extractAI: text must be a non-empty string.', 400);

	const fallbackTempo = Tempo.isTempo(options?.anchor) ? options.anchor : null;
	const context = resolveFullContext(options, fallbackTempo);
	const { tz, loc, cal } = context;

	const anchorTempo = resolveAnchorTempo(options?.anchor, context, {
		defaultAnchor: Math.floor(Date.now() / 60_000) * 60_000,
		operationName: 'extractAI',
	});

	const region = asText(options?.region, '');
	const categories = options?.categories ? options.categories.map(c => String(c).trim()).filter(Boolean) : [];
	const categoriesStr = categories.sort().join(',');

	const {
		force,
		cache: aiCacheOption,
		ttl,
		cacheAdapter,
	} = options || {};

	const normalizedText = normalizeCacheInput(text);
	const cacheKey = `extract::${normalizedText}::${anchorTempo.format('{yyyy}-{mm}-{dd}T{hh}:{mi}:{ss}')}::${tz}::${loc}::${cal}::${region}::${categoriesStr}`;

	const { mode, minConfidence: effectiveMinConfidence, isDebug, executeOptions } = resolveExecutionOptions(options, 'extract');

	const cachedVal = await readMultiTierCache(cacheKey, {
		force,
		cache: aiCacheOption,
		cacheAdapter,
		debug: isDebug,
		tag: 'tempo-plugin-ai:extract',
	});

	if (cachedVal) {
		try {
			const parsedCache = JSON.parse(cachedVal);
			if (Array.isArray(parsedCache?.events)) {
				const cachedConfidence = sanitizeConfidence(parsedCache.confidence, 1.0);

				if (isDefined(effectiveMinConfidence) && cachedConfidence < effectiveMinConfidence) {
					logDebug('tempo-plugin-ai:extract', `Cached confidence (${cachedConfidence}) is below minConfidence (${effectiveMinConfidence}), ignoring cache.`, undefined, { debug: isDebug });
				} else {
					const rehydratedEvents: TempoExtractedEvent[] = [];
					const allowedTypes: TempoEventType[] = ['point', 'interval', 'deadline', 'recurrence', 'tentative'];
					for (const ev of parsedCache.events) {
						try {
							const start = new Tempo(ev.start, { timeZone: tz, locale: loc, calendar: cal });
							if (!start.isValid) continue;
							const end = ev.end ? new Tempo(ev.end, { timeZone: tz, locale: loc, calendar: cal }) : undefined;
							if (end && !end.isValid) continue;
							const type = when(ev.type, (t: unknown): t is TempoEventType => allowedTypes.includes(t as any), 'point');
							rehydratedEvents.push({
								label: asText(ev.label, 'Event'),
								start,
								end,
								type,
								rawText: asText(ev.rawText),
								confidence: sanitizeConfidence(ev.confidence, 1.0),
							});
						} catch (err: any) {
							warnDebug('tempo-plugin-ai:extract', 'Failed to rehydrate cached event', err, { debug: isDebug });
						}
					}

					const reasoning = asText(parsedCache.reasoning);
					const cachedResult: TempoAiExtractResult = {
						events: rehydratedEvents,
						confidence: cachedConfidence,
						provider: 'cache',
						reasoning,
					};

					attachCustomInspect(cachedResult, (obj, isProd) => ({
						events: obj.events.map(e => ({
							label: maskPii(e.label, isProd),
							start: e.start?.toString(),
							...(e.end ? { end: e.end?.toString() } : {}),
							type: e.type,
							...(e.rawText ? { rawText: maskPii(e.rawText, isProd) } : {}),
							confidence: e.confidence,
						})),
						...sanitizeInspectAiMeta(obj, isProd),
					}));

					return secure(cachedResult);
				}
			}
		} catch (err: any) {
			warnDebug('tempo-plugin-ai:extract', 'Failed to parse cached payload', err, { debug: isDebug });
		}
	}

	const availableProviders = getAvailableProviders(options);

	const weekdayNames = ['', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
	const anchorDow = asNumber(anchorTempo.dow, 0);
	const anchorWeekday = weekdayNames[anchorDow] || anchorTempo.format('{www}');
	const anchorIso = anchorTempo.format('{yyyy}-{mm}-{dd}T{hh}:{mi}:{ss}');

	const systemPrompt = `You are an expert temporal entity and calendar event extraction engine.
Scan the user-provided text for all temporal expressions, deadlines, appointments, meetings, intervals, and time-bound events.
Resolve all relative references ("tomorrow", "next Tuesday", "in 2 hours", "at 5pm") strictly against the Reference Anchor date and timezone.

Return ONLY a valid JSON object matching this exact schema:
{
  "events": [
    {
      "label": "Brief descriptive title of the event or task",
      "start": "ISO 8601 string without offset or Z (e.g. 2026-08-14T10:00:00)",
      "end": "ISO 8601 string without offset or Z or null if point in time",
      "type": "point | interval | deadline | recurrence | tentative",
      "rawText": "Exact text snippet from the input mentioning this event",
      "confidence": 0.95
    }
  ],
  "confidence": 0.95,
  "reasoning": "Summary of temporal entities identified"
}

Rules:
1. "events": Array of extracted event objects. If no temporal entities are mentioned, return an empty array [].
2. "start": Local ISO 8601 representation (YYYY-MM-DDThh:mm:ss) anchored to the reference date and timezone.
3. "end": Local ISO 8601 string for interval end / duration, or null.
4. "type": Must be one of 'point', 'interval', 'deadline', 'recurrence', 'tentative'.
5. "confidence": Float score between 0.0 and 1.0 representing extraction certainty.
${categories.length > 0 ? `6. Only extract events matching one of these categories: ${categories.join(', ')}.` : ''}`;

	const contextString = `Grounding Context:
- Reference Anchor Date-Time: ${anchorIso} (${tz})
- Reference Day of Week: ${anchorWeekday} (Day ${anchorDow})
- Target TimeZone: ${tz}
- Target Locale: ${loc}
- Calendar System: ${cal}
${region ? `- Region Context: ${region}\n` : ''}${categories.length > 0 ? `- Filter Categories: ${categories.join(', ')}\n` : ''}`;

	const winningCandidate = await executeWithMode(
		mode,
		availableProviders,
		async (provider, signal) => {
			const { rawContent, providerId, rateLimits } = await fetchFromProvider(
				provider,
				text,
				contextString,
				{ ...options, signal, systemPrompt },
			);

			const parsedData = parseJsonPayload<any>(rawContent, providerId);

			if (!isObject(parsedData))
				throw new TempoAiError(`Provider ${providerId} returned non-object JSON payload.`, 422);

			if (!Array.isArray(parsedData?.events))
				throw new TempoAiError(`Provider ${providerId} returned invalid response: 'events' array missing.`, 422);

			const confidence = sanitizeConfidence(parsedData?.confidence);
			const reasoning = asText(parsedData?.reasoning);

			const validEvents: TempoExtractedEvent[] = [];
			const rawEventItems: any[] = [];
			for (const item of parsedData.events) {
				if (!isObject(item)) continue;
				try {
					const start = new Tempo(item.start, { timeZone: tz, locale: loc, calendar: cal });
					if (!start.isValid) continue;

					let end: Tempo | undefined;
					if (isString(item.end)) {
						const parsedEnd = new Tempo(item.end, { timeZone: tz, locale: loc, calendar: cal });
						if (parsedEnd.isValid) end = parsedEnd;
					}

					const allowedTypes: TempoEventType[] = ['point', 'interval', 'deadline', 'recurrence', 'tentative'];
					const type = when(item.type, (t: unknown): t is TempoEventType => allowedTypes.includes(t as any), 'point');
					const label = asText(item.label, 'Event');
					const rawText = asText(item.rawText);
					const itemConf = sanitizeConfidence(item.confidence, confidence);

					validEvents.push({
						label,
						start,
						end,
						type,
						rawText,
						confidence: itemConf,
					});

					rawEventItems.push({
						label,
						start: start.format('{yyyy}-{mm}-{dd}T{hh}:{mi}:{ss}'),
						end: end ? end.format('{yyyy}-{mm}-{dd}T{hh}:{mi}:{ss}') : null,
						type,
						rawText,
						confidence: itemConf,
					});
				} catch (err: any) {
					warnDebug('tempo-plugin-ai:extract', `Failed to parse event from provider '${providerId}'`, err, { debug: isDebug });
				}
			}

			return {
				data: {
					events: validEvents,
					rawEvents: rawEventItems,
					reasoning,
				},
				providerId,
				rateLimits,
				confidence,
				consensusKey: JSON.stringify(rawEventItems),
			};
		},
		executeOptions,
	);

	const { data: parsedData, providerId } = winningCandidate;
	const confidence = sanitizeConfidence(winningCandidate.confidence);
	assertMinConfidenceThreshold(confidence, effectiveMinConfidence, 'extractAI');

	const finalResult: TempoAiExtractResult = {
		events: parsedData.events,
		confidence,
		provider: providerId,
		reasoning: parsedData.reasoning,
	};

	const resolvedTtl = resolveProviderTtl(providerId, availableProviders, ttl, 86_400_000);
	const cacheVal = JSON.stringify({
		events: parsedData.rawEvents,
		confidence,
		provider: providerId,
		reasoning: parsedData.reasoning,
	});

	await writeMultiTierCache(cacheKey, cacheVal, resolvedTtl, {
		cache: aiCacheOption,
		cacheAdapter,
		debug: isDebug,
		tag: 'tempo-plugin-ai:extract',
	});

	attachCustomInspect(finalResult, (obj, isProd) => ({
		events: obj.events.map(e => ({
			label: maskPii(e.label, isProd),
			start: e.start?.toString(),
			...(e.end ? { end: e.end?.toString() } : {}),
			type: e.type,
			...(e.rawText ? { rawText: maskPii(e.rawText, isProd) } : {}),
			confidence: e.confidence,
		})),
		...sanitizeInspectAiMeta(obj, isProd),
	}));

	return secure(finalResult);
}

/**
 * ## extractAI
 * Scans unstructured multi-paragraph text (emails, meeting transcripts, chat logs, task notes) 
 * and extracts all embedded temporal entities, deadlines, appointments, and intervals into structured `TempoAiExtractResult` records.
 * 
 * ### Why it fits Tempo:
 * Translates messy unstructured prose into typed, validated `Tempo` instances anchored to reference timezones and calendar contexts.
 * 
 * ### Example Usage:
 * ```ts
 * const email = "Let's meet tomorrow at 10am for sprint planning. Deliverables due next Friday by 5pm.";
 * const result = await extractAI(email, { anchor: new Tempo('2026-08-10T09:00:00Z') });
 * 
 * for (const event of result.events) {
 *   console.log(event.label, event.start.format('{yyyy}-{mm}-{dd} {hh}:{mi}'));
 * }
 * ```
 */
export async function extractAI(texts: string[], options?: AiExtractOptions): Promise<(TempoAiExtractResult | TempoAiError)[]>;
export async function extractAI(text: string, options?: AiExtractOptions): Promise<TempoAiExtractResult>;
export async function extractAI(
	textOrTexts: string | string[],
	options?: AiExtractOptions,
): Promise<TempoAiExtractResult | (TempoAiExtractResult | TempoAiError)[]> {
	if (Array.isArray(textOrTexts)) {
		return executeBatch(textOrTexts, str => extractSingleInput(str, options), options);
	}

	return extractSingleInput(textOrTexts, options);
}
