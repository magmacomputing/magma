import { isString } from './assertion.library.js';
import type { Logger } from './logger.class.js';

export interface BoundaryContext {
	/** 
	 * If true, errors will be caught, logged, and execution will return gracefully.
	 * If false, errors will be immediately thrown.
	 */
	catch?: boolean | undefined;

	/** 
	 * If true, suppresses the logger output when catch is true.
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
 */
export function raise(err: Error | string, context: BoundaryContext = {}): void {
	const error = isString(err) ? new Error(err) : err;

	// 1. Output the error telemetry
	if (!context.silent) {
		if (context.logger) {
			context.logger.error(error.message);
		} else {
			console.error(`[Boundary] ${error.message}`);
		}
	}

	// 2. Control flow
	if (context.catch)
		return;																									// gracefully swallow the error

	throw error;
}
