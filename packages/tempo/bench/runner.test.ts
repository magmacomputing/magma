import '@js-temporal/polyfill';
import { test } from 'vitest';
import * as fs from 'node:fs';
import { Tempo } from '../src/tempo.class.js';
import { BenchmarkModule } from '../src/module/module.benchmark.js';
import { ParseModule } from '../src/module/module.parse.js';

test('benchmark script', () => {
	Tempo.extend(ParseModule);
	Tempo.init({ timeZone: 'America/New_York' });

	const DATASET = [
		'2026-05-20T14:30:00Z',
		'2026-05-20',
		'Jan 1st, 2026',
		'1716215400000',
		'Invalid-Pizza-String 🍕',
		'10/31/2026 11:59 PM',
		'2026-05-20T14:30:00.000Z',
	];

	const results = BenchmarkModule.run(Tempo, {
		data: DATASET,
		iterations: 500,
		baseline: true,
		modes: ['auto', 'defer', 'strict']
	});

	fs.writeFileSync('benchmark-results.json', JSON.stringify({ results, size: DATASET.length, ops: DATASET.length * 500 }, null, 2));
}, 120000);
