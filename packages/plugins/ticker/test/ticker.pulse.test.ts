import { Tempo } from '@magmacomputing/tempo';
import { TickerPlugin } from '../src/index.js';

Tempo.extend(TickerPlugin);

describe('Ticker Pulse Behavior', () => {
	beforeEach(() => {
		Tempo.init();
	});

	test('limit: 1 should result in 1 pulse currently', async () => {
		let count = 0;
		const t = Tempo.ticker({ seconds: 0.1, limit: 1 }, () => count++);
		await new Promise(r => setTimeout(r, 200));
		expect(count).toBe(1);
		t.stop();
	});

	test('limit: 0 should result in 0 pulses currently', async () => {
		let count = 0;
		const t = Tempo.ticker({ seconds: 0.1, limit: 0 }, () => count++);
		await new Promise(r => setTimeout(r, 200));
		expect(count).toBe(0);
		t.stop();
	});

	test('should support concurrent next() calls without dropping requests', async () => {
		const t = Tempo.ticker({ seconds: 0.05, limit: 1 });
		const [res1, res2] = await Promise.all([t.next(), t.next()]);
		expect(res1.done).toBe(false);
		expect(res2.done).toBe(false);
		expect(res1.value?.epoch.ms).toBe(res2.value?.epoch.ms);

		const res3 = await t.next();
		expect(res3.done).toBe(true);
		t.stop();
	});

	test('should return terminal pulse as done: false before completing remaining queued requests', async () => {
		const t = Tempo.ticker({ seconds: 0.05, limit: 1 });
		const p1 = t.next();
		const p2 = t.next();

		const [res1, res2] = await Promise.all([p1, p2]);
		expect(res1.done).toBe(false);
		expect(res1.value).toBeDefined();
		expect(res2.done).toBe(false);
		expect(res2.value).toBeDefined();

		const res3 = await t.next();
		expect(res3.done).toBe(true);
		expect(res3.value).toBeUndefined();
	});
});
