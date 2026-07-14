import os from 'node:os';
import { Worker } from 'node:worker_threads';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

// Workaround for worker.ts path in different environments
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const isTS = __filename.endsWith('.ts');
const WORKER_PATH = isTS ? path.join(__dirname, '../dist/worker.js') : path.join(__dirname, 'worker.js');

export interface BatchOptions {
	/**
	 * Number of threads to use. Defaults to the number of logical CPUs.
	 */
	threads?: number;
	/**
	 * Whether to rehydrate the result into an array of Tempo instances.
	 * If false (default), returns an array of raw epoch numbers.
	 */
	rehydrate?: boolean;
}

/**
 * Orchestrates the parallel execution of a mutation or formatting operation across an array of epochs.
 */
export class BatchOrchestrator {
	/**
	 * Transforms an array of epochs using a worker pool.
	 * @param epochs Array of raw millisecond epoch numbers.
	 * @param operation The tempo mutation string (e.g. '+1w') or format string (e.g. 'YYYY-MM-DD').
	 * @param options Execution options.
	 * @returns Array of transformed epochs or strings.
	 */
	static async transform(epochs: number[], operation: string, options: BatchOptions = {}): Promise<any[]> {
		if (epochs.length === 0) return [];

		const threadCount = options.threads ?? os.cpus().length;
		const chunkSize = Math.ceil(epochs.length / threadCount);

		// Feature Detection: Graceful Degradation
		if (typeof SharedArrayBuffer !== 'undefined') {
			return this._transformWithSAB(epochs, operation, threadCount, chunkSize, options);
		} else {
			return this._transformWithPostMessage(epochs, operation, threadCount, chunkSize, options);
		}
	}

	private static async _transformWithSAB(epochs: number[], operation: string, threadCount: number, chunkSize: number, options: BatchOptions): Promise<any[]> {
		// Allocate SAB for input and output. We use Float64Array for Javascript numbers (which are doubles).
		// Assuming for this prototype we are returning numbers (mutated epochs). 
		// If operation is a formatting string, we can't return strings via SAB easily. 
		// For simplicity, let's assume we are mutating epochs for SAB.
		// A full implementation would need a mechanism to handle strings or gracefully degrade to postMessage for string formatting.

		const inputBuffer = new SharedArrayBuffer(epochs.length * 8);
		const outputBuffer = new SharedArrayBuffer(epochs.length * 8);
		const inputView = new Float64Array(inputBuffer);

		for (let i = 0; i < epochs.length; i++) {
			inputView[i] = epochs[i];
		}

		const workers: Promise<void>[] = [];
		const actualThreads = Math.min(threadCount, Math.ceil(epochs.length / chunkSize));

		for (let i = 0; i < actualThreads; i++) {
			const startIdx = i * chunkSize;
			const endIdx = Math.min((i + 1) * chunkSize, epochs.length);

			const workerPromise = new Promise<void>((resolve, reject) => {
				const worker = new Worker(WORKER_PATH, {
					workerData: {
						mode: 'sab',
						inputBuffer,
						outputBuffer,
						startIdx,
						endIdx,
						operation
					}
				});
				worker.on('message', (msg: any) => {
					if (msg.status === 'done') resolve();
					else reject(new Error(msg.error));
				});
				worker.on('error', reject);
				worker.on('exit', (code: number) => {
					if (code !== 0) reject(new Error(`Worker stopped with exit code ${code}`));
				});
			});
			workers.push(workerPromise);
		}

		await Promise.all(workers);

		const outputView = new Float64Array(outputBuffer);
		const result = new Array(epochs.length);
		for (let i = 0; i < epochs.length; i++) {
			result[i] = outputView[i];
		}

		// (Optional) Rehydrate logic would go here if options.rehydrate === true
		return result;
	}

	private static async _transformWithPostMessage(epochs: number[], operation: string, threadCount: number, chunkSize: number, options: BatchOptions): Promise<any[]> {
		const workers: Promise<any[]>[] = [];
		const actualThreads = Math.min(threadCount, Math.ceil(epochs.length / chunkSize));

		for (let i = 0; i < actualThreads; i++) {
			const startIdx = i * chunkSize;
			const endIdx = Math.min((i + 1) * chunkSize, epochs.length);
			const chunk = epochs.slice(startIdx, endIdx);

			const workerPromise = new Promise<any[]>((resolve, reject) => {
				const worker = new Worker(WORKER_PATH, {
					workerData: {
						mode: 'postMessage',
						chunk,
						operation
					}
				});
				worker.on('message', (msg: any) => {
					if (msg.status === 'done') resolve(msg.result);
					else reject(new Error(msg.error));
				});
				worker.on('error', reject);
				worker.on('exit', (code: number) => {
					if (code !== 0) reject(new Error(`Worker stopped with exit code ${code}`));
				});
			});
			workers.push(workerPromise);
		}

		const resultsArray = await Promise.all(workers);
		return resultsArray.flat();
	}
}
