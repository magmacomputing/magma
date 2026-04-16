import type { Prettify, Property } from '#library/type.library.js';
import type { Tempo } from '../tempo.class.js';

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
	install: (this: Tempo, t: typeof Tempo) => void;
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
 */
export interface Range {
	key: string;
	start: bigint;
	end: bigint;
	cycle?: number;
}

/**
 * ## ResolvedRange
 * Range with additional metadata.
 */
export interface ResolvedRange extends Range {
	label: string;
	active: boolean;
	index: number;
}
