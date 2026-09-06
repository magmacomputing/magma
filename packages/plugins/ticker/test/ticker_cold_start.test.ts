import { Tempo } from '@magmacomputing/tempo';
import { TickerPlugin } from '../src/index.js';

Tempo.use(TickerPlugin);

describe('Ticker Cold-Start Resolution', () => {
	beforeEach(() => { Tempo.init(); });

	test('should start pulsing when a listener is added post-creation', async () => {
		// 1. Create a ticker without a callback (should remain idle)
		const t = Tempo.ticker({ seconds: 0.1 });
		let count = 0;

		try {
			// 2. Wait to ensure it remains idle
			await new Promise(resolve => setTimeout(resolve, 250));
			expect(t.info.ticks).toBe(0);

			// 3. Add a listener (should trigger bootstrap)
			t.on('pulse', () => { count++; });

			// 4. Verify pulsing has started
			await new Promise(resolve => setTimeout(resolve, 250));
			expect(count).toBeGreaterThan(0);
		} finally {
			t.stop();
		}
	});
});
