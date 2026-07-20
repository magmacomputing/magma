import { AtomicClock, ClockOptions } from './AtomicClock.js';
import { AtomicReader } from './AtomicReader.js';
import { definePlugin, type TempoPlugin } from '@magmacomputing/tempo/plugin-api';

export { AtomicClock, AtomicReader, ClockOptions };

declare module '@magmacomputing/tempo' {
	namespace Tempo {
		const sync: {
			/** Starts the master atomic clock on the current thread. */
			startClock(options?: ClockOptions): AtomicClock;
			/** Stops the master atomic clock. */
			stopClock(): void;
			/** Gets the SharedArrayBuffer from the master clock. */
			getBuffer(): SharedArrayBuffer;
			/** Synchronously reads the exact time from the provided SharedArrayBuffer. */
			now(buffer: SharedArrayBuffer): number;
			/** Synchronously reads the time and returns a new Tempo instance. */
			getTempo(buffer: SharedArrayBuffer): Tempo;
		}
	}
}

let _globalClock: AtomicClock | null = null;

/**
 * The Sync Plugin.
 * Exposes `Tempo.sync` for synchronizing time across multiple threads using SharedArrayBuffers.
 */
export const SyncPlugin: TempoPlugin = definePlugin({
	name: 'sync',
	install(TempoRef: any) {
		if (TempoRef.sync)
			return; // already installed

		TempoRef.sync = {
			/**
			 * Starts the master atomic clock on the current thread.
			 * Only call this once on the main thread.
			 */
			startClock(options?: ClockOptions): AtomicClock {
				if (_globalClock) {
					_globalClock.start();
					return _globalClock;
				}
				_globalClock = new AtomicClock(options);
				_globalClock.start();
				return _globalClock;
			},

			/**
			 * Stops the master atomic clock.
			 */
			stopClock(): void {
				if (_globalClock) {
					_globalClock.stop();
				}
			},

			/**
			 * Gets the SharedArrayBuffer from the master clock.
			 * Throws an error if startClock() hasn't been called.
			 */
			getBuffer(): SharedArrayBuffer {
				if (!_globalClock) {
					throw new Error('[Tempo#sync] Cannot get buffer. You must call Tempo.sync.startClock() first.');
				}
				return _globalClock.getBuffer();
			},

			/**
			 * Synchronously reads the exact time from the provided SharedArrayBuffer.
			 * Designed to be called from a Web Worker.
			 */
			now(buffer: SharedArrayBuffer): number {
				const reader = new AtomicReader(buffer);
				return reader.now();
			},

			/**
			 * Synchronously reads the time and returns a new Tempo instance.
			 */
			getTempo(buffer: SharedArrayBuffer): any {
				const reader = new AtomicReader(buffer);
				// The plugin system might pass the Tempo class constructor in TempoRef, 
				// so we use it to instantiate.
				return new TempoRef(reader.now());
			}
		};
	}
});
