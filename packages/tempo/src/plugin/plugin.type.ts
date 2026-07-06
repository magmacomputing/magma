/**
 * ## Plugin
 * Interface for general Tempo plugins (Modules/Extensions).
 */
export interface Plugin<T = any> {
	name: string;
	install: (this: T, t: T) => void;
}

/**
 * ## Module
 * Type for Module plugins.
 */
export interface Module<T = any> extends Plugin<T> {
	[key: string]: any;
}

/**
 * ## Extension
 * Type for Extension plugins.
 * @deprecated Use `Plugin` instead.
 */
export interface Extension<T = any> extends Plugin<T> {
	[key: string]: any;
}