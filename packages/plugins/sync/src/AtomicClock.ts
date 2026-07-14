import { Tempo } from '@magmacomputing/tempo';

export interface ClockOptions {
	/**
	 * Interval in milliseconds to update the clock.
	 * Default: 10
	 */
	interval?: number;
}

/**
 * # AtomicClock
 * The master clock that continuously writes the current system time to a SharedArrayBuffer.
 * This should only be instantiated once on the main thread (or a master worker).
 */
export class AtomicClock {
	#buffer: SharedArrayBuffer;
	#view: BigInt64Array;
	#timer: ReturnType<typeof setInterval> | null = null;
	#interval: number;

	constructor(options: ClockOptions = {}) {
		if (typeof SharedArrayBuffer === 'undefined') {
			throw new Error('[Tempo#sync] SharedArrayBuffer is not available in this environment. Ensure COOP/COEP headers are set, or use Node.js.');
		}

		// Allocate 8 bytes for a 64-bit integer (epoch in milliseconds)
		this.#buffer = new SharedArrayBuffer(8);
		this.#view = new BigInt64Array(this.#buffer);
		this.#interval = options.interval ?? 10;

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
		if (this.#timer) return;
		this.#timer = setInterval(() => this.#tick(), this.#interval);
		// Unref the timer in Node.js so it doesn't keep the process alive
		if (typeof (this.#timer as any).unref === 'function') {
			(this.#timer as any).unref();
		}
	}

	/**
	 * Stops the synchronization loop.
	 */
	stop(): void {
		if (this.#timer) {
			clearInterval(this.#timer);
			this.#timer = null;
		}
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
