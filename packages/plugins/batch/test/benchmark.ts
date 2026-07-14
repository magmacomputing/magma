import './polyfill.js';
import { Tempo } from '@magmacomputing/tempo';
import { BatchPlugin } from '../src/index.js';

// Extend Tempo with the batch plugin
Tempo.extend(BatchPlugin);

async function runBenchmark() {
	console.log('=== TempoBatch Performance Benchmark ===');
	
	const count = 10_000;
	console.log(`Generating ${count} epochs...`);
	const epochs = new Array(count);
	const startEpoch = new Tempo().epoch.ms;
	for (let i = 0; i < count; i++) {
		epochs[i] = startEpoch + i * 1000;
	}

	console.log('\n[1] Main Thread Synchronous Map (Baseline)');
	const startSync = performance.now();
	const syncResult = new Array(count);
	for (let i = 0; i < count; i++) {
		const t = new Tempo(epochs[i]);
		t.add({ weeks: 1 });
		syncResult[i] = t.epoch;
	}
	const endSync = performance.now();
	console.log(`Sync Time: ${(endSync - startSync).toFixed(2)}ms`);

	console.log('\n[2] Parallel Batch Processing (Atomics/SAB if available)');
	const startBatch = performance.now();
	// @ts-ignore
	const batchResult = await Tempo.batch(epochs, { weeks: 1 } as any);
	const endBatch = performance.now();
	console.log(`Batch Time: ${(endBatch - startBatch).toFixed(2)}ms`);
	
	const speedup = (endSync - startSync) / (endBatch - startBatch);
	console.log(`\nResult: ${speedup.toFixed(2)}x Speedup!`);
}

runBenchmark().catch(console.error);
