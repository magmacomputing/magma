import { Tempo } from '@magmacomputing/tempo';
import { TickerPlugin } from '../src/index.js';

Tempo.extend(TickerPlugin);

describe('Ticker Stop Listener', () => {
	beforeEach(() => {
		Tempo.init();
	});

	it('should register and invoke stop listeners with pulse callback signature', () => {
		let calls = 0;
		let receivedTempo: any;
		let receivedStop: any;

		const ticker = Tempo.ticker({ seconds: 1, limit: 1 });
		ticker.on('stop', (t, stop) => {
			calls++;
			receivedTempo = t;
			receivedStop = stop;
		});

		ticker.pulse();
		ticker.stop();

		expect(calls).toBe(1);
		expect(receivedTempo).toBeDefined();
		expect(typeof receivedStop).toBe('function');
	});

	it('should only invoke stop listeners once when stop is called multiple times', () => {
		let calls = 0;
		const ticker = Tempo.ticker({ seconds: 1 });
		ticker.on('stop', () => calls++);

		ticker.stop();
		ticker.stop();

		expect(calls).toBe(1);
	});
});
