import { selectLayoutPatterns } from '../src/engine/engine.planner.ts';
import { performance } from 'node:perf_hooks';

const layoutNames = [
	'hourMinuteSecond',
	'dayMonthYearShort',
	'monthDayYearShort',
	'yearMonthDayShort',
	'weekDay',
	'date',
	'time',
	'dateTime',
	'timeDate',
	'dayMonthYear',
	'monthDayYear',
	'yearMonthDay',
	'offset',
	'relativeOffset',
];

function makeState(names: string[]) {
	const symbols = names.map(name => Symbol(name));
	const layout = Object.fromEntries(symbols.map(sym => [sym, `{${sym.description}}`])) as Record<symbol, string>;
	const pattern = new Map(symbols.map(sym => [sym, new RegExp(`^${sym.description}$`, 'i')]));

	return {
		parse: {
			layout,
			pattern,
			token: {},
		}
	} as any;
}

const corpus = [
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
	// Expanded real-world and event/timezone cases
	'2026-04-25T10:30:00Z',
	'2026-04-25T10:30:00+05:30',
	'2026-04-25T10:30:00-07:00',
	'2026-04-25T10:30:00[America/New_York]',
	'2026-04-25T10:30:00[Europe/London]',
	'next Friday at 5pm',
	'last Monday',
	'in 3 weeks',
	'yesterday',
	'noon',
	'midnight',
	'2026-12-31T23:59:59.999Z',
	'2026-12-31T23:59:59.999+09:00',
	'2026-12-31T23:59:59.999[Asia/Tokyo]',
	'2026-12-31',
	'2026-12-31 23:59',
	'2026-12-31 11:59pm',
	'2026-12-31T23:59:59',
	'2026-12-31T23:59',
	'2026-12-31T11:59pm',
	'2026-12-31T23:59:59.999',
	'2026-12-31T23:59:59.999999999',
	'2026-12-31T23:59:59.999999999Z',
	'2026-12-31T23:59:59.999999999+00:00',
	'2026-12-31T23:59:59.999999999-08:00',
	'2026-12-31T23:59:59.999999999[America/Los_Angeles]',
	'2026-12-31T23:59:59.999999999[Australia/Sydney]',
	'2026-12-31T23:59:59.999999999[UTC]',
	'2026-12-31T23:59:59.999999999[Etc/GMT+2]',
	'2026-12-31T23:59:59.999999999[Europe/Berlin]',
	'2026-12-31T23:59:59.999999999[America/Sao_Paulo]',
	'2026-12-31T23:59:59.999999999[Asia/Kolkata]',
	'2026-12-31T23:59:59.999999999[Pacific/Auckland]',
	'2026-12-31T23:59:59.999999999[America/Chicago]',
	'2026-12-31T23:59:59.999999999[Europe/Moscow]',
	'2026-12-31T23:59:59.999999999[Asia/Shanghai]',
	'2026-12-31T23:59:59.999999999[America/Vancouver]',
	'2026-12-31T23:59:59.999999999[Europe/Paris]',
	'2026-12-31T23:59:59.999999999[America/Denver]',
	'2026-12-31T23:59:59.999999999[Europe/Rome]',
	'2026-12-31T23:59:59.999999999[Asia/Singapore]',
	'2026-12-31T23:59:59.999999999[America/Toronto]',
	'2026-12-31T23:59:59.999999999[Europe/Madrid]',
	'2026-12-31T23:59:59.999999999[America/Mexico_City]',
	'2026-12-31T23:59:59.999999999[Asia/Hong_Kong]',
	'2026-12-31T23:59:59.999999999[Europe/Istanbul]',
	'2026-12-31T23:59:59.999999999[America/Anchorage]',
	'2026-12-31T23:59:59.999999999[Pacific/Honolulu]',
	'2026-12-31T23:59:59.999999999[Europe/Zurich]',
	'2026-12-31T23:59:59.999999999[America/Argentina/Buenos_Aires]',
	'2026-12-31T23:59:59.999999999[Asia/Dubai]',
	'2026-12-31T23:59:59.999999999[Europe/Stockholm]',
	'2026-12-31T23:59:59.999999999[America/Phoenix]',
	'2026-12-31T23:59:59.999999999[Asia/Seoul]',
	'2026-12-31T23:59:59.999999999[Europe/Brussels]',
	'2026-12-31T23:59:59.999999999[America/Edmonton]',
	'2026-12-31T23:59:59.999999999[Asia/Bangkok]',
	'2026-12-31T23:59:59.999999999[Europe/Amsterdam]',
	'2026-12-31T23:59:59.999999999[America/Caracas]',
	'2026-12-31T23:59:59.999999999[Asia/Jakarta]',
	'2026-12-31T23:59:59.999999999[Europe/Prague]',
	'2026-12-31T23:59:59.999999999[America/Guatemala]',
	'2026-12-31T23:59:59.999999999[Asia/Manila]',
	'2026-12-31T23:59:59.999999999[Europe/Bucharest]',
	'2026-12-31T23:59:59.999999999[America/Santiago]',
	'2026-12-31T23:59:59.999999999[Asia/Kathmandu]',
	'2026-12-31T23:59:59.999999999[Europe/Copenhagen]',
	'2026-12-31T23:59:59.999999999[America/Montevideo]',
	'2026-12-31T23:59:59.999999999[Asia/Taipei]',
	'2026-12-31T23:59:59.999999999[Europe/Helsinki]',
	'2026-12-31T23:59:59.999999999[America/La_Paz]',
	'2026-12-31T23:59:59.999999999[Asia/Karachi]',
	'2026-12-31T23:59:59.999999999[Europe/Lisbon]',
	'2026-12-31T23:59:59.999999999[America/Bogota]',
	'2026-12-31T23:59:59.999999999[Asia/Tehran]',
	'2026-12-31T23:59:59.999999999[Europe/Oslo]',
	'2026-12-31T23:59:59.999999999[America/Lima]',
	'2026-12-31T23:59:59.999999999[Asia/Kuala_Lumpur]',
	'2026-12-31T23:59:59.999999999[Europe/Warsaw]',
	'2026-12-31T23:59:59.999999999[America/Havana]',
	'2026-12-31T23:59:59.999999999[Asia/Saigon]',
	'2026-12-31T23:59:59.999999999[Europe/Athens]',
	'2026-12-31T23:59:59.999999999[America/Detroit]',
	'2026-12-31T23:59:59.999999999[Asia/Yangon]',
	'2026-12-31T23:59:59.999999999[Europe/Dublin]',
	'2026-12-31T23:59:59.999999999[America/Port-au-Prince]',
	'2026-12-31T23:59:59.999999999[Asia/Tashkent]',
	'2026-12-31T23:59:59.999999999[Europe/Vienna]',
	'2026-12-31T23:59:59.999999999[America/Asuncion]',
	'2026-12-31T23:59:59.999999999[Asia/Baghdad]',
	'2026-12-31T23:59:59.999999999[Europe/Belgrade]',
	'2026-12-31T23:59:59.999999999[America/Managua]',
	'2026-12-31T23:59:59.999999999[Asia/Almaty]',
	'2026-12-31T23:59:59.999999999[Europe/Sofia]',
	'2026-12-31T23:59:59.999999999[America/Recife]',
	'2026-12-31T23:59:59.999999999[Asia/Novosibirsk]',
	'2026-12-31T23:59:59.999999999[Europe/Berlin]',
];

