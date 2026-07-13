import type { Options } from '../tempo.type.js';

/**
 * ## Plugin
 * Interface for general Tempo plugins (Modules/Extensions).
 */
export interface Plugin<T = any, O = Options> {
	name: string;
	version?: string;
	install: (this: T, t: T, options?: O) => void;
}

/**
 * ## Module
 * Type for Module plugins.
 */
export interface Module<T = any, O = Options> extends Plugin<T, O> {
	[key: string]: any;
}

/**
 * ## Extension
 * Type for Extension plugins.
 * @deprecated Use `Plugin` instead.
 */
export interface Extension<T = any, O = Options> extends Plugin<T, O> {
	[key: string]: any;
}