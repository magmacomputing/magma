import { Tempo, Interval } from '@magmacomputing/tempo';
import { isString, isNumber, isFunction } from '@magmacomputing/library/assertion.library.js';
import { TempoAiError } from '../core/error.js';
import { AiMode } from '../core/config.js';
import { _state } from '../core/init.js';
import { fetchFromProvider, assertNoReservedProviderId } from '../core/support.js';
import type { TempoScheduleOptions, TempoScheduleResult, TempoWorkingHours, TempoInterval, TempoScheduleMeta, AiProvider } from '../types/index.js';

function normalizeBusyEvents(rawEvents?: any[], timeZone = 'UTC'): Array<{ start: Tempo; end: Tempo; title?: string | undefined }> {
	if (!Array.isArray(rawEvents)) return [];

	const parsePoint = (val: any): Tempo => {
		if (!val) return new Tempo({ timeZone });
		if (Tempo.isTempo(val)) return val;
		return new Tempo(val, { timeZone });
	}

	return rawEvents.map(evt => {
		let start: Tempo;
		let end: Tempo;
		let title = 'Busy';

		if (evt && typeof evt === 'object') {
			if ('start' in evt && 'end' in evt) {
				start = parsePoint((evt as any).start);
				end = parsePoint((evt as any).end);
				if ('title' in evt) title = String((evt as any).title);
				else if ('label' in evt) title = String((evt as any).label);
			} else if (Array.isArray(evt) && evt.length >= 2) {
				start = parsePoint(evt[0]);
				end = parsePoint(evt[1]);
			} else {
				start = parsePoint(evt);
				end = start.add('1 hour');
			}
		} else {
			start = parsePoint(evt);
			end = start.add('1 hour');
		}

		return { start, end, title };
	});
}

function parseDurationMinutes(prompt: string, fallback?: number): number {
	if (isNumber(fallback) && fallback > 0) return fallback;
	const match = prompt.match(/(\d+)\s*(?:minutes?|mins?|m\b)/i);
	if (match) return parseInt(match[1], 10);
	const hourMatch = prompt.match(/(\d+(?:\.\d+)?)\s*(?:hours?|hrs?|h\b)/i);
	if (hourMatch) return Math.round(parseFloat(hourMatch[1]) * 60);
	return 30; // default 30 minutes
}

function buildContextPrompt(
	anchorTempo: Tempo,
	timeZone: string,
	workingHours: TempoWorkingHours,
	busyEvents: Array<{ start: Tempo; end: Tempo; title?: string | undefined }>,
	durationMinutes: number
): string {
	const daysMap = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
	const activeDays = (workingHours.days ?? [1, 2, 3, 4, 5]).map(d => daysMap[d] ?? d).join(', ');
	const whStart = workingHours.start ?? '09:00';
	const whEnd = workingHours.end ?? '17:00';

	let busySummary = 'None';
	if (busyEvents.length > 0) {
		busySummary = busyEvents.map(b =>
			`- ${b.title || 'Busy'}: ${b.start.format('{yyyy}-{mm}-{dd}T{hh}:{mi}:{ss}')} to ${b.end.format('{yyyy}-{mm}-{dd}T{hh}:{mi}:{ss}')} [${b.start.tz}]`
		).join('\n');
	}

	return `Reference Anchor Time: ${anchorTempo.format('{yyyy}-{mm}-{dd}T{hh}:{mi}:{ss}')} (${timeZone})
Target TimeZone: ${timeZone}
Working Hours: ${whStart} to ${whEnd} (${activeDays}) in ${workingHours.timeZone || timeZone}
Required Slot Duration: ${durationMinutes} minutes
Existing Booked Busy Slots to Avoid:
${busySummary}`;
}

const SCHEDULE_SYSTEM_PROMPT = `You are a high-precision calendar scheduling engine.
Your task is to analyze a natural language scheduling prompt and resolve the single optimal start and end time interval.

Instructions:
- Calculate an available interval that falls strictly within working hours and active weekdays.
- Ensure the slot does NOT overlap with any existing booked busy slots.
- Output ONLY valid JSON containing:
  "start": ISO 8601 string with timeZone offset (e.g. "2026-08-11T14:15:00-07:00")
  "end": ISO 8601 string with timeZone offset (e.g. "2026-08-11T15:00:00-07:00")
  "durationMinutes": number
  "summary": string (human-friendly summary of the slot)
  "reasoning": string (explanation of why this slot was selected)
  "confidence": number between 0.0 and 1.0
  "alternatives": array of secondary { "start": "...", "end": "..." } options if available`;

