import { Tempo } from '@magmacomputing/tempo';

/**
 * The client reader that reads the synchronized time from a SharedArrayBuffer.
 * This should be instantiated in Web Workers or worker_threads.
 */
export class AtomicReader {
	#view: BigInt64Array;

	constructor(buffer: SharedArrayBuffer) {
		if (typeof SharedArrayBuffer === 'undefined') {
			throw new Error('[Tempo#sync] SharedArrayBuffer is not available in this environment.');
		}
		if (!(buffer instanceof SharedArrayBuffer)) {
			throw new Error('[Tempo#sync] AtomicReader requires a SharedArrayBuffer instance.');
		}
		
		this.#view = new BigInt64Array(buffer);
	}

	/**
	 * Returns the exact synchronized epoch timestamp in nanoseconds.
	 * Executes in O(1) time with lock-free atomic read.
	 */
	nowNano(): bigint {
		return Atomics.load(this.#view, 0);
	}

	/**
	 * Returns the exact synchronized epoch timestamp in milliseconds.
	 */
	now(): number {
		// Lock-free atomic read from index 0 and convert nanoseconds to milliseconds
		return Number(this.nowNano() / 1_000_000n);
	}

	/**
	 * Convenience wrapper that returns a new Tempo instance representing the exact synchronized time.
	 */
	getTempo(): Tempo {
		return new Tempo(this.nowNano(), { timeStamp: 'ns' });
	}
}
