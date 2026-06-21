import '@js-temporal/polyfill';
import { Tempo } from '../src/tempo.class.js';

const ITERATIONS = 100_000;

function runBenchmark(name: string, expression: string) {
	const start = performance.now();
	for (let i = 0; i < ITERATIONS; i++) {
		new Tempo(expression);
	}
	const end = performance.now();
	const duration = end - start;
	const opsPerSec = Math.round((ITERATIONS / duration) * 1000);

	console.log(`[${name}]`);
	console.log(`  Expression : "${expression}"`);
	console.log(`  Duration   : ${duration.toFixed(2)} ms`);
	console.log(`  Speed      : ${opsPerSec.toLocaleString()} ops/sec`);
	console.log('');
}

console.log('=============================================');
console.log(`Tempo Modifier Benchmark (${ITERATIONS.toLocaleString()} iterations)`);
console.log('=============================================\n');

// 1. Standard Prefix Modifier (Weekday)
runBenchmark('Prefix Weekday', 'next Friday');

// 2. Relative Offset (Ago/Hence)
runBenchmark('Relative Offset', '3 days ago');

// 3. Complex Expression
runBenchmark('Complex Expression', 'next Friday at 5:00pm');

// 4. Baseline (No modifier)
runBenchmark('Baseline Date', '2025-01-01');

console.log('Benchmark complete.\n');
