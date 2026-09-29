import { Tempo } from '@magmacomputing/tempo';
import { Singleton } from '@magmacomputing/tempo/library';
import { Finalizer } from '@magmacomputing/tempo/plugin/sdk';

export interface ClockOptions {
	/**
	 * Interval in milliseconds to update the clock.
	 * Default: 10
	 */
	interval?: number;
}

interface ClockState {
	timer: ReturnType<typeof setInterval> | null;
}

/**
 * The master clock that continuously writes the current system time to a SharedArrayBuffer.
 * This should only be instantiated once on the main thread (or a master worker).
 */
@Singleton
export class AtomicClock {
	#buffer: SharedArrayBuffer;
	#view: BigInt64Array;
	#interval: number;
	#state: ClockState;

	constructor(options: ClockOptions = {}) {
		if (typeof SharedArrayBuffer === 'undefined')
			throw new Error('[Tempo#sync] SharedArrayBuffer is not available in this environment. Ensure COOP/COEP headers are set, or use Node.js.');

		// Allocate 8 bytes for a 64-bit integer (epoch in nanoseconds)
		this.#buffer = new SharedArrayBuffer(8);
		this.#view = new BigInt64Array(this.#buffer);
		this.#interval = options.interval ?? 10;
		const state: ClockState = { timer: null };
		this.#state = state;

		Finalizer.register(this, () => {
			if (state.timer) {
				clearInterval(state.timer);
				state.timer = null;
			}
		});

		// Initialize the clock immediately
		this.#tick();
	}

	/**
	 * Returns the underlying SharedArrayBuffer to be passed to workers.
	 */
	getBuffer(): SharedArrayBuffer {
		return this.#buffer;
	}

	/**
	 * Starts the synchronization loop.
	 */
	start(): void {
		if (this.#state.timer) return;
		const view = this.#view;
		const timer = setInterval(() => {
			const nowNano = Tempo.now();
			Atomics.store(view, 0, nowNano);
		}, this.#interval);

		this.#state.timer = timer;
		// Unref the timer in Node.js so it doesn't keep the process alive
		if (typeof (timer as any).unref === 'function') {
			(timer as any).unref();
		}
	}

	/**
	 * Stops the synchronization loop.
	 */
	stop(): void {
		if (this.#state.timer) {
			clearInterval(this.#state.timer);
			this.#state.timer = null;
		}
	}

	/**
	 * Explicit deterministic disposal (Dual-Layer Lifecycle Model).
	 */
	[Symbol.dispose](): void {
		this.stop();
	}

	/**
	 * Writes the current exact time to the shared memory.
	 */
	#tick(): void {
		const nowNano = Tempo.now(); // returns epochNanoseconds as bigint
		// Lock-free atomic write to index 0
		Atomics.store(this.#view, 0, nowNano);
	}
}
