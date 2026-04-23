import type { Prettify, Property } from '#library/type.library.js';
import type { Tempo } from '../tempo.class.js';
import { TermError } from '#tempo/support';

export type TempoType = typeof Tempo & {
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

/** mapping of terms to their resolved values */
export type Terms = Property<any>;

/**
 * ## Plugin
 * Interface for general Tempo plugins (Modules/Extensions).
 */
export interface Plugin {
	name: string;
	install: (this: Tempo, t: TempoType) => void;
}

/**
 * ## Module
 * Type for Module plugins.
 */
export interface Module extends Plugin {
	[key: string]: any;
}

/**
 * ## Extension
 * Type for Extension plugins.
 */
export interface Extension extends Plugin {
	[key: string]: any;
}


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
// export interface ResolvedRange extends Range {
// 	label: string;
// 	active: boolean;
// 	index: number;
// }
export type ResolvedRange = Range & {
	start: Tempo;
	end: Tempo;
	scope?: string;
	label?: string;
	unit?: string;
	rollover?: string;
	[str: string]: any;
}