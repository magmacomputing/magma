import type { Tempo } from '@magmacomputing/tempo';
import type { AiParseOptions } from './parse.type.js';

/**
 * ## TempoRecurrenceOptions
 * Options passed to `recurrenceAI(input, options)`.
 */
export interface TempoRecurrenceOptions extends AiParseOptions {
	/** Start date/time window for occurrence expansion */
	after?: Tempo | Date | string | number | undefined;
	/** End date/time window for occurrence expansion */
	before?: Tempo | Date | string | number | undefined;
	/** Number of occurrences to pull per batch (default: 5) */
	count?: number;
	/** Preferred BCP 47 locale tag for summary output (e.g. 'en-US', 'fr-FR', 'es-ES') */
	locale?: string;
}

/**
 * ## TempoRecurrenceResult
 * Structured multi-directional recurrence result returned by `recurrenceAI`.
 */
export interface TempoRecurrenceResult {
	/** Standard RFC 5545 RRULE string (e.g. 'FREQ=WEEKLY;BYDAY=TU') */
	rrule: string;
	/** Localized human-friendly summary of the schedule (e.g. 'Every Tuesday at 15:00') */
	summary: string;
	/** True if schedule has an explicit end date or count limit; false if infinite */
	isFinite: boolean;
	/** Total count of occurrences if finite, or Infinity (Number.POSITIVE_INFINITY) */
	size: number;
	/** Advances cursor and returns the next batch of N Tempo instances (default: 5) */
	take(count?: number): Tempo[];
	/** Lazy generator yielding Tempo instances on demand */
	[Symbol.iterator](): Generator<Tempo, void, unknown>;
	/** Confidence rating from 0.0 (unparseable) to 1.0 (certain) */
	confidence: number;
	/** Provider ID responsible for processing or 'rrule-parser' for native RRULE inputs */
	provider: string;
	/** Reasoning / explanation of the recurrence pattern */
	reasoning?: string | undefined;
}
