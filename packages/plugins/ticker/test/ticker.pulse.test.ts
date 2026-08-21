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
});
