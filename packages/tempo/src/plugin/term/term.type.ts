import type { Property } from '#library/type.library.js';
import type { Tempo } from '../../tempo.class.js';
import { TermError } from '#tempo/support';

/**
 * ## TempoTermType
 * Specialized Tempo class type including term resolution error handling.
 */
export type TempoTermType = typeof Tempo & {
	[TermError]?: (config: any, term: string) => void;
}

/**
 * ## TermPlugin
 * Interface for term-driven parsing and resolution.
 */
export interface TermPlugin {
	/** Unique identifier for the term */
	key: string;
	/** Optional secondary alias keys for the term */
	aliases?: string[];
	/** Version of the term plugin */
	version?: string;
	/** Scope or category of the term */
	scope?: string;
	/** Human-readable description of the term */
	description?: string;
	/** Locale-specific term translations */
	locale?: Record<string, string | Function>;
	/** Grouping information for the term */
	groups?: any;
	/** Array of time ranges this term represents */
	ranges?: any[];
	/** Resolves the term to concrete time ranges */
	resolve?: (this: Tempo, anchor?: any, alias?: string) => Range[];
	/** Defines the term's value or range */
	define: (this: Tempo, keyOnly?: boolean, anchor?: any, alias?: string) => string | Range | Range[] | undefined | null;
}


/** mapping of terms to their resolved values */
export type Terms = Property<any>;

/**
 * ## Range
 * Discrete time interval within a specific term.
 * 
 * When Range.year is a number it is interpreted as a relative offset if |year| ≤ 10 
 * and as an absolute year otherwise.
 */
export type Range = {
	/** Unique identifier for the range */
	key: string | null;
	/** Categorization marker (e.g. 'western', 'chinese', 'fiscal') */
	group?: string;
	[meta: string]: any;
} & (
		/** Year value or offset */ { year: number } |
		/** Month value (1-12) */ { month: number } |
		/** Week value */ { week: number } |
		/** Day value */ { day: number } |
		/** Hour value (0-23) */ { hour: number } |
		/** Minute value (0-59) */ { minute: number } |
		/** Second value (0-59) */ { second: number } |
		/** Millisecond value */ { millisecond: number } |
		/** Microsecond value */ { microsecond: number } |
		/** Nanosecond value */ { nanosecond: number }
	) & {
		/** Optional year override */
		year?: number;
		/** Optional month override */
		month?: number;
		/** Optional week override */
		week?: number;
		/** Optional day override */
		day?: number;
		/** Optional hour override */
		hour?: number;
		/** Optional minute override */
		minute?: number;
		/** Optional second override */
		second?: number;
		/** Optional millisecond override */
		millisecond?: number;
		/** Optional microsecond override */
		microsecond?: number;
		/** Optional nanosecond override */
		nanosecond?: number;
	}


/**
 * ## ResolvedRange
 * Range with additional metadata.
 */
export type ResolvedRange = Range & {
	/** Start boundary of the resolved range */
	start: Tempo;
	/** End boundary of the resolved range */
	end: Tempo;
	/** Scope or category of the term */
	scope?: string;
	/** Human-readable label for the range */
	label?: string;
	/** Locale-specific translations */
	locale?: Record<string, string | Function>;
	/** Primary unit for this range */
	unit?: string;
	/** Rollover behavior for the range */
	rollover?: string;
	[str: string]: any;
}
