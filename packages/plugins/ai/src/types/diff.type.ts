import type { AiBaseOptions, TempoBaseAiResult } from './base.type.js';

/**
 * ## TempoAiDiffResult
 * The calculated and AI-formatted natural difference between two date-time points.
 */
export interface TempoAiDiffResult extends TempoBaseAiResult {
	/** Human-friendly, contextual narrative text summarizing the difference */
	formatted: string;
	/** Total calendar days between start and end */
	days?: number | undefined;
	/** Total elapsed calendar hours between start and end */
	hours?: number | undefined;
	/** Total business working days (excluding weekends and matching holidays) between start and end */
	businessDays?: number | undefined;
	/** List of holiday dates (YYYY-MM-DD) encountered within the interval */
	holidays?: string[] | undefined;
}

/**
 * ## DiffPair
 * Input pair representation for batch diff processing.
 */
export interface DiffPair {
	start: any;
	end: any;
	prompt?: string | undefined;
}

/**
 * ## AiDiffOptions
 * Configuration options passed to `diffAI(start, end, prompt, options)`.
 */
export interface AiDiffOptions extends AiBaseOptions {
	/** Optional target timeZone for relative calculation and business day boundaries */
	timeZone?: string | undefined;
	/** Optional target locale override for language/formatting specific output */
	locale?: string | string[] | undefined;
	/** Explicit array of holiday dates to exclude from business days (format: 'YYYY-MM-DD') */
	holidays?: string[] | undefined;
	/** Expected country/region code (e.g. 'AU', 'US') */
	region?: string | undefined;
	/** Allow extra custom properties */
	[key: string]: any;
}
