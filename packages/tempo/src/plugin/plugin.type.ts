import type { Options } from '../tempo.type.js';

/**
 * ## Plugin
 * Interface for general Tempo plugins (Modules/Extensions).
 */
export interface Plugin<T = any, O = any> {
	name: string;
	version?: string;
	options?: O;
	install: (this: T, t: T, options?: O) => void;
	[key: string]: any;
}

/**
 * ## PluginDescriptor
 * Plugin descriptor carrying stashed call-site options.
 */
export type PluginDescriptor<T = any, O = any> = Plugin<T, O> & {
	options?: O;
	[key: string]: any;
};

/**
 * ## PluginFactory
 * Callable hybrid plugin definition that carries descriptor properties
 * and can also be invoked as a factory with call-site options.
 */
export type PluginFactory<T extends Plugin<any, any> = Plugin<any, any>, Opts = any> = T & {
	(options?: Opts): T & { options?: Opts };
};

/**
 * ## PluginTuple
 * A 2-element tuple pairing a plugin with its colocated options.
 */
export type PluginTuple<T = any, Opts = any> = [T, Opts];

/**
 * ## Module
 * Type for Module plugins.
 */
export interface Module<T = any, O = Options> extends Plugin<T, O> {
	[key: string]: any;
}