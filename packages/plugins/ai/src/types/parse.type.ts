import type { AiDateContextOptions, TempoBaseAiMeta } from './base.type.js';

declare module '@magmacomputing/tempo' {
	interface Tempo {
		/** Frozen AI resolution metadata attached when parsed via parseAI */
		ai?: TempoParseAiMeta | undefined;
	}
}

/**
 * ## TempoParseAiMeta
 * Frozen AI resolution metadata attached to Tempo instances produced by `parseAI`.
 */
export interface TempoParseAiMeta extends TempoBaseAiMeta {
	/** Whether the result was retrieved from cache */
	readonly cached: boolean;
	/** Whether the input prompt had multiple possible interpretations */
	readonly ambiguous: boolean;
	/** Granularity level of the parsed date ('year' | 'month' | 'day' | 'hour' | 'minute' | 'second' | 'unknown') */
	readonly granularity: string;
	/** Raw un-augmented ISO 8601 string returned by the LLM (if applicable) */
	readonly rawIso?: string | undefined;
}

/**
 * ## AiParseOptions
 * Options passed to `parseAI(input, options)`.
 */
export interface AiParseOptions extends AiDateContextOptions {
	/** Target sphere override */
	sphere?: string | undefined;
	/** Allow extra options */
	[key: string]: any;
}