function wrapScheduleInterval(
	interval: Interval<Tempo>,
	meta: TempoScheduleMeta
): TempoScheduleResult {
	const frozenMeta = Object.freeze(meta);
	return new Proxy(interval, {
		get(target, prop) {
			if (prop in frozenMeta)
				return (frozenMeta as any)[prop];

			const val = Reflect.get(target, prop, target);
			if (isFunction(val)) return val.bind(target);
			return val;
		},
		has(target, prop) {
			if (prop in frozenMeta) return true;
			return Reflect.has(target, prop);
		},
		getOwnPropertyDescriptor(target, prop) {
			if (prop in frozenMeta) {
				return {
					value: (frozenMeta as any)[prop],
					writable: false,
					configurable: true,
					enumerable: true
				};
			}
			return Reflect.getOwnPropertyDescriptor(target, prop);
		},
		ownKeys(target) {
			const keys = Reflect.ownKeys(target);
			for (const k of Object.keys(frozenMeta)) {
				if (!keys.includes(k)) keys.push(k);
			}
			return keys;
		}
	}) as unknown as TempoScheduleResult;
}

/**
 * ## scheduleAI
 * Resolves natural language scheduling prompts against working hours, existing calendar
 * events, and timezones into an optimal `TempoScheduleResult` (implementing `Interval`).
 *
 * @param prompt - Natural language scheduling prompt
 * @param options - Scheduling configuration including working hours, existing busy events, anchor date, and timeZone
 * @returns Promise resolving to an Interval instance decorated with AI scheduling metadata
 */
