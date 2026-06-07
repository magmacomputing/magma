import { Tempo } from '../src/tempo.class.js';
import { BenchmarkModule } from '../src/module/module.benchmark.js';
const res = BenchmarkModule.run(Tempo, {
    data: ['2026-05-20', '🍕'],
    modes: ['auto']
});
console.log(JSON.stringify(res, null, 2));
