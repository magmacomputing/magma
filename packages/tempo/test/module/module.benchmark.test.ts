import { Tempo } from '#tempo';
import { BenchmarkModule } from '#tempo/module/module.benchmark.js';

describe('BenchmarkModule', () => {
	it('should return empty results if no data is provided', () => {
		const results = BenchmarkModule.run(Tempo, { data: [] });
		expect(results).toEqual([]);
	});

	it('should calculate ops/sec and failure rates for native Date baseline', () => {
		const results = BenchmarkModule.run(Tempo, {
			data: ['2026-05-20', 'invalid-gibberish'],
			iterations: 1,
			baseline: true,
			modes: []
		});

		expect(results.length).toBe(1);
		const native = results[0];
		expect(native.name).toBe('Native Date');
		expect(native.successCount).toBe(1);
		expect(native.failureCount).toBe(1);
		expect(native.successRate).toMatch(/^50(\.0+)?%$/);
		expect(typeof native.totalTimeMs).toBe('number');
		expect(typeof native.microSecPerOp).toBe('number');
	});

	it('should benchmark Tempo parsing modes', () => {
		const results = BenchmarkModule.run(Tempo, {
			data: ['2026-05-20', '🍕'],
			iterations: 1,
			modes: ['auto', 'defer']
		});


		expect(results.length).toBe(2);
		
		const auto = results.find(r => r.name.includes('auto'))!;
		expect(auto.successCount).toBe(1);
		expect(auto.failureCount).toBe(1);
		
		const defer = results.find(r => r.name.includes('defer'))!;
		expect(defer.successCount).toBe(1);
		expect(defer.failureCount).toBe(1);
	});

	it('should multiply iterations correctly', () => {
		const results = BenchmarkModule.run(Tempo, {
			data: ['2026-05-20'],
			iterations: 5,
			modes: ['auto']
		});

		expect(results.length).toBe(1);
		const auto = results[0];
		expect(auto.successCount).toBe(5); // 1 item * 5 iterations
		expect(auto.failureCount).toBe(0);
	});
});
