import { workerData, parentPort } from 'node:worker_threads';
import { Tempo } from '@magmacomputing/tempo';

async function run() {
	if (!parentPort) return;

	const { mode, operation } = workerData;

	try {
		if (mode === 'sab') {
			const { inputBuffer, outputBuffer, startIdx, endIdx } = workerData;
			const inputView = new Float64Array(inputBuffer);
			const outputView = new Float64Array(outputBuffer);

			for (let i = startIdx; i < endIdx; i++) {
				const epoch = inputView[i];
				// Using Tempo to mutate. In a full implementation, we'd have robust parsing of the 'operation' string.
				// For this prototype, we assume the operation is an add operation (e.g. "+1w").
				// We get the mutated epoch number and put it back into the buffer.
				const t = new Tempo(epoch);
				(t as any).add(operation);
				outputView[i] = t.epoch.ms;
			}
			parentPort.postMessage({ status: 'done' });

		} else if (mode === 'postMessage') {
			const { chunk } = workerData;
			const result = new Array(chunk.length);

			for (let i = 0; i < chunk.length; i++) {
				const epoch = chunk[i];
				const t = new Tempo(epoch);
				(t as any).add(operation);
				result[i] = t.epoch.ms;
			}

			parentPort.postMessage({ status: 'done', result });
		}
	} catch (error: any) {
		parentPort.postMessage({ status: 'error', error: error.message || String(error) });
	}
}

run();
