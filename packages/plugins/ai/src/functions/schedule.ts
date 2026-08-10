import { Tempo, Interval } from '@magmacomputing/tempo';
import { isString, isNumber, isFunction, DAY_MAP, ISO_WEEKDAY_NAMES, type DayKey } from '@magmacomputing/tempo/library';
import { TempoAiError } from '../core/error.js';
import { AiMode } from '../core/config.js';
import { _state } from '../core/init.js';
import { executeWithMode } from '../core/dispatch.js';
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
				if ('title' in evt && (evt as any).title !== undefined && String((evt as any).title).trim().length > 0)
					title = String((evt as any).title);
				else if ('label' in evt && (evt as any).label !== undefined && String((evt as any).label).trim().length > 0)
					title = String((evt as any).label);
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

function formatActiveDays(days?: Array<number | DayKey | string>): string {
	const active = days ?? [1, 2, 3, 4, 5];
	return active.map(d => {
		if (typeof d === 'number' && (ISO_WEEKDAY_NAMES as any)[d]) return (ISO_WEEKDAY_NAMES as any)[d];
		if (typeof d === 'string') {
			const upper = d.toUpperCase() as DayKey;
			const num = (DAY_MAP as any)[upper];
			if (num && (ISO_WEEKDAY_NAMES as any)[num]) return (ISO_WEEKDAY_NAMES as any)[num];
		}
		return String(d);
	}).join(', ');
}

