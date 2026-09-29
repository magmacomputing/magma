import { Tempo } from '@magmacomputing/tempo';
import { TickerPlugin } from '../src/index.js';

Tempo.use(TickerPlugin);

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
		// ticker.stop() does NOT revoke proxy handle, info remains readable
		expect(ticker.info.stopped).toBe(true);
	});

	it('should cleanly stop the ticker upon Symbol.dispose', () => {
		const ticker = Tempo.ticker({ seconds: 1 });
		expect(ticker.info.stopped).toBe(false);

		ticker[Symbol.dispose]();

		expect(ticker.info.stopped).toBe(true);
		expect(Tempo.tickers.some(s => s.ticker === ticker)).toBe(false);
	});

	it('should cleanly stop the ticker upon Symbol.asyncDispose', async () => {
		const ticker = Tempo.ticker({ seconds: 1 });
		expect(ticker.info.stopped).toBe(false);

		await ticker[Symbol.asyncDispose]();

		expect(ticker.info.stopped).toBe(true);
		expect(Tempo.tickers.some(s => s.ticker === ticker)).toBe(false);
	});

	it('should still stop ticker when a stop listener throws in Symbol.dispose', () => {
		const ticker = Tempo.ticker({ seconds: 1 });
		ticker.on('stop', () => {
			throw new Error('Stop listener failure');
		});

		expect(() => ticker[Symbol.dispose]()).toThrow('Stop listener failure');
		expect(ticker.info.stopped).toBe(true);
		expect(Tempo.tickers.some(s => s.ticker === ticker)).toBe(false);
	});

	it('should still stop ticker when a stop listener throws in Symbol.asyncDispose', async () => {
		const ticker = Tempo.ticker({ seconds: 1 });
		ticker.on('stop', () => {
			throw new Error('Async stop listener failure');
		});

		await expect(ticker[Symbol.asyncDispose]()).rejects.toThrow('Async stop listener failure');
		expect(ticker.info.stopped).toBe(true);
		expect(Tempo.tickers.some(s => s.ticker === ticker)).toBe(false);
	});

	it('should maintain active tickers list in Tempo.tickers and remove stopped tickers', () => {
		const t1 = Tempo.ticker({ seconds: 1 });
		const t2 = Tempo.ticker({ seconds: 2 });

		expect(Tempo.tickers.some(s => s.ticker === t1)).toBe(true);
		expect(Tempo.tickers.some(s => s.ticker === t2)).toBe(true);

		t1.stop();
		expect(Tempo.tickers.some(s => s.ticker === t1)).toBe(false);
		expect(Tempo.tickers.some(s => s.ticker === t2)).toBe(true);

		t2.stop();
		expect(Tempo.tickers.some(s => s.ticker === t2)).toBe(false);
	});
});

