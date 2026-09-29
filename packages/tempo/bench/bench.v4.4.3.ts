/**
 * Tempo v4.4.3 Production Benchmark
 *
 * Evaluates v4.4.3 engine performance across:
 *   A. Baseline: stock Tempo core parser with WeakCache integration
 *   B. BenchmarkModule evaluation across auto/defer/strict modes
 *   C. WeakCache Repeated Parse & Instantiation Throughput
 *   D. Localized registry modifier resolution
 */
import '../bin/temporal-polyfill.js';
import { Tempo } from '../src/tempo.index.js';
import { BenchmarkModule } from '../src/module/module.benchmark.js';
import { performance } from 'node:perf_hooks';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ── Corpus ──────────────────────────────────────────────────────────────────

/** 20-entry representative parser corpus */
const baseCorpus: string[] = [
	'04012026',
	'310559',
	'590531',
	'09:30',
	'monday',
	'2 days ago',
	'+6',
	'1234567890123',
	'2026-04-25',
	'2026/04/25 10:30',
	'11:45pm',
	'tomorrow',
	'2026-04-25T10:30:00Z',
	'2026-04-25T10:30:00+05:30',
	'next Friday at 5pm',
	'last Monday',
	'in 3 weeks',
	'yesterday',
	'noon',
	'midnight',
];

/** French localized modifier corpus via nested v4 registry.modifiers */
const frCorpus: string[] = [
	'vendredi prochain',
	'lundi dernier',
	'mercredi prochain',
	'3 jours',
	'vendredi',
	'jeudi dernier',
	'mardi suivant',
	'dimanche prochain',
];

// ── Benchmark helpers ───────────────────────────────────────────────────────

function timedRun(label: string, data: string[], iterations: number, tempoOptions: any) {
	// Warm-up pass
	for (const d of data) new Tempo(d, { catch: true, ...tempoOptions });

	if (global.gc) global.gc();
	let success = 0, failure = 0;
	const startHeap = process.memoryUsage().heapUsed;
	const start = performance.now();

	for (let i = 0; i < iterations; i++) {
		for (const d of data) {
			const t = new Tempo(d, { catch: true, ...tempoOptions });
			if (t.isValid) success++; else failure++;
		}
	}

	const elapsed = performance.now() - start;
	const endHeap = process.memoryUsage().heapUsed;
	const ops = iterations * data.length;

	return {
		label,
		totalTimeMs: Number(elapsed.toFixed(2)),
		opsPerSec: Math.round(ops / (elapsed / 1000)),
		microSecPerOp: Number(((elapsed * 1000) / ops).toFixed(2)),
		successCount: success,
		failureCount: failure,
		successRate: ((success / ops) * 100).toFixed(1) + '%',
		heapDeltaMb: Number(((endHeap - startHeap) / 1024 / 1024).toFixed(2)),
	};
}

// ── Run ──────────────────────────────────────────────────────────────────────

const ITERATIONS = 100;

console.log(`\n⏱  Tempo v4.4.3 Production Benchmark (${ITERATIONS} iterations × corpus size)\n`);

// A. Baseline — stock config, base corpus
Tempo.init({ debug: 0, catch: true, timeZone: 'UTC' });
const baseline = timedRun('A. Baseline (v4.4.3 stock + WeakCache, 20-entry corpus)', baseCorpus, ITERATIONS, { timeZone: 'UTC' });

// B. Module-based comparison across modes using BenchmarkModule
Tempo.init({ debug: 0, catch: true, timeZone: 'UTC' });
const moduleResults = BenchmarkModule.run(Tempo, {
	data: baseCorpus,
	iterations: ITERATIONS,
	modes: ['auto', 'defer', 'strict'],
	baseline: true,
});

// C. WeakCache repeated ISO & Pattern memoization throughput
const repeatCorpus = [
	'2026-09-29T16:00:00Z',
	'2026-12-25T00:00:00Z',
	'2026-01-01',
	'2026-06-21T12:00:00+02:00',
];
const repeatedMemoization = timedRun('C. WeakCache Repeated Memoization (v4.4.3)', repeatCorpus, 500, { timeZone: 'UTC' });

// D. Localized modifier corpus via nested v4 registry configuration
const localizedConfig = {
	locale: 'fr-FR',
	debug: 0,
	catch: true,
	timeZone: 'UTC',
	registry: {
		modifiers: {
			'>': ['prochain', 'suivant'],
			'<': ['dernier', 'passé'],
			'=': ['ce', 'cette'],
		}
	}
};
Tempo.init(localizedConfig as any);
const localized = timedRun('D. Localized fr-FR modifiers (v4 registry)', frCorpus, ITERATIONS, {});

const normalizedModuleResults = moduleResults.map((r: any) => ({
	name: r.name,
	totalTimeMs: r.totalTimeMs,
	microSecPerOp: r.microSecPerOp,
	successCount: r.successCount,
	failureCount: r.failureCount,
	successRate: r.successRate,
	heapDeltaMb: parseFloat(r.heapUsedDeltaMb ?? '0'),
}));

const output = {
	runAt: new Date().toISOString(),
	version: '4.4.3',
	iterations: ITERATIONS,
	baselineRaw: baseline,
	moduleResults: normalizedModuleResults,
	repeatedMemoization,
	localizedModifiers: localized,
};

// Console output
console.log('── Module-based comparison (v4.4.3 modes) ──');
BenchmarkModule.printTable(moduleResults);

console.log('\n── Baseline (v4.4.3 stock + WeakCache) ──');
console.table([{
	'Engine': baseline.label,
	'Total Time (ms)': baseline.totalTimeMs,
	'µs / Op': baseline.microSecPerOp,
	'ops/sec': baseline.opsPerSec,
	'Success Rate': baseline.successRate,
	'Heap Delta (MB)': baseline.heapDeltaMb,
}]);

console.log('\n── WeakCache Repeated Memoization Throughput ──');
console.table([{
	'Engine': repeatedMemoization.label,
	'Total Time (ms)': repeatedMemoization.totalTimeMs,
	'µs / Op': repeatedMemoization.microSecPerOp,
	'ops/sec': repeatedMemoization.opsPerSec,
	'Success Rate': repeatedMemoization.successRate,
	'Heap Delta (MB)': repeatedMemoization.heapDeltaMb,
}]);

console.log('\n── Localized Modifier Throughput (v4 registry) ──');
console.table([{
	'Engine': localized.label,
	'Total Time (ms)': localized.totalTimeMs,
	'µs / Op': localized.microSecPerOp,
	'ops/sec': localized.opsPerSec,
	'Success Rate': localized.successRate,
	'Heap Delta (MB)': localized.heapDeltaMb,
}]);

// Save to JSON artifacts
const outPath = path.join(__dirname, 'benchmark-results-v4.4.3.json');
fs.writeFileSync(outPath, JSON.stringify(output, null, 2));

const generalPath = path.join(__dirname, 'benchmark-results.json');
fs.writeFileSync(generalPath, JSON.stringify(output, null, 2));

console.log(`\n✅ Results saved to ${outPath} and ${generalPath}\n`);
