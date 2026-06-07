import { Tempo } from '#tempo';
import type { Options } from '#tempo/tempo.type.js';

import { getContext, CONTEXT } from '#library/utility.library.js';

export interface BenchmarkConfig {
	/** Array of raw strings to parse. */
	data: string[];
	/** Number of times to loop the dataset (helps smooth out JIT compiler warmup). Default: 1 */
	iterations?: number;
	/** Array of Tempo hydration modes to compare. Default: ['auto'] */
	modes?: Array<'auto' | 'strict' | 'defer'>;
	/** Compare the dataset against native `new Date()` for a baseline speed/failure metric. Default: false */
	baseline?: boolean;
}

export interface BenchmarkResult {
	name: string;
	totalTimeMs: number;
	microSecPerOp: number;
	successCount: number;
	failureCount: number;
	successRate: string;
	heapUsedDeltaMb?: string;
}

export class BenchmarkModule {
	/**
	 * Run the benchmark against the provided configuration.
	 */
	static run(TempoClass: any, config: BenchmarkConfig): BenchmarkResult[] {
		const results: BenchmarkResult[] = [];
		const iterations = config.iterations && config.iterations > 0 ? config.iterations : 1;
		const modes = config.modes || ['auto'];
		const totalOps = config.data.length * iterations;

		if (totalOps === 0) return [];

		const { type, global } = getContext();

		// Helper to measure memory (Node.js only)
		const getHeap = (): number => type === CONTEXT.NodeJS && global.process?.memoryUsage ? global.process.memoryUsage().heapUsed : 0;
		// Helper to measure time (Performance API if available, else Date)
		const getTime = (): number => typeof global.performance !== 'undefined' ? global.performance.now() : Date.now();

		// Baseline (Native Date)
		if (config.baseline) {
			let success = 0;
			let failure = 0;

			const startMem = getHeap();
			const startTime = getTime();

			for (let i = 0; i < iterations; i++) {
				for (let j = 0; j < config.data.length; j++) {
					const d = new Date(config.data[j]);
					if (isNaN(d.getTime())) {
						failure++;
					} else {
						success++;
					}
				}
			}

			const endTime = getTime();
			const endMem = getHeap();

			const totalTimeMs = endTime - startTime;
			results.push({
				name: 'Native Date',
				totalTimeMs: Number(totalTimeMs.toFixed(2)),
				microSecPerOp: totalTimeMs > 0 ? Number(((totalTimeMs * 1000) / totalOps).toFixed(2)) : 0,
				successCount: success,
				failureCount: failure,
				successRate: ((success / totalOps) * 100).toFixed(1) + '%',
				...(endMem > 0 ? { heapUsedDeltaMb: ((endMem - startMem) / 1024 / 1024).toFixed(2) } : {})
			});
		}

		// Tempo Modes
		for (const mode of modes) {
			let success = 0;
			let failure = 0;

			const startMem = getHeap();
			const startTime = getTime();

			for (let i = 0; i < iterations; i++) {
				for (let j = 0; j < config.data.length; j++) {
					try {
						const t = new TempoClass(config.data[j], { mode });
						// For mode: 'defer', the parsing is deferred. To actually measure parse time, 
						// we must access a property to trigger hydration, otherwise it's just measuring proxy creation.
						// We'll access .isValid which safely triggers hydration.
						if (t.isValid) {
							success++;
						} else {
							failure++;
						}
					} catch {
						failure++;
					}
				}
			}

			const endTime = getTime();
			const endMem = getHeap();

			const totalTimeMs = endTime - startTime;
			results.push({
				name: `Tempo (mode: ${mode})`,
				totalTimeMs: Number(totalTimeMs.toFixed(2)),
				microSecPerOp: totalTimeMs > 0 ? Number(((totalTimeMs * 1000) / totalOps).toFixed(2)) : 0,
				successCount: success,
				failureCount: failure,
				successRate: ((success / totalOps) * 100).toFixed(1) + '%',
				...(endMem > 0 ? { heapUsedDeltaMb: ((endMem - startMem) / 1024 / 1024).toFixed(2) } : {})
			});
		}

		return results;
	}

	/**
	 * Print the benchmark results as a console table.
	 */
	static printTable(results: BenchmarkResult[]): void {
		if (results.length === 0) {
			console.log('No benchmark results to display.');
			return;
		}

		// Clean up undefined properties for the table
		const tableData = results.map(r => {
			const clean: any = {
				'Engine': r.name,
				'Total Time (ms)': r.totalTimeMs,
				'µs / Op': r.microSecPerOp,
				'Success Rate': r.successRate,
				'Failed': r.failureCount
			};
			if (r.heapUsedDeltaMb !== undefined) {
				clean['Heap Delta (MB)'] = r.heapUsedDeltaMb;
			}
			return clean;
		});

		console.table(tableData);
	}
}
