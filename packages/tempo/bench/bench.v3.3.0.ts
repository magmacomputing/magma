/**
 * Post-refactor (v3.3.0) representative benchmark
 *
 * Compares three configurations:
 *   A. Baseline: stock Tempo, same corpus as pre-refactor
 *   B. Module-based comparison using BenchmarkModule across auto/defer/strict modes
 *   C. Localized fr-FR modifiers through the new registry.modifiers code path
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

/** Same 20-entry corpus used for the pre-refactor benchmark */
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

/** New v3.3.0 corpus: French localized modifiers through registry.modifiers */
const frCorpus: string[] = [
	'vendredi prochain',		// localized 'next Friday'
	'lundi dernier',			// localized 'last Monday'
	'mercredi prochain',		// localized 'next Wednesday'
	'3 jours',				// plain French numeric
	'vendredi',				// plain French weekday
	'jeudi dernier',			// localized 'last Thursday'
	'mardi suivant',			// alias: suivant => >
	'dimanche prochain',		// localized 'next Sunday'
];

// ── Benchmark helpers ───────────────────────────────────────────────────────

function timedRun(label: string, data: string[], iterations: number, tempoOptions: any) {
	// warm-up
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

console.log(`\n⏱  Tempo v3.3.0 Post-Refactor Benchmark  (${ITERATIONS} iterations × corpus size)\n`);

// A. Baseline — stock config, base corpus (mirrors pre-refactor run)
Tempo.init({ debug: 0, catch: true, timeZone: 'UTC' });
const baseline = timedRun('A. Baseline (stock, 20-entry corpus)', baseCorpus, ITERATIONS, { timeZone: 'UTC' });

// B. Baseline with all three Tempo modes using BenchmarkModule
Tempo.init({ debug: 0, catch: true, timeZone: 'UTC' });
const moduleResults = BenchmarkModule.run(Tempo, {
	data: baseCorpus,
	iterations: ITERATIONS,
	modes: ['auto', 'defer', 'strict'],
	baseline: true,
});

// C. Localized modifier corpus — exercises the new registry.modifiers code path
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
const localized = timedRun('C. Localized fr-FR modifiers (8-entry corpus)', frCorpus, ITERATIONS, {});

// ── Output ───────────────────────────────────────────────────────────────────

const output = {
	runAt: new Date().toISOString(),
	version: '3.3.0',
	iterations: ITERATIONS,
	baselineRaw: baseline,
	moduleResults,
	localizedModifiers: localized,
};

// Pretty console table
console.log('── Module-based comparison (matches pre-refactor format) ──');
BenchmarkModule.printTable(moduleResults);

console.log('\n── Baseline (manual, matches pre-refactor corpus exactly) ──');
console.table([{
	'Engine': baseline.label,
	'Total Time (ms)': baseline.totalTimeMs,
	'µs / Op': baseline.microSecPerOp,
	'ops/sec': baseline.opsPerSec,
	'Success Rate': baseline.successRate,
	'Heap Delta (MB)': baseline.heapDeltaMb,
}]);

console.log('\n── New: Localized modifier throughput ──');
console.table([{
	'Engine': localized.label,
	'Total Time (ms)': localized.totalTimeMs,
	'µs / Op': localized.microSecPerOp,
	'ops/sec': localized.opsPerSec,
	'Success Rate': localized.successRate,
	'Heap Delta (MB)': localized.heapDeltaMb,
}]);

// Save to file
const outPath = path.join(__dirname, 'benchmark-results-v3.3.0.json');
fs.writeFileSync(outPath, JSON.stringify(output, null, 2));
console.log(`\n✅  Results saved to ${outPath}\n`);
