import type { AiBaseOptions, TempoBaseAiResult } from './base.type.js';

/**
 * ## TempoContext
 * The inferred regional and calendar settings resolved by `contextAI`.
 */
export interface TempoContext extends TempoBaseAiResult {
	/** Inferred IANA time zone identifier (e.g. 'America/New_York') */
	timeZone: string;
	/** Inferred BCP 47 language/region tag (e.g. 'en-US') */
	locale: string;
	/** Inferred Unicode calendar system type (e.g. 'gregory') */
	calendar: string;
	/** Inferred hemisphere, constrained strictly to 'north' or 'south' (omitted if unknowable) */
	sphere?: 'north' | 'south' | undefined;
}

/**
 * ## AiContextOptions
 * Configuration options passed to `contextAI(text, options)`.
 */
export interface AiContextOptions extends AiBaseOptions {
	/** Target timeZone override if evaluating against a specific baseline */
	timeZone?: string | undefined;
	/** Target locale override if evaluating against a specific baseline */
	locale?: string | string[] | undefined;
	/** Target calendar override if evaluating against a specific baseline */
	calendar?: string | undefined;
	/** Target sphere override if evaluating against a specific baseline */
	sphere?: string | undefined;
	/** Allow extra custom properties */
	[key: string]: any;
}
