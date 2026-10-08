import {
	Aborter,
	isAbortSignal,
	isAbortController,
	onAbort,
	timeoutSignal,
	anySignal,
	NOOP,
} from '#library/aborter.library.js';

describe('Aborter & Signal Utilities', () => {
	describe('Aborter class (Disposable AbortController)', () => {
		it('instantiates and implements AbortController properties', () => {
			const aborter = new Aborter();
			expect(aborter).toBeInstanceOf(AbortController);
			expect(aborter.signal).toBeInstanceOf(AbortSignal);
			expect(aborter.signal.aborted).toBe(false);
			expect(String(aborter)).toBe('[object Aborter]');
		});

		it('supports static create factory', () => {
			const aborter = Aborter.create();
			expect(aborter).toBeInstanceOf(Aborter);
			expect(aborter.signal.aborted).toBe(false);
		});

		it('aborts manually when calling .abort()', () => {
			const aborter = new Aborter();
			aborter.abort('reason');
			expect(aborter.signal.aborted).toBe(true);
			expect(aborter.signal.reason).toBe('reason');
		});

		it('automatically aborts on explicit disposal [Symbol.dispose]()', () => {
			const aborter = new Aborter();
			expect(aborter.signal.aborted).toBe(false);
			aborter[Symbol.dispose]();
			expect(aborter.signal.aborted).toBe(true);
		});

		it('works cleanly with TC39 using syntax simulation', () => {
			let signalRef: AbortSignal;
			{
				using ac = new Aborter();
				signalRef = ac.signal;
				expect(signalRef.aborted).toBe(false);
			}
			expect(signalRef.aborted).toBe(true);
		});

		it('is idempotent when already aborted before disposal', () => {
			const aborter = new Aborter();
			aborter.abort('initial');
			expect(() => aborter[Symbol.dispose]()).not.toThrow();
			expect(aborter.signal.reason).toBe('initial');
		});
	});

	describe('isAbortSignal & isAbortController', () => {
		it('correctly identifies AbortSignal instances and duck-typed objects', () => {
			const controller = new AbortController();
			expect(isAbortSignal(controller.signal)).toBe(true);
			expect(isAbortSignal(AbortSignal.timeout(100))).toBe(true);

			// Duck typed
			expect(isAbortSignal({ aborted: false, addEventListener: () => { } })).toBe(true);

			// Invalid values
			expect(isAbortSignal(null)).toBe(false);
			expect(isAbortSignal(undefined)).toBe(false);
			expect(isAbortSignal('signal')).toBe(false);
			expect(isAbortSignal(123)).toBe(false);
			expect(isAbortSignal({})).toBe(false);
			expect(isAbortSignal({ aborted: false })).toBe(false);
		});

		it('correctly identifies AbortController instances and duck-typed objects', () => {
			const controller = new AbortController();
			const aborter = new Aborter();
			expect(isAbortController(controller)).toBe(true);
			expect(isAbortController(aborter)).toBe(true);

			// Duck typed
			expect(isAbortController({ signal: controller.signal, abort: () => { } })).toBe(true);

			// Invalid values
			expect(isAbortController(null)).toBe(false);
			expect(isAbortController(undefined)).toBe(false);
			expect(isAbortController({})).toBe(false);
			expect(isAbortController({ signal: controller.signal })).toBe(false);
		});
	});

	describe('onAbort', () => {
		it('returns shared NOOP unbind function when signal is undefined', () => {
			const cb = vi.fn();
			const unbind = onAbort(undefined, cb);
			expect(unbind).toBe(NOOP);
			expect(cb).not.toHaveBeenCalled();
			unbind();
			expect(cb).not.toHaveBeenCalled();
		});

		it('invokes callback immediately and returns NOOP if signal is already aborted', () => {
			const controller = new AbortController();
			controller.abort('pre-aborted');
			const cb = vi.fn();
			const unbind = onAbort(controller.signal, cb);
			expect(unbind).toBe(NOOP);
			expect(cb).toHaveBeenCalledTimes(1);
			unbind();
			expect(cb).toHaveBeenCalledTimes(1);
		});

		it('invokes callback when signal aborts later', () => {
			const controller = new AbortController();
			const cb = vi.fn();
			onAbort(controller.signal, cb);
			expect(cb).not.toHaveBeenCalled();

			controller.abort('fired');
			expect(cb).toHaveBeenCalledTimes(1);
		});

		it('unregisters listener early when unbind function is called', () => {
			const controller = new AbortController();
			const cb = vi.fn();
			const unbind = onAbort(controller.signal, cb);

			// Unbind early before abort occurs
			unbind();

			controller.abort();
			expect(cb).not.toHaveBeenCalled();
		});
	});

	describe('timeoutSignal', () => {
		it('creates a standalone timeout signal', async () => {
			const signal = timeoutSignal(20);
			expect(isAbortSignal(signal)).toBe(true);
			expect(signal.aborted).toBe(false);

			await new Promise((r) => setTimeout(r, 40));
			expect(signal.aborted).toBe(true);
		});

		it('handles negative or invalid timeout ms gracefully', () => {
			const signal = timeoutSignal(-10);
			expect(isAbortSignal(signal)).toBe(true);
		});

		it('combines with a parent signal and aborts if parent aborts first', () => {
			const parent = new AbortController();
			const combined = timeoutSignal(5000, parent.signal);
			expect(combined.aborted).toBe(false);

			parent.abort('parent-cancelled');
			expect(combined.aborted).toBe(true);
		});
	});

	describe('anySignal', () => {
		it('returns a fallback signal when no valid signals are passed', () => {
			const composite = anySignal(undefined, undefined);
			expect(isAbortSignal(composite)).toBe(true);
			expect(composite.aborted).toBe(false);
		});

		it('returns the single valid signal directly when only one is provided', () => {
			const controller = new AbortController();
			const composite = anySignal(undefined, controller.signal, undefined);
			expect(composite).toBe(controller.signal);
		});

		it('combines multiple signals and aborts if any signal aborts with correct reason', () => {
			const ac1 = new AbortController();
			const ac2 = new AbortController();
			const composite = anySignal(ac1.signal, ac2.signal);
			expect(composite.aborted).toBe(false);

			ac2.abort('ac2 fired');
			expect(composite.aborted).toBe(true);
			expect(composite.reason).toBe('ac2 fired');
		});

		it('works seamlessly with duck-typed / cross-realm signals', () => {
			let abortListener: (() => void) | undefined;
			const duckSignal: AbortSignal = {
				aborted: false,
				reason: undefined,
				addEventListener: (_event: string, listener: any) => {
					abortListener = listener;
				},
				removeEventListener: vi.fn()
			} as any;

			const nativeAc = new AbortController();
			const composite = anySignal(duckSignal, nativeAc.signal);
			expect(composite.aborted).toBe(false);

			(duckSignal as any).aborted = true;
			(duckSignal as any).reason = 'duck-aborted';
			abortListener?.();

			expect(composite.aborted).toBe(true);
			expect(composite.reason).toBe('duck-aborted');
		});

		it('immediately returns aborted signal when one of multiple signals is already aborted', () => {
			const preAborted = new AbortController();
			preAborted.abort('pre-reason');
			const live = new AbortController();

			const composite = anySignal(live.signal, preAborted.signal);
			expect(composite.aborted).toBe(true);
			expect(composite.reason).toBe('pre-reason');
		});
	});
});
