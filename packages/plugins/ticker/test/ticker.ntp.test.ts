import { Tempo } from '@magmacomputing/tempo';
import { NtpPlugin } from '@magmacomputing/tempo-plugin-ntp';
import { TickerPlugin } from '../src/index.js';

describe('Ticker NTP Integration', () => {
	let originalFetch: typeof globalThis.fetch;

	beforeEach(() => {
		originalFetch = globalThis.fetch;
		Tempo.init();
		delete (Tempo as any).ntp;
		Tempo.use(TickerPlugin);
	});

	afterEach(() => {
		globalThis.fetch = originalFetch;
		delete (Tempo as any).ntp;
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

	test('should adjust uncalibrated seed upon late NTP calibration preserving configured timeZone', async () => {
		Tempo.use(NtpPlugin);

		const mockServerMs = Date.now() + 60000;
		globalThis.fetch = vi.fn().mockImplementation(async () => {
			return {
				status: 200,
				headers: new Headers({
					'Server-Timing': `clock=${mockServerMs}`,
				}),
			} as any;
		});

		// Create ticker BEFORE calibration
		expect(Tempo.ntp.isCalibrated).toBe(false);
		const ticker = Tempo.ticker({ ntp: true, seconds: 10, timeZone: 'America/New_York', limit: 1 });
		expect(ticker.info.next.tz).toBe('America/New_York');

		// Calibrate NTP late
		await Tempo.ntp.sync('/api/mock-time');
		expect(Tempo.ntp.isCalibrated).toBe(true);

		// Pull next pulse and verify timeZone is preserved and NTP calibrated epoch is reflected
		const pulse = await ticker.pull();
		expect(pulse?.tz).toBe('America/New_York');
		expect(pulse!.epoch.ms - Date.now()).toBeGreaterThanOrEqual(58000);
		ticker.stop();
	});

	test('should not replace explicit future seed upon late NTP calibration', async () => {
		Tempo.use(NtpPlugin);

		const futureEpoch = Date.now() + 300000; // 5 minutes in future
		const mockServerMs = Date.now() + 5000;
		globalThis.fetch = vi.fn().mockImplementation(async () => {
			return {
				status: 200,
				headers: new Headers({
					'Server-Timing': `clock=${mockServerMs}`,
				}),
			} as any;
		});

		const ticker = Tempo.ticker({ ntp: true, seed: new Tempo(futureEpoch), seconds: 1, limit: 1 });
		expect(ticker.info.next.epoch.ms).toBe(futureEpoch);

		// Calibrate NTP late
		await Tempo.ntp.sync('/api/mock-time');
		expect(Tempo.ntp.isCalibrated).toBe(true);

		// The explicit future seed must be preserved
		expect(ticker.info.next.epoch.ms).toBe(futureEpoch);
		ticker.stop();
	});
});

