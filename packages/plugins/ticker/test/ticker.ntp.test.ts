import { Tempo } from '@magmacomputing/tempo';
import { NtpPlugin } from '@magmacomputing/tempo-plugin-ntp';
import { TickerPlugin } from '../src/index.js';

describe('Ticker NTP Integration', () => {
	let originalFetch: typeof globalThis.fetch;

	beforeEach(() => {
		originalFetch = globalThis.fetch;
		Tempo.init();
		Tempo.use(TickerPlugin);
	});

	afterEach(() => {
		globalThis.fetch = originalFetch;
		if (Tempo.ntp) {
			Tempo.ntp.reset();
		}
	});

	test('should gracefully fallback when NTP plugin is not registered', () => {
		const ticker = Tempo.ticker({ ntp: true, seconds: 0.1, limit: 1 });
		expect(ticker.info.ntp).toBe(true);
		expect(ticker.info.next instanceof Tempo).toBe(true);
		ticker.stop();
	});

	test('should seed from calibrated NTP clock when ntp is enabled and NtpPlugin is active', async () => {
		Tempo.use(NtpPlugin);

		const mockServerMs = Date.now() + 5000;
		globalThis.fetch = vi.fn().mockImplementation(async () => {
			return {
				status: 200,
				headers: new Headers({
					'Server-Timing': `clock=${mockServerMs}`,
				}),
			} as any;
		});

		await Tempo.ntp.sync('/api/mock-time');
		expect(Tempo.ntp.isCalibrated).toBe(true);

		const ticker = Tempo.ticker({ ntp: true, seconds: 1, limit: 1 });
		expect(ticker.info.ntp).toBe(true);
		expect(ticker.info.next.epoch.ms - Date.now()).toBeGreaterThanOrEqual(4800);
		ticker.stop();
	});

	test('should execute pulses and report ntp in active tickers snapshot', async () => {
		Tempo.use(NtpPlugin);
		const ticker = Tempo.ticker({ ntp: true, seconds: 0.05, limit: 2 });

		const active = Tempo.tickers.find(t => t.ticker === ticker);
		expect(active).toBeDefined();
		expect(active?.ntp).toBe(true);

		const p1 = await ticker.pull();
		expect(p1 instanceof Tempo).toBe(true);
		ticker.stop();
	});
});
