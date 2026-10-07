import { StringTag } from '#library/decorator.library.js';
import { isDefined, isCallable, isNumber, isAbortSignal } from '#library/assertion.library.js';

export { isAbortSignal, isAbortController } from '#library/assertion.library.js';

/**
 * ## Aborter
 * Disposable AbortController implementing TC39 Disposable.
 * Automatically aborts the underlying signal upon scope exit via `using`.
 */
@StringTag('Aborter')
export class Aborter extends AbortController implements Disposable {
	/**
	 * Creates a new disposable Aborter controller.
	 */
	static create(): Aborter {
		return new Aborter();
	}

	/**
	 * TC39 explicit resource management hook.
	 * Automatically aborts the controller when exiting scope via `using`.
	 */
	[Symbol.dispose](): void {
		if (!this.signal.aborted) {
			this.abort();
		}
	}
}

/** Immutable shared noop function for null-object teardown patterns */
export const NOOP: () => void = Object.freeze(() => {});

/**
 * Safely binds an abort callback to an AbortSignal.
 * - If the signal is already aborted, invokes the callback immediately.
 * - If a signal is provided, attaches an event listener with `{ once: true }`.
 * - Returns a cleanup unbind function to safely detach the listener early (preventing memory leaks).
 *
 * @param signal - The AbortSignal to observe (optional)
 * @param callback - The callback to execute upon abort
 * @returns A teardown function that detaches the abort listener
 */
export function onAbort(signal: AbortSignal | undefined, callback: () => void): () => void {
	if (!signal) return NOOP;
	if (signal.aborted) {
		if (isCallable(callback)) callback();
		return NOOP;
	}
	const listener = () => {
		if (isCallable(callback)) callback();
	};
	signal.addEventListener('abort', listener, { once: true });
	return () => signal.removeEventListener('abort', listener);
}

/**
 * Creates an AbortSignal with a timeout in milliseconds, optionally composed with an existing parent signal.
 *
 * @param ms - Timeout duration in milliseconds
 * @param parentSignal - Optional parent AbortSignal to combine with the timeout
 * @returns An AbortSignal that aborts when either the timeout expires or the parent signal aborts
 */
export function timeoutSignal(ms: number, parentSignal?: AbortSignal): AbortSignal {
	const timeout = isNumber(ms) && ms >= 0 ? ms : 0;
	const timeoutSig = AbortSignal.timeout(timeout);
	return isAbortSignal(parentSignal) ? AbortSignal.any([parentSignal, timeoutSig]) : timeoutSig;
}

/**
 * Combines multiple AbortSignals into a single composite signal using `AbortSignal.any`.
 * Automatically filters out undefined or non-signal values.
 *
 * @param signals - Array of AbortSignals (or undefined values)
 * @returns A composite AbortSignal
 */
export function anySignal(...signals: (AbortSignal | undefined)[]): AbortSignal {
	const valid = signals.filter(isAbortSignal);
	if (valid.length === 0) return new AbortController().signal;
	if (valid.length === 1) return valid[0]!;
	return AbortSignal.any(valid);
}
