import type { Tempo, Interval } from '@magmacomputing/tempo';
import type { DayKey } from '@magmacomputing/tempo/library';
import type { TempoBaseAiMeta } from './common.type.js';
import type { AiParseOptions } from './parse.type.js';

/**
 * ## TempoWorkingHours
 * Defines daily working hour boundaries and active weekdays for scheduling.
 */
export interface TempoWorkingHours {
	/** Start time of working day in HH:mm format (default: '09:00') */
	start?: string;
	/** End time of working day in HH:mm format (default: '17:00') */
	end?: string;
	/** Active working weekdays (1 = Monday, ... 7 = Sunday; or tokens like 'MO', 'MON'; default: [1, 2, 3, 4, 5]) */
	days?: Array<number | DayKey | string>;
	/** Target timeZone for working hours (defaults to anchor or options timeZone) */
	timeZone?: string;
}

/**
 * ## TempoInterval
 * Continuous date-time interval boundary pair.
 */
export interface TempoInterval {
	/** Start boundary as a Tempo instance */
	start: Tempo;
	/** End boundary as a Tempo instance */
	end: Tempo;
}

/**
 * ## TempoScheduleOptions
 * Options passed to `scheduleAI(prompt, options)`.
 */
export interface TempoScheduleOptions extends AiParseOptions {
	/** Target slot duration in minutes (if not explicitly specified in prompt) */
	durationMinutes?: number;
	/** Working hours configuration for slot resolution */
	workingHours?: TempoWorkingHours;
	/** Existing booked events or busy intervals to avoid */
	events?: Array<{ start: any; end: any; title?: string }> | Array<TempoInterval | Interval<Tempo>>;
	/** Alias for events */
	intervals?: Array<{ start: any; end: any; title?: string }> | Array<TempoInterval | Interval<Tempo>>;
	/** Search window start constraint */
	after?: any;
	/** Search window end constraint */
	before?: any;
	/** Preferred slot positioning ('earliest' | 'latest' | 'morning' | 'afternoon' | string) */
	preference?: string;
	/** Number of alternative slots to return if requesting multiple options */
	count?: number;
}

/**
 * ## TempoScheduleAiMeta
 * Extended AI execution metadata attached to scheduling results and intervals.
 */
export interface TempoScheduleAiMeta extends TempoBaseAiMeta {
	/** Whether this slot was bumped due to a conflict */
	readonly conflictBumped?: boolean | undefined;
	/** The original un-bumped candidate slot if conflict bumping occurred */
	readonly originalSlot?: TempoInterval | Interval<Tempo> | undefined;
}

/**
 * ## TempoScheduleMeta
 * Metadata overlay attached to the Interval instance by `wrapScheduleInterval`.
 */
export interface TempoScheduleMeta {
	/** Target slot duration in minutes */
	durationMinutes: number;
	/** Human-friendly summary of the scheduled slot */
	summary: string;
	/** Reasoning / explanation of why this slot was selected */
	reasoning?: string | undefined;
	/** Confidence rating from 0.0 (unparseable) to 1.0 (certain) */
	confidence: number;
	/** Provider ID responsible for processing or 'native-scheduler' */
	provider: string;
	/** Alternative backup intervals identified during scheduling */
	alternatives?: Interval<Tempo>[] | undefined;
	/** Extended AI execution metadata */
	ai: TempoScheduleAiMeta;
}

/**
 * ## TempoScheduleResult
 * Structured scheduling result returned by `scheduleAI`.
 */
export interface TempoScheduleResult extends Interval<Tempo>, TempoScheduleMeta {
	/** Resolved start boundary as a Tempo instance */
	start: Tempo;
	/** Resolved end boundary as a Tempo instance */
	end: Tempo;
}