function buildContextPrompt(
	anchorTempo: Tempo,
	timeZone: string,
	workingHours: TempoWorkingHours,
	busyEvents: Array<{ start: Tempo; end: Tempo; title?: string | undefined }>,
	durationMinutes: number
): string {
	const activeDays = formatActiveDays(workingHours.days);
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

function wrapScheduleInterval(interval: Interval<Tempo>, meta: TempoScheduleMeta): TempoScheduleResult {
	const frozenMeta = Object.freeze(meta);
	const boundMethodCache = new Map<PropertyKey, Function>();

	return new Proxy(interval, {
		get(target, prop) {
			if (Object.hasOwn(frozenMeta, prop))
				return (frozenMeta as any)[prop];

			if (prop === 'constructor')
				return Reflect.get(target, prop, target);

			if (boundMethodCache.has(prop))
				return boundMethodCache.get(prop);

			const val = Reflect.get(target, prop, target);
			if (isFunction(val)) {
				const bound = val.bind(target);
				boundMethodCache.set(prop, bound);
				return bound;
			}
			return val;
		},
		has(target, prop) {
			if (Object.hasOwn(frozenMeta, prop)) return true;
			return Reflect.has(target, prop);
		},
		getOwnPropertyDescriptor(target, prop) {
			if (Object.hasOwn(frozenMeta, prop)) {
				return {
					value: (frozenMeta as any)[prop],
					writable: false,
					configurable: true,
					enumerable: true,
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
		},
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

	if (!availableProviders || availableProviders.length === 0)
		throw new TempoAiError('No AI providers configured for scheduleAI. Call initAI() or supply providers in options.', 400);

	assertNoReservedProviderId(availableProviders);

	const resolvedTz = options?.timeZone
		|| (options?.anchor instanceof Tempo ? options.anchor.config?.timeZone || options.anchor.tz : undefined)
		|| Tempo.options?.timeZone
		|| 'UTC';
	const anchorTempo = new Tempo(options?.anchor, { timeZone: resolvedTz });
	const timeZone = options?.timeZone || anchorTempo.tz || 'UTC';
	const workingHours: TempoWorkingHours = {
		start: options?.workingHours?.start ?? '09:00',
		end: options?.workingHours?.end ?? '17:00',
		days: options?.workingHours?.days ?? [1, 2, 3, 4, 5],
		timeZone: options?.workingHours?.timeZone ?? timeZone,
	}

	const rawBusy = options?.events ?? options?.intervals;
	const busyEvents = normalizeBusyEvents(rawBusy, timeZone);
	const durationMinutes = parseDurationMinutes(prompt, options?.durationMinutes);

	const contextString = buildContextPrompt(anchorTempo, timeZone, workingHours, busyEvents, durationMinutes);
	const isDebug = Boolean(options?.debug ?? state.config.debug);
	const mode = options?.mode || state.config.mode || AiMode.Fallback;
	const callTimeout = options?.timeout ?? state.config.timeout ?? 15000;

	const winningCandidate = await executeWithMode<any>(
		mode,
		availableProviders,
		async (provider, signal) => {
			const { rawContent, providerId, rateLimits } = await fetchFromProvider(
				provider,
				prompt,
				contextString,
				isDebug,
				signal,
				callTimeout,
				SCHEDULE_SYSTEM_PROMPT,
			);

			const cleanContent = rawContent.replace(/^```json\s*/i, '').replace(/\s*```$/i, '');
			let parsed: any;
			try {
				parsed = JSON.parse(cleanContent);
			} catch {
				throw new TempoAiError(`Provider ${provider.id} returned invalid JSON payload.`, 422);
			}

			if (!parsed.start || !parsed.end)
				throw new TempoAiError(`Provider ${provider.id} missing start or end ISO timestamp.`, 422);

			let finalStart: Tempo;
			let finalEnd: Tempo;
			try {
				finalStart = new Tempo(parsed.start, { timeZone });
				finalEnd = new Tempo(parsed.end, { timeZone });
			} catch {
				throw new TempoAiError(`Provider ${provider.id} returned unparseable start or end timestamp.`, 422);
			}

			if (finalEnd.epoch.ms <= finalStart.epoch.ms)
				throw new TempoAiError(`Provider ${provider.id} proposed end time before or equal to start time.`, 422);

			const startKey = finalStart.format('{yyyy}-{mm}-{dd}T{hh}:{mi}:{ss}');
			const endKey = finalEnd.format('{yyyy}-{mm}-{dd}T{hh}:{mi}:{ss}');

			return {
				data: {
					parsed,
					startTempo: finalStart,
					endTempo: finalEnd,
					summary: parsed.summary || `Scheduled slot ${finalStart.format('{yyyy}-{mm}-{dd} {hh}:{mi}')} to ${finalEnd.format('{hh}:{mi}')}`,
					reasoning: parsed.reasoning || 'Resolved slot via AI scheduler.',
					alternatives: Array.isArray(parsed.alternatives) ? parsed.alternatives : [],
				},
				providerId,
				rateLimits,
				confidence: isNumber(parsed.confidence) ? parsed.confidence : 0.9,
				consensusKey: `${startKey}::${endKey}`,
			};
		},
		{ minConfidence: options?.minConfidence ?? state.config.minConfidence, debug: isDebug, tag: 'tempo-plugin-ai:schedule' },
	);

	_state.limits = winningCandidate.rateLimits ?? null;

	const { data: scheduleData, providerId } = winningCandidate;
	const confidence = typeof winningCandidate.confidence === 'number' ? winningCandidate.confidence : 0.9;

	const minConf = options?.minConfidence ?? state.config.minConfidence ?? 0.0;
	if (confidence < minConf)
		throw new TempoAiError(`scheduleAI confidence (${confidence}) is below the required threshold of ${minConf}`, 422);

	let finalStart = scheduleData.startTempo;
	let finalEnd = scheduleData.endTempo;
	let conflictBumped = false;
	let originalSlot: TempoInterval | undefined;

	const whStartStr = workingHours.start ?? '09:00';
	const whEndStr = workingHours.end ?? '17:00';
	const [whStartH, whStartM] = whStartStr.split(':').map(v => parseInt(v, 10) || 0);
	const [whEndH, whEndM] = whEndStr.split(':').map(v => parseInt(v, 10) || 0);
	const whTz = workingHours.timeZone || timeZone;

	const rawDays = Array.isArray(workingHours.days) ? workingHours.days : [1, 2, 3, 4, 5];
	const validDays = rawDays
		.map(d => {
			if (typeof d === 'number' && Number.isInteger(d) && d >= 1 && d <= 7) return d;
			if (typeof d === 'string') {
				const upper = d.toUpperCase() as DayKey;
				if (upper in DAY_MAP) return (DAY_MAP as any)[upper];
				const n = parseInt(d, 10);
				if (Number.isInteger(n) && n >= 1 && n <= 7) return n;
			}
			return null;
		})
		.filter((d): d is number => d !== null);

	const activeDaysSet = new Set<number>(validDays.length > 0 ? validDays : [1, 2, 3, 4, 5]);

	const advanceToNextActiveDay = (curZdt: Temporal.ZonedDateTime): Temporal.ZonedDateTime => {
		let next = curZdt.add({ days: 1 }).startOfDay().add({ hours: whStartH, minutes: whStartM });
		while (!activeDaysSet.has(next.dayOfWeek)) {
			next = next.add({ days: 1 });
		}
		return next;
	};

	// Deterministic Conflict Validation using core Interval.overlaps()
	let proposedInterval = new Interval(finalStart, finalEnd);
	let conflictingEvent = busyEvents.find(b => proposedInterval.overlaps(new Interval(b.start, b.end)));

	let reasoning = scheduleData.reasoning;
	if (conflictingEvent) {
		conflictBumped = true;
		originalSlot = { start: finalStart, end: finalEnd };

		const MAX_ADJUSTMENT_ITERATIONS = 50;
		let iterations = 0;
		let lastConflictingEvent = conflictingEvent;

		// Continue bumping and re-checking until slot is valid against busyEvents and workingHours
		while (iterations < MAX_ADJUSTMENT_ITERATIONS) {
			iterations++;

			// Bump start to the end of the conflicting event
			finalStart = new Tempo(lastConflictingEvent.end, { timeZone });
			finalEnd = finalStart.add(`${durationMinutes} minutes`);

			// Validate and adjust against working hours and active days
			const startZdt = finalStart.toDateTime().withTimeZone(whTz);
			const endZdt = finalEnd.toDateTime().withTimeZone(whTz);

			if (!activeDaysSet.has(startZdt.dayOfWeek)) {
				const nextZdt = advanceToNextActiveDay(startZdt);
				finalStart = new Tempo(nextZdt, { timeZone });
				finalEnd = finalStart.add(`${durationMinutes} minutes`);
			} else {
				const dayStart = startZdt.startOfDay().add({ hours: whStartH, minutes: whStartM });
				const dayEnd = startZdt.startOfDay().add({ hours: whEndH, minutes: whEndM });

				if (startZdt.epochNanoseconds < dayStart.epochNanoseconds) {
					finalStart = new Tempo(dayStart, { timeZone });
					finalEnd = finalStart.add(`${durationMinutes} minutes`);
				} else if (endZdt.epochNanoseconds > dayEnd.epochNanoseconds) {
					const nextZdt = advanceToNextActiveDay(startZdt);
					finalStart = new Tempo(nextZdt, { timeZone });
					finalEnd = finalStart.add(`${durationMinutes} minutes`);
				}
			}

			// Re-check resulting interval against all busyEvents
			const currentInterval = new Interval(finalStart, finalEnd);
			const nextConflict = busyEvents.find(b => currentInterval.overlaps(new Interval(b.start, b.end)));

			if (nextConflict) {
				lastConflictingEvent = nextConflict;
				continue;
			}

			// Slot is valid against all busyEvents and workingHours
			break;
		}

		const conflictTitle = lastConflictingEvent?.title || 'Busy';
		reasoning = `[Adjusted for conflict] Shifted slot past conflicting event "${conflictTitle}" to ${finalStart.format('{yyyy}-{mm}-{dd} {hh}:{mi}')}. ${scheduleData.reasoning}`;
	}

	// Create actual Interval instance
	const rawInterval = new Interval(finalStart, finalEnd);

	// Process alternative slots into Interval instances
	const alternatives: Array<Interval<Tempo>> = scheduleData.alternatives
		.map((alt: any) => {
			try {
				const s = new Tempo(alt.start, { timeZone });
				const e = new Tempo(alt.end, { timeZone });
				return new Interval(s, e);
			} catch {
				return null;
			}
		})
		.filter((i: any): i is Interval<Tempo> => i !== null);

	const actualDuration = Math.round((finalEnd.epoch.ms - finalStart.epoch.ms) / 60000);

	return wrapScheduleInterval(rawInterval, {
		durationMinutes: actualDuration,
		summary: scheduleData.summary,
		reasoning,
		confidence,
		provider: providerId,
		alternatives,
		ai: {
			provider: providerId,
			confidence,
			conflictBumped,
			originalSlot,
			reasoning,
		},
	});
}
