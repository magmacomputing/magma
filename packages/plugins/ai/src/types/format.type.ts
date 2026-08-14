import type { AiDateContextOptions, TempoBaseAiResult, TempoDateInput } from './base.type.js';

export type { TempoDateInput };

/**
 * ## TempoAiFormatResult
 * Structured contextual narrative formatting result returned by `formatAI`.
 */
export interface TempoAiFormatResult extends TempoBaseAiResult {
	/** Human-friendly, contextual narrative text summarizing the date-time */
	formatted: string;
}

/**
 * ## AiFormatOptions
 * Configuration options passed to `formatAI(date, prompt, options)`.
 */
export interface AiFormatOptions extends AiDateContextOptions {
	/** Desired formatting style or tone (e.g., 'casual', 'formal', 'concise', 'relative') */
	style?: string | undefined;
	/** Optional max concurrent provider requests for batch formatting (defaults to 4) */
	concurrency?: number | undefined;
}

/**
 * ## FormatItem
 * Input item for batch date formatting requests.
 */
export interface FormatItem {
	/** Target date-time input to format */
	date: TempoDateInput;
	/** Optional specific prompt/question for this item */
	prompt?: string | undefined;
	/** Per-item option overrides */
	options?: AiFormatOptions | undefined;
}
