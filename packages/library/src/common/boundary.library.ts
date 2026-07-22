import { isString } from './assertion.library.js';
import type { Logger } from './logger.class.js';

export interface BoundaryContext {
	/** 
	 * If true, errors will be caught, logged, and execution will return gracefully.
	 * If false, errors will be immediately thrown.
	 */
	catch?: boolean | undefined;

	/** 
	 * If true, suppresses telemetry/logging for `raise()` regardless of whether the error is rethrown or swallowed.
	 */
	silent?: boolean | undefined;

	/**
	 * The namespaced logger to use for outputting the caught error.
	 */
	logger?: Logger | null | undefined;
}

/**
 * Global Error Boundary Utility.
 * Decouples the decision to throw an error from the act of logging it.
 * 
 * @param err - The Error object or error string to raise
 * @param context - Optional boundary context configuration
 * @example
 * ```ts
 * raise('Invalid input', { catch: true, logger: myLogger });
 * ```
 */
export function raise(err: Error | string, context: BoundaryContext = {}): void {
	const error = isString(err) ? new Error(err) : err;

	// 1. Output the error telemetry
	if (!context.silent) {
		if (context.logger) {
			context.logger.error(error);
		} else {
			console.error('[Boundary]', error);
		}
	}

	// 2. Control flow
	if (context.catch)
		return;																									// gracefully swallow the error

	throw error;
}
