import type { Prettify, Property } from '#library/type.library.js';
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
	key: string;
	scope?: string;
	description?: string;
	groups?: any;
	ranges?: any[];
	resolve?: (this: Tempo, anchor?: any) => Range[];
	define: (this: Tempo, keyOnly?: boolean, anchor?: any) => string | Range | Range[] | undefined;
}

/**
 * ## PremiumPlugin
 * Augmented TermPlugin metadata including licensing state.
 */
export interface PremiumPlugin extends Omit<TermPlugin, 'define' | 'resolve'> {
	status?: string;
	expires?: number;
	updated?: string;
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
export type Range = Prettify<{
	key: string;
	group?: string;																						// categorization marker (e.g. 'western', 'chinese', 'fiscal')
	[meta: string]: any;
} & (
		{ year: number } | { month: number } | { week: number } | { day: number } |
		{ hour: number } | { minute: number } | { second: number } |
		{ millisecond: number } | { microsecond: number } | { nanosecond: number }
	) & {
		year?: number;
		month?: number;
		week?: number;
		day?: number;
		hour?: number;
		minute?: number;
		second?: number;
		millisecond?: number;
		microsecond?: number;
		nanosecond?: number;
	}>;


/**
 * ## ResolvedRange
 * Range with additional metadata.
 */
export type ResolvedRange = Range & {
	start: Tempo;
	end: Tempo;
	scope?: string;
	label?: string;
	unit?: string;
	rollover?: string;
	[str: string]: any;
}
