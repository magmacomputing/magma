import { Tempo } from '@magmacomputing/tempo';
import { BatchPlugin } from '../src/index.js';

describe('Batch Plugin', () => {
	it('should successfully register the Tempo.batch namespace', () => {
		Tempo.use(BatchPlugin);
		expect((Tempo as any).batch).toBeTypeOf('function');
	});

	it.todo('should successfully orchestrate a batch mutation (Requires Node 26+ native Temporal)', async () => {
		Tempo.use(BatchPlugin);
		const startEpoch = new Tempo().epoch.ms;
		const epochs = [startEpoch, startEpoch + 1000];

		// This will crash on Node 24 because the spawned worker isolate lacks the JS polyfill
		const result = await (Tempo as any).batch(epochs, '+1w', { weeks: 1 });

		expect(result).toHaveLength(2);
	});
});
