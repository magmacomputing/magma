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
export const NOOP: () => void = Object.freeze(() => { });

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
 * Combines multiple AbortSignals into a single composite signal using a cross-realm and duck-type safe controller.
 * Automatically filters out undefined or non-signal values and propagates the abort reason.
 * The returned signal provides a `cleanup()` method to detach listeners from parent signals early.
 *
 * @param signals - Array of AbortSignals (or undefined values)
 * @returns A composite AbortSignal with a cleanup teardown method
 */
export function anySignal(...signals: (AbortSignal | undefined)[]): AbortSignal {
	const valid = signals.filter(isAbortSignal);
	if (valid.length === 0) {
		const sig = new AbortController().signal as any;
		sig.cleanup = NOOP;
		sig[Symbol.dispose] = NOOP;
		return sig;
	}
	if (valid.length === 1) {
		const sig = valid[0]! as any;
		if (!sig.cleanup) {
			sig.cleanup = NOOP;
			sig[Symbol.dispose] = NOOP;
		}
		return sig;
	}

	for (const sig of valid) {
		if (sig.aborted) {
			const controller = new AbortController();
			controller.abort(sig.reason);
			const abortedSig = controller.signal as any;
			abortedSig.cleanup = NOOP;
			abortedSig[Symbol.dispose] = NOOP;
			return abortedSig;
		}
	}

	const controller = new AbortController();
	const unbinds: (() => void)[] = [];
	const cleanup = () => {
		for (const unbind of unbinds) unbind();
		unbinds.length = 0;
	};
	const trigger = (reason?: any) => {
		cleanup();
		if (!controller.signal.aborted)
			controller.abort(reason);
	};

	for (const sig of valid) {
		unbinds.push(onAbort(sig, () => trigger(sig.reason)));
	}

	const composite = controller.signal as any;
	composite.cleanup = cleanup;
	composite[Symbol.dispose] = cleanup;
	return composite;
}

/**
 * Creates an AbortSignal with a timeout in milliseconds, optionally composed with an existing parent signal.
 * The returned signal provides a `cleanup()` method to detach listeners from the parent signal early.
 *
 * @param ms - Timeout duration in milliseconds
 * @param parentSignal - Optional parent AbortSignal to combine with the timeout
 * @returns An AbortSignal that aborts when either the timeout expires or the parent signal aborts
 */
export function timeoutSignal(ms: number, parentSignal?: AbortSignal): AbortSignal {
	const timeout = isNumber(ms) && ms >= 0 ? ms : 0;
	const timeoutSig = AbortSignal.timeout(timeout);
	if (!isAbortSignal(parentSignal)) {
		const sig = timeoutSig as any;
		if (!sig.cleanup) {
			sig.cleanup = NOOP;
			sig[Symbol.dispose] = NOOP;
		}
		return sig;
	}
	return anySignal(parentSignal, timeoutSig);
}

/**
 * Safely releases a composed signal or timeout signal by unbinding its listeners from any parent signals.
 *
 * @param signal - The AbortSignal to clean up
 */
export function cleanupSignal(signal?: any): void {
	if (!signal) return;
	if (isCallable(signal.cleanup)) {
		signal.cleanup();
	} else if (isCallable(signal[Symbol.dispose])) {
		signal[Symbol.dispose]();
	}
}
