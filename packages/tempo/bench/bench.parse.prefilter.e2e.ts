import '../bin/temporal-polyfill.ts';
import { Tempo } from '../src/tempo.index.ts';
import { performance } from 'node:perf_hooks';

import fs from 'fs';

let corpus: string[] = [];
const layoutKeys = new Set([
	'hourMinuteSecond', 'dayMonthYearShort', 'monthDayYearShort', 'yearMonthDayShort',
	'weekDay', 'date', 'time', 'dateTime', 'timeDate', 'dayMonthYear', 'monthDayYear',
	'yearMonthDay', 'offset', 'relativeOffset'
]);
try {
	corpus = fs.readFileSync(new URL('./bench.parse.prefilter.ts', import.meta.url), 'utf-8')
		.split(/\n/)
		.filter(line => line.trim().startsWith("'") && line.includes(','))
		.map(line => line.replace(/['",]/g, '').trim())
		.filter(Boolean)
		.filter(line => !layoutKeys.has(line));
} catch {
	corpus = [
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
	];
}

function runE2E(enablePrefilter: boolean, iterations: number) {
	Tempo.init({
		parsePrefilter: enablePrefilter,
		debug: false,
		catch: true,
		timeZone: 'UTC',
	});

	let checksum = 0;
	const start = performance.now();

	for (let i = 0; i < iterations; i++) {
		for (const input of corpus) {
			const t = new Tempo(input, { timeZone: 'UTC' });
			checksum += t.toDateTime().epochMilliseconds;
		}
	}

	const elapsedMs = performance.now() - start;
	const operations = iterations * corpus.length;

	return {
		iterations,
		operations,
		elapsedMs: Number(elapsedMs.toFixed(3)),
		msPerIteration: Number((elapsedMs / iterations).toFixed(6)),
		msPerInput: Number((elapsedMs / operations).toFixed(6)),
		checksum,
	};
}

const warmupIterations = Number(process.env.PREFILTER_E2E_WARMUP ?? 200);
const benchIterations = Number(process.env.PREFILTER_E2E_ITERATIONS ?? 1000);

// Warmup both paths to reduce one-time JIT effects.
runE2E(false, warmupIterations);
runE2E(true, warmupIterations);

const base = runE2E(false, benchIterations);
const pre = runE2E(true, benchIterations);

const timingDeltaPct = Number((((pre.elapsedMs - base.elapsedMs) / base.elapsedMs) * 100).toFixed(2));

const result = {
	base,
	pre,
	timingDeltaPct,
	thresholds: {
		maxTimingDeltaPct: 10, // fail if prefilter is >10% slower than base
		minChecksum: 1 // dummy threshold, adjust as needed
	},
	success: true,
	errors: []
};

if (timingDeltaPct > result.thresholds.maxTimingDeltaPct) {
	result.success = false;
	result.errors.push(`Prefilter is too slow: ${timingDeltaPct}% > ${result.thresholds.maxTimingDeltaPct}%`);
}
if (base.checksum < result.thresholds.minChecksum || pre.checksum < result.thresholds.minChecksum) {
	result.success = false;
	result.errors.push('Checksum below minimum threshold');
}

console.log(JSON.stringify(result));
if (!result.success) process.exit(1);