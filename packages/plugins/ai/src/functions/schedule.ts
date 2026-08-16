import { Tempo, Interval } from '@magmacomputing/tempo';
import { isString, isNumber, isFunction, DAY_MAP, ISO_WEEKDAY_NAMES, type DayKey } from '@magmacomputing/tempo/library';
import { TempoAiError } from '../core/error.js';
import { AiMode } from '../core/config.js';
import { _state } from '../core/init.js';
import { executeWithMode } from '../core/dispatch.js';
import {
	fetchFromProvider,
	getAvailableProviders,
	parseJsonPayload,
	validateMinConfidence,
} from '../core/support.js';
import { CUSTOM_INSPECT_SYMBOL, maskPii, attachCustomInspect } from '../core/logger.js';
import { RE_DURATION_MINUTES, RE_DURATION_HOURS, RE_ISO_WEEKDAY_DIGIT } from '../core/patterns.js';
import type { TempoScheduleOptions, TempoScheduleResult, TempoWorkingHours, TempoInterval, TempoScheduleMeta } from '../types/index.js';

function normalizeBusyEvents(rawEvents?: any[], timeZone = 'UTC'): Array<{ start: Tempo; end: Tempo; title?: string | undefined }> {
	if (!Array.isArray(rawEvents)) return [];

	const parsePoint = (val: any): Tempo => {
		if (!val) return new Tempo({ timeZone });
		if (Tempo.isTempo(val)) return val;
		return new Tempo(val, { timeZone });
	};

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
	const match = prompt.match(RE_DURATION_MINUTES);
	if (match) return parseInt(match[1], 10);
	const hourMatch = prompt.match(RE_DURATION_HOURS);
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
	const inspectableMeta = attachCustomInspect({ ...meta }, (obj, isProd) => ({
		start: interval.start?.toString(),
		end: interval.end?.toString(),
		durationMinutes: obj.durationMinutes,
		summary: maskPii(obj.summary, isProd),
		confidence: obj.confidence,
		provider: obj.provider,
		...(obj.reasoning !== undefined ? { reasoning: maskPii(obj.reasoning, isProd) } : {}),
		...(obj.ai ? {
			ai: {
				provider: obj.ai.provider,
				confidence: obj.ai.confidence,
				cached: obj.ai.cached,
				conflictBumped: obj.ai.conflictBumped,
				...(obj.ai.reasoning !== undefined ? { reasoning: maskPii(obj.ai.reasoning, isProd) } : {}),
			},
		} : {}),
	}));

	const boundMethodCache = new Map<PropertyKey, Function>();
	const carrier = Object.create(interval);
	Object.assign(carrier, inspectableMeta);
	attachCustomInspect(carrier, (_obj, isProd) => {
		const inspectFn = (inspectableMeta as any)[CUSTOM_INSPECT_SYMBOL];
		return typeof inspectFn === 'function' ? inspectFn() : inspectableMeta;
	});

	return new Proxy(carrier, {
		get(target, prop) {
			if (prop === CUSTOM_INSPECT_SYMBOL)
				return (inspectableMeta as any)[CUSTOM_INSPECT_SYMBOL];

			if (prop === 'toJSON')
				return (inspectableMeta as any).toJSON;

			if (Object.hasOwn(inspectableMeta, prop))
				return (inspectableMeta as any)[prop];

			if (prop === 'constructor')
				return Interval;

			if (boundMethodCache.has(prop))
				return boundMethodCache.get(prop);

			const val = Reflect.get(interval, prop, interval);
			if (isFunction(val)) {
				const bound = val.bind(interval);
				boundMethodCache.set(prop, bound);
				return bound;
			}
			return val;
		},
		has(target, prop) {
			if (prop === CUSTOM_INSPECT_SYMBOL || prop === 'toJSON') return true;
			if (Object.hasOwn(inspectableMeta, prop)) return true;
			return Reflect.has(interval, prop);
		},
		getOwnPropertyDescriptor(target, prop) {
			if (prop === CUSTOM_INSPECT_SYMBOL || prop === 'toJSON') {
				return {
					value: (inspectableMeta as any)[prop],
					writable: false,
					configurable: true,
					enumerable: false,
				};
			}
			if (Object.hasOwn(inspectableMeta, prop)) {
				return {
					value: (inspectableMeta as any)[prop],
					writable: false,
					configurable: true,
					enumerable: true,
				};
			}
			return Reflect.getOwnPropertyDescriptor(target, prop);
		},
		ownKeys(target) {
			const keys = Reflect.ownKeys(target).filter(k => k !== CUSTOM_INSPECT_SYMBOL && k !== 'toJSON');
			for (const k of Object.keys(inspectableMeta)) {
				if (k !== 'toJSON' && !keys.includes(k))
					keys.push(k);
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
	const availableProviders = getAvailableProviders(options);

	const resolvedTz = options?.timeZone
		|| (options?.anchor instanceof Tempo ? options.anchor.tz : undefined)
		|| Tempo.options?.timeZone
		|| 'UTC';
	const anchorTempo = new Tempo(options?.anchor as any, { timeZone: resolvedTz });
	const timeZone = options?.timeZone || anchorTempo.tz || 'UTC';
	const workingHours: TempoWorkingHours = {
		start: options?.workingHours?.start ?? '09:00',
		end: options?.workingHours?.end ?? '17:00',
		days: options?.workingHours?.days ?? [1, 2, 3, 4, 5],
		timeZone: options?.workingHours?.timeZone ?? timeZone,
	};

	const rawBusy = options?.events ?? options?.intervals;
	const busyEvents = normalizeBusyEvents(rawBusy, timeZone);
	const durationMinutes = parseDurationMinutes(prompt, options?.durationMinutes);

	const contextString = buildContextPrompt(anchorTempo, timeZone, workingHours, busyEvents, durationMinutes);
	const isDebug = Boolean(options?.debug ?? state.config.debug);
	const mode = options?.mode || state.config.mode || AiMode.Fallback;
	const callTimeout = options?.timeout ?? state.config.timeout ?? 15000;
	const effectiveMinConfidence = validateMinConfidence(options?.minConfidence, 'scheduleAI');

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

			const parsed = parseJsonPayload<any>(rawContent, providerId);

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
		{ minConfidence: effectiveMinConfidence, debug: isDebug, tag: 'tempo-plugin-ai:schedule', hedgeDelay: options?.hedgeDelay ?? state.config.hedgeDelay },
	);

	_state.limits = winningCandidate.rateLimits ?? null;

	const { data: scheduleData, providerId } = winningCandidate;
	const confidence = typeof winningCandidate.confidence === 'number' ? winningCandidate.confidence : 0.9;

	if (effectiveMinConfidence !== undefined && confidence < effectiveMinConfidence)
		throw new TempoAiError(`scheduleAI confidence (${confidence}) is below the required threshold of ${effectiveMinConfidence}`, 422);

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
				const trimmed = d.trim();
				const upper = trimmed.toUpperCase() as DayKey;
				if (upper in DAY_MAP) return (DAY_MAP as any)[upper];
				if (RE_ISO_WEEKDAY_DIGIT.test(trimmed)) return Number(trimmed);
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

	// Deterministic Conflict & Working Hours Validation using core Interval.overlaps()
	const MAX_ADJUSTMENT_ITERATIONS = 50;
	let iterations = 0;
	let lastConflictingEvent: any = null;
	let slotSatisfied = false;

	while (iterations < MAX_ADJUSTMENT_ITERATIONS) {
		iterations++;

		// Validate and adjust against working hours and active days
		const startZdt = finalStart.toDateTime().withTimeZone(whTz);
		const endZdt = finalEnd.toDateTime().withTimeZone(whTz);

		if (!activeDaysSet.has(startZdt.dayOfWeek)) {
			conflictBumped = true;
			if (!originalSlot) originalSlot = { start: scheduleData.startTempo, end: scheduleData.endTempo };
			const nextZdt = advanceToNextActiveDay(startZdt);
			finalStart = new Tempo(nextZdt, { timeZone });
			finalEnd = finalStart.add(`${durationMinutes} minutes`);
			continue;
		}

		const dayStart = startZdt.startOfDay().add({ hours: whStartH, minutes: whStartM });
		const dayEnd = startZdt.startOfDay().add({ hours: whEndH, minutes: whEndM });

		if (startZdt.epochNanoseconds < dayStart.epochNanoseconds) {
			conflictBumped = true;
			if (!originalSlot) originalSlot = { start: scheduleData.startTempo, end: scheduleData.endTempo };
			finalStart = new Tempo(dayStart, { timeZone });
			finalEnd = finalStart.add(`${durationMinutes} minutes`);
			continue;
		} else if (endZdt.epochNanoseconds > dayEnd.epochNanoseconds) {
			conflictBumped = true;
			if (!originalSlot) originalSlot = { start: scheduleData.startTempo, end: scheduleData.endTempo };
			const nextZdt = advanceToNextActiveDay(startZdt);
			finalStart = new Tempo(nextZdt, { timeZone });
			finalEnd = finalStart.add(`${durationMinutes} minutes`);
			continue;
		}

		// Re-check resulting interval against all busyEvents
		const currentInterval = new Interval(finalStart, finalEnd);
		const nextConflict = busyEvents.find(b => currentInterval.overlaps(new Interval(b.start, b.end)));

		if (nextConflict) {
			conflictBumped = true;
			if (!originalSlot) originalSlot = { start: scheduleData.startTempo, end: scheduleData.endTempo };
			lastConflictingEvent = nextConflict;
			finalStart = new Tempo(nextConflict.end, { timeZone });
			finalEnd = finalStart.add(`${durationMinutes} minutes`);
			continue;
		}

		// Slot is valid against all busyEvents and workingHours
		slotSatisfied = true;
		break;
	}

	if (!slotSatisfied)
		throw new TempoAiError(`Unable to find an available schedule slot within ${MAX_ADJUSTMENT_ITERATIONS} iterations`, 422);

	let reasoning = scheduleData.reasoning;
	if (conflictBumped) {
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
			cached: false,
			conflictBumped,
			originalSlot,
			reasoning,
		},
	});
}
