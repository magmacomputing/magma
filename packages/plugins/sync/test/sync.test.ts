import { Tempo } from '@magmacomputing/tempo';
import { AtomicClock } from '../src/AtomicClock.js';
import { AtomicReader } from '../src/AtomicReader.js';

describe('Atomic Sync Plugin', () => {
	it('should synchronize time across SAB via AtomicReader', async () => {
		// 1. Initialize Master Clock
		const clock = new AtomicClock({ interval: 10 });
		clock.start();

		// 2. Pass SAB to Reader (simulating cross-thread communication)
		const reader = new AtomicReader(clock.getBuffer());

		// Wait briefly for the clock interval to tick
		await new Promise(resolve => setTimeout(resolve, 20));

		// 3. Read exact values
		const ms = reader.now();
		const ns = reader.nowNano();
		const tempo = reader.getTempo();

		expect(ms).toBeGreaterThan(0);
		expect(typeof ns).toBe('bigint');
		expect(ns).toBeGreaterThan(0n);
		expect(tempo).toBeInstanceOf(Tempo);

		// Cleanup
		clock.stop();
	});
});
