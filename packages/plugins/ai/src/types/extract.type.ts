import type { Tempo } from '@magmacomputing/tempo';
import type { AiDateContextOptions, TempoBaseAiResult } from './base.type.js';

/**
 * Categorical classifications for extracted calendar events and temporal entities.
 */
export type TempoEventType = 'event' | 'deadline' | 'reminder' | 'point' | 'interval' | string;

/**
 * ## TempoExtractedEvent
 * A single temporal entity or calendar event extracted from unstructured text.
 */
export interface TempoExtractedEvent {
	/** Human-readable event title or description */
	label: string;
	/** Start date-time of the event as a native Tempo instance */
	start: Tempo;
	/** Optional end date-time of the event as a native Tempo instance */
	end?: Tempo | undefined;
	/** Entity category classification */
	type: TempoEventType;
	/** The exact text snippet/substring extracted from the source input */
	rawText?: string | undefined;
	/** Confidence rating from 0.0 (unparseable) to 1.0 (certain) */
	confidence: number;
}

/**
 * ## TempoAiExtractResult
 * The structured result returned by `extractAI` containing all extracted calendar events.
 */
export interface TempoAiExtractResult extends TempoBaseAiResult {
	/** Array of extracted events and temporal entities */
	events: TempoExtractedEvent[];
}

/**
 * ## AiExtractOptions
 * Configuration options passed to `extractAI(text, options)`.
 */
export interface AiExtractOptions extends AiDateContextOptions {
	/** Optional category filters to guide event identification (e.g. ['meeting', 'deadline']) */
	categories?: string[] | undefined;
	/** Optional maximum number of concurrent extraction requests when processing arrays (default: 4) */
	concurrency?: number | undefined;
}
