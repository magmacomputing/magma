/**
 * Tempo v4.0.0 Production Benchmark
 *
 * Evaluates v4.0.0 engine performance across:
 *   A. Baseline: stock Tempo core parser
 *   B. BenchmarkModule evaluation across auto/defer/strict modes
 *   C. Localized registry modifier resolution
 */
import '../bin/temporal-polyfill.js';
import { Tempo } from '../src/tempo.index.js';
import { BenchmarkModule } from '../src/module/module.benchmark.js';
import { performance } from 'node:perf_hooks';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

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

console.log(`\n⏱  Tempo v4.0.0 Production Benchmark (${ITERATIONS} iterations × corpus size)\n`);

// A. Baseline — stock config, base corpus
Tempo.init({ debug: 0, catch: true, timeZone: 'UTC' });
const baseline = timedRun('A. Baseline (v4.0.0 stock, 20-entry corpus)', baseCorpus, ITERATIONS, { timeZone: 'UTC' });

// B. Module-based comparison across modes using BenchmarkModule
Tempo.init({ debug: 0, catch: true, timeZone: 'UTC' });
const moduleResults = BenchmarkModule.run(Tempo, {
	data: baseCorpus,
	iterations: ITERATIONS,
	modes: ['auto', 'defer', 'strict'],
	baseline: true,
});

// C. Localized modifier corpus via nested v4.0.0 registry configuration
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
const localized = timedRun('C. Localized fr-FR modifiers (v4 nested registry)', frCorpus, ITERATIONS, {});

// ── Output ───────────────────────────────────────────────────────────────────

const output = {
	runAt: new Date().toISOString(),
	version: '4.0.0',
	iterations: ITERATIONS,
	baselineRaw: baseline,
	moduleResults,
	localizedModifiers: localized,
};

// Console output
console.log('── Module-based comparison (v4.0.0 modes) ──');
BenchmarkModule.printTable(moduleResults);

console.log('\n── Baseline (v4.0.0 stock) ──');
console.table([{
	'Engine': baseline.label,
	'Total Time (ms)': baseline.totalTimeMs,
	'µs / Op': baseline.microSecPerOp,
	'ops/sec': baseline.opsPerSec,
	'Success Rate': baseline.successRate,
	'Heap Delta (MB)': baseline.heapDeltaMb,
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

// Save to JSON artifact
const outPath = path.join(__dirname, 'benchmark-results-v4.0.0.json');
fs.writeFileSync(outPath, JSON.stringify(output, null, 2));
console.log(`\n✅ Results saved to ${outPath}\n`);
