import { BatchOrchestrator, type BatchOptions } from './BatchOrchestrator.js';
import { definePlugin, type TempoPlugin } from '@magmacomputing/tempo/plugin-api';

export type { BatchOptions };

declare module '@magmacomputing/tempo' {
	namespace Tempo {
		function batch(epochs: number[], operation: string, options?: BatchOptions): Promise<any[]>;
	}
}

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