function run(enablePrefilter: boolean) {
	const state = makeState(layoutNames);
	let totalCandidates = 0;
	let selectedCandidates = 0;
	const ruleHits = new Map<string, number>();

	for (const input of corpus) {
		selectLayoutPatterns(state, input, {
			enablePrefilter,
			onPlan: summary => {
				totalCandidates += summary.totalCandidates;
				selectedCandidates += summary.selectedCandidates;
				summary.rulesApplied.forEach(rule => {
					ruleHits.set(rule, (ruleHits.get(rule) ?? 0) + 1);
				});
			}
		});
	}

	return {
		enablePrefilter,
		inputs: corpus.length,
		totalCandidates,
		selectedCandidates,
		reductionPct: totalCandidates === 0
			? 0
			: Number((((totalCandidates - selectedCandidates) / totalCandidates) * 100).toFixed(2)),
		ruleHits: Object.fromEntries([...ruleHits.entries()].sort()),
	};
}

function timeRun(enablePrefilter: boolean, iterations: number) {
	const state = makeState(layoutNames);
	const start = performance.now();

	for (let i = 0; i < iterations; i++) {
		for (const input of corpus) {
			selectLayoutPatterns(state, input, { enablePrefilter });
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
	};
}

const warmupIterations = Number(process.env.PREFILTER_BENCH_WARMUP ?? 200);
const benchIterations = Number(process.env.PREFILTER_BENCH_ITERATIONS ?? 5000);

// Warmup both paths to reduce one-time JIT effects.
timeRun(false, warmupIterations);
timeRun(true, warmupIterations);

const base = run(false);
const pre = run(true);
const baseTiming = timeRun(false, benchIterations);
const preTiming = timeRun(true, benchIterations);

console.log('\nParse Planner Candidate Benchmark');
console.table([
	{
		mode: 'prefilter:off',
		inputs: base.inputs,
		totalCandidates: base.totalCandidates,
		selectedCandidates: base.selectedCandidates,
		reductionPct: base.reductionPct,
	},
	{
		mode: 'prefilter:on',
		inputs: pre.inputs,
		totalCandidates: pre.totalCandidates,
		selectedCandidates: pre.selectedCandidates,
		reductionPct: pre.reductionPct,
	},
]);

console.log('Rule hits (prefilter:on):');
console.table(pre.ruleHits);

const timingDeltaPct = Number((((preTiming.elapsedMs - baseTiming.elapsedMs) / baseTiming.elapsedMs) * 100).toFixed(2));

console.log('\nParse Planner Timing Benchmark (selection phase only)');
console.table([
	{
		mode: 'prefilter:off',
		iterations: baseTiming.iterations,
		operations: baseTiming.operations,
		elapsedMs: baseTiming.elapsedMs,
		msPerIteration: baseTiming.msPerIteration,
		msPerInput: baseTiming.msPerInput,
	},
	{
		mode: 'prefilter:on',
		iterations: preTiming.iterations,
		operations: preTiming.operations,
		elapsedMs: preTiming.elapsedMs,
		msPerIteration: preTiming.msPerIteration,
		msPerInput: preTiming.msPerInput,
	},
]);

console.log(`Timing delta (prefilter:on vs off): ${timingDeltaPct}%`);
