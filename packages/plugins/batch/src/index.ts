import { BatchOrchestrator, type BatchOptions } from './BatchOrchestrator.js';
import { definePlugin, type TempoPlugin } from '@magmacomputing/tempo/plugin/sdk';

export type { BatchOptions };

declare module '@magmacomputing/tempo' {
	namespace Tempo {
		/**
		 * Orchestrates the parallel execution of a mutation or formatting operation across an array of epochs.
		 * Automatically distributes the workload across a pool of Web Workers using SharedArrayBuffers (when available).
		 * 
		 * @param epochs - Array of raw millisecond epoch numbers to process
		 * @param operation - The tempo mutation string (e.g., '+1w')
		 * @param options - Execution options including thread count and return format
		 * @returns A promise resolving to an array of transformed epochs (or Tempo instances)
		 */
		function batch(epochs: number[], operation: string, options?: BatchOptions): Promise<any[]>;
	}
}

/**
 * The Batch Plugin.
 * Exposes `Tempo.batch()` for high-performance, multi-threaded array processing.
 */
export const BatchPlugin: TempoPlugin = definePlugin({
	name: 'batch',
	install(TempoRef: any) {
		if (TempoRef.batch) {
			return; // already installed
		}

		/**
		 * Orchestrates the parallel execution of a mutation or formatting operation across an array of epochs.
		 */
		TempoRef.batch = async function (epochs: number[], operation: string, options?: BatchOptions): Promise<any[]> {
			const results = await BatchOrchestrator.transform(epochs, operation, options);

			if (options?.rehydrate) {
				return results.map(epoch => new TempoRef(epoch));
			}
			return results;
		}
	}
});