export async function scheduleAI(
	prompt: string,
	options?: TempoScheduleOptions
): Promise<TempoScheduleResult> {
	if (!isString(prompt) || prompt.trim() === '') {
		throw new TempoAiError('Invalid scheduling prompt provided to scheduleAI', 400);
	}

	const state = _state;
	const availableProviders = options?.providers ?? state.config.providers;

	if (!availableProviders || availableProviders.length === 0) {
		throw new TempoAiError('No AI providers configured for scheduleAI. Call initAI() or supply providers in options.', 400);
	}

	assertNoReservedProviderId(availableProviders);

	const anchorTempo = options?.anchor ? new Tempo(options.anchor) : new Tempo();
	const timeZone = options?.timeZone || anchorTempo.tz || 'UTC';
	const workingHours: TempoWorkingHours = {
		start: options?.workingHours?.start ?? '09:00',
		end: options?.workingHours?.end ?? '17:00',
		days: options?.workingHours?.days ?? [1, 2, 3, 4, 5],
		timeZone: options?.workingHours?.timeZone ?? timeZone
	};

	const rawBusy = options?.events ?? options?.intervals;
	const busyEvents = normalizeBusyEvents(rawBusy, timeZone);
	const durationMinutes = parseDurationMinutes(prompt, options?.durationMinutes);

	const contextString = buildContextPrompt(anchorTempo, timeZone, workingHours, busyEvents, durationMinutes);
	const isDebug = Boolean(options?.debug ?? state.config.debug);
	const mode = (options?.mode || state.config.mode || AiMode.Fallback).toLowerCase();
	const callTimeout = options?.timeout ?? state.config.timeout ?? 15000;

	const executeProviderCall = async (provider: AiProvider, signal?: AbortSignal) => {
		const { rawContent, providerId, rateLimits } = await fetchFromProvider(
			provider,
			prompt,
			contextString,
			isDebug,
			signal,
			callTimeout,
			SCHEDULE_SYSTEM_PROMPT
		)

		const cleanContent = rawContent.replace(/^```json\s*/i, '').replace(/\s*```$/i, '');
		let parsed: any;
		try {
			parsed = JSON.parse(cleanContent);
		} catch {
			throw new TempoAiError(`Provider ${provider.id} returned invalid JSON payload.`, 422);
		}

		if (!parsed.start || !parsed.end) {
			throw new TempoAiError(`Provider ${provider.id} missing start or end ISO timestamp.`, 422);
		}

		let finalStart: Tempo;
		let finalEnd: Tempo;
		try {
			finalStart = new Tempo(parsed.start, { timeZone });
			finalEnd = new Tempo(parsed.end, { timeZone });
		} catch {
			throw new TempoAiError(`Provider ${provider.id} returned unparseable start or end timestamp.`, 422);
		}

		if (finalEnd.epoch.ms <= finalStart.epoch.ms) {
			throw new TempoAiError(`Provider ${provider.id} proposed end time before or equal to start time.`, 422);
		}

		return {
			parsed,
			startTempo: finalStart,
			endTempo: finalEnd,
			confidence: isNumber(parsed.confidence) ? parsed.confidence : 0.9,
			providerId,
			rateLimits,
			summary: parsed.summary || `Scheduled slot ${finalStart.format('{yyyy}-{mm}-{dd} {hh}:{mi}')} to ${finalEnd.format('{hh}:{mi}')}`,
			reasoning: parsed.reasoning || 'Resolved slot via AI scheduler.',
			alternatives: Array.isArray(parsed.alternatives) ? parsed.alternatives : []
		};
	};

	let selectedResult: any;

	if (mode === AiMode.Fallback || mode === 'fallback') {
		let lastErr: any;
		for (const provider of availableProviders) {
			try {
				selectedResult = await executeProviderCall(provider);
				break;
			} catch (err) {
				lastErr = err;
			}
		}
		if (!selectedResult) {
			throw lastErr || new TempoAiError('All configured AI providers failed during scheduleAI execution.', 502);
		}
	} else if (mode === AiMode.Race || mode === 'race') {
		const parentController = new AbortController();
		try {
			const promises = availableProviders.map(p => executeProviderCall(p, parentController.signal));
			promises.forEach(p => p.catch(() => { }));
			selectedResult = await Promise.race(promises);
			parentController.abort();
		} catch (aggregateErr: any) {
			parentController.abort();
			throw aggregateErr instanceof TempoAiError
				? aggregateErr
				: new TempoAiError(`All providers failed in race mode: ${aggregateErr.message}`, 502);
		}
	} else if (mode === AiMode.Consensus || mode === 'consensus') {
		const parentController = new AbortController();
		const results = await Promise.allSettled(
			availableProviders.map(p => executeProviderCall(p, parentController.signal))
		);

		const fulfilled = results
			.filter((r): r is PromiseFulfilledResult<any> => r.status === 'fulfilled')
			.map(r => r.value);

		if (fulfilled.length === 0) {
			const rejected = results.find(r => r.status === 'rejected') as PromiseRejectedResult;
			throw rejected.reason instanceof TempoAiError
				? rejected.reason
				: new TempoAiError('All providers failed in consensus mode during scheduleAI execution.', 502);
		}

		fulfilled.sort((a, b) => b.confidence - a.confidence);
		selectedResult = fulfilled[0];
	} else {
		throw new TempoAiError(`Invalid execution mode '${options?.mode}' provided to scheduleAI.`, 400);
	}

	_state.limits = selectedResult.rateLimits ?? null;

	const minConf = options?.minConfidence ?? state.config.minConfidence ?? 0.0;
	if (selectedResult.confidence < minConf) {
		throw new TempoAiError(
			`scheduleAI confidence (${selectedResult.confidence}) is below the required threshold of ${minConf}`,
			422
		);
	}

	let finalStart = selectedResult.startTempo;
	let finalEnd = selectedResult.endTempo;
	let conflictBumped = false;
	let originalSlot: TempoInterval | undefined;

	// Deterministic Conflict Validation using core Interval.overlaps()
	const proposedInterval = new Interval(finalStart, finalEnd);
	const conflictingEvent = busyEvents.find(b => {
		const busyInt = new Interval(b.start, b.end);
		const isOver = proposedInterval.overlaps(busyInt);
		return isOver;
	});

	if (conflictingEvent) {
		conflictBumped = true;
		originalSlot = { start: finalStart, end: finalEnd };
		// Bump start to the end of the conflicting event
		finalStart = conflictingEvent.end;
		finalEnd = finalStart.add(`${durationMinutes} minutes`);
		selectedResult.reasoning = `[Adjusted for conflict] Shifted slot past conflicting event "${conflictingEvent.title || 'Busy'}" to ${finalStart.format('{yyyy}-{mm}-{dd} {hh}:{mi}')}. ${selectedResult.reasoning}`;
	}

	// Create actual Interval instance
	const rawInterval = new Interval(finalStart, finalEnd);

	// Process alternative slots into Interval instances
	const alternatives: TempoInterval[] = selectedResult.alternatives
		.map((alt: any) => {
			try {
				const s = new Tempo(alt.start, { timeZone });
				const e = new Tempo(alt.end, { timeZone });
				return new Interval(s, e);
			} catch {
				return null;
			}
		})
		.filter((i: any): i is TempoInterval => i !== null);

	const actualDuration = Math.round((finalEnd.epoch.ms - finalStart.epoch.ms) / 60000);

	return wrapScheduleInterval(rawInterval, {
		durationMinutes: actualDuration,
		summary: selectedResult.summary,
		reasoning: selectedResult.reasoning,
		confidence: selectedResult.confidence,
		provider: selectedResult.providerId,
		alternatives,
		ai: {
			provider: selectedResult.providerId,
			confidence: selectedResult.confidence,
			conflictBumped,
			originalSlot,
			reasoning: selectedResult.reasoning
		}
	});
}
