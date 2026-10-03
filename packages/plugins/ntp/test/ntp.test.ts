import { Tempo } from '@magmacomputing/tempo';
import { NtpPlugin, ClockDriftEngine } from '../src/index.js';

describe('NtpPlugin & ClockDriftEngine', () => {
	let originalFetch: typeof globalThis.fetch;

	beforeEach(() => {
		originalFetch = globalThis.fetch;
	});

	afterEach(() => {
		globalThis.fetch = originalFetch;
		if (Tempo.ntp) {
			Tempo.ntp.reset();
		}
	});

	describe('ClockDriftEngine Unit Tests', () => {
		it('initializes with zero drift and uncalibrated state', () => {
			const engine = new ClockDriftEngine();
			expect(Object.prototype.toString.call(engine)).toBe('[object Tempo.ClockDriftEngine]');
			expect(engine.offset).toBe(0);
			expect(engine.isCalibrated).toBe(false);
			expect(engine.drift.sampleCount).toBe(0);
		});

		it('calculates Cristian offset correctly on single sample', () => {
			const engine = new ClockDriftEngine({ maxAcceptableRttMs: 1000 });
			const localBefore = 1000;
			const rtt = 100; // localAfter = 1100
			const serverTime = 1550; // Server says 1550 at mid-point

			// Expected offset = 1550 - (1000 + 100/2) = 1550 - 1050 = +500
			engine.ingestSample(serverTime, rtt, localBefore);

			expect(engine.offset).toBe(500);
			expect(engine.drift.uncertaintyMs).toBe(50);
			expect(engine.drift.sampleCount).toBe(1);
			expect(engine.isCalibrated).toBe(true);
		});

		it('applies Exponential Moving Average (EMA) smoothing over multiple samples', () => {
			const engine = new ClockDriftEngine({ alpha: 0.5 });
			// First sample: offset = +500
			engine.ingestSample(1550, 100, 1000);
			expect(engine.offset).toBe(500);

			// Second sample: measured offset = +300
			// EMA = 0.5 * 300 + 0.5 * 500 = 400
			engine.ingestSample(1350, 100, 1000);
			expect(engine.offset).toBe(400);
			expect(engine.drift.sampleCount).toBe(2);
		});

		it('discards samples that exceed maxAcceptableRttMs', () => {
			const engine = new ClockDriftEngine({ maxAcceptableRttMs: 200 });
			engine.ingestSample(2000, 500, 1000); // RTT 500 > 200

			expect(engine.isCalibrated).toBe(false);
			expect(engine.offset).toBe(0);
		});

		it('extracts server time from Server-Timing and Date headers', () => {
			const engine = new ClockDriftEngine();

			const h1 = new Headers({ 'Server-Timing': 'clock=1727839200123' });
			expect(engine.extractServerTime(h1)).toEqual({ timeMs: 1727839200123, isCoarse: false });

			const h2 = new Headers({ 'Server-Timing': 'cache;desc="HIT", server_time=1727839200' });
			expect(engine.extractServerTime(h2)).toEqual({ timeMs: 1727839200000, isCoarse: false });

			const h3 = new Headers({ 'Date': 'Fri, 02 Oct 2026 12:00:00 GMT' });
			expect(engine.extractServerTime(h3)).toEqual({ timeMs: new Date('Fri, 02 Oct 2026 12:00:00 GMT').getTime(), isCoarse: true });

			const h4 = new Headers();
			expect(engine.extractServerTime(h4)).toBeNull();

			// Pre-year-2000 timestamps and generic time metrics are rejected
			const h5 = new Headers({ 'Server-Timing': 'time=45.2' });
			expect(engine.extractServerTime(h5)).toBeNull();

			const h6 = new Headers({ 'Date': 'Thu, 01 Jan 1970 00:00:00 GMT' });
			expect(engine.extractServerTime(h6)).toBeNull();
		});

		it('resets state correctly', () => {
			const engine = new ClockDriftEngine();
			engine.ingestSample(1550, 100, 1000);
			expect(engine.isCalibrated).toBe(true);

			engine.reset();
			expect(engine.isCalibrated).toBe(false);
			expect(engine.offset).toBe(0);
			expect(engine.drift.sampleCount).toBe(0);
		});

		it('supports deterministic disposal via dispose() and [Symbol.dispose]()', () => {
			const engine = new ClockDriftEngine();
			engine.startBackgroundSync(1000);
			expect(typeof engine.dispose).toBe('function');
			expect(typeof engine[Symbol.dispose]).toBe('function');

			engine.dispose();
			engine[Symbol.dispose]();
		});
	});

	describe('Tempo Plugin Integration', () => {
		beforeAll(() => {
			Tempo.use(NtpPlugin);
		});

		it('mounts Tempo.ntp static namespace with immutable properties', () => {
			expect(Tempo.ntp).toBeDefined();
			expect(typeof Tempo.ntp.now).toBe('function');
			expect(typeof Tempo.ntp.sync).toBe('function');
			expect(typeof Tempo.ntp.reset).toBe('function');
			expect(typeof Tempo.ntp.dispose).toBe('function');
			expect(typeof Tempo.ntp[Symbol.dispose]).toBe('function');
			expect(typeof Tempo.ntp.offset).toBe('number');
		});

		it('synchronizes via mock HTTP fetch and updates Tempo.ntp.now()', async () => {
			const mockServerMs = Date.now() + 2000; // Server is 2s ahead

			globalThis.fetch = vi.fn().mockImplementation(async () => {
				return {
					status: 200,
					headers: new Headers({
						'Server-Timing': `clock=${mockServerMs}`,
					}),
				} as any;
			});

			const state = await Tempo.ntp.sync('/api/mock-time');
			expect(state.sampleCount).toBe(1);
			expect(Tempo.ntp.isCalibrated).toBe(true);
			expect(Math.abs(Tempo.ntp.offset - 2000)).toBeLessThan(100);

			const localNow = new Tempo().epoch.ms;
			const ntpNow = Tempo.ntp.now().epoch.ms;
			expect(ntpNow - localNow).toBeGreaterThanOrEqual(1900);
		});

		it('supports toNtpTime() instance helper method', async () => {
			// Offset is currently calibrated ~+2000ms
			const t = new Tempo('2026-10-02T12:00:00.000Z');
			const ntpTime = t.toNtpTime();

			expect(ntpTime.epoch.ms - t.epoch.ms).toBe(Tempo.ntp.offset);
		});

		it('resets calibration via Tempo.ntp.reset() and disposes cleanly', () => {
			Tempo.ntp.reset();
			expect(Tempo.ntp.offset).toBe(0);
			expect(Tempo.ntp.isCalibrated).toBe(false);

			Tempo.ntp.dispose();
			Tempo.ntp[Symbol.dispose]();
		});

		it('passively ingests samples from allowed origins and filters untrusted origins', async () => {
			Tempo.ntp.dispose();

			const mockEpoch = Date.now() + 1000;
			// Mock underlying fetch to return server timestamp
			globalThis.fetch = vi.fn().mockImplementation(async () => {
				return {
					status: 200,
					headers: new Headers({
						'Server-Timing': `clock=${mockEpoch}`,
					}),
				} as any;
			});

			(NtpPlugin as any).install(Tempo, {
				interceptFetch: true,
				trustedOrigins: ['https://api.trusted.com', '/api/internal'],
			});

			// 1. Untrusted third-party call: should NOT calibrate
			await globalThis.fetch('https://untrusted-thirdparty.com/analytics');
			expect(Tempo.ntp.isCalibrated).toBe(false);
			expect(Tempo.ntp.drift.sampleCount).toBe(0);

			// Lookalike host call: should NOT calibrate
			await globalThis.fetch('https://api.trusted.com.attacker.com/steal');
			expect(Tempo.ntp.isCalibrated).toBe(false);
			expect(Tempo.ntp.drift.sampleCount).toBe(0);

			// 2. Trusted origin call: SHOULD calibrate
			await globalThis.fetch('https://api.trusted.com/data');
			expect(Tempo.ntp.isCalibrated).toBe(true);
			expect(Tempo.ntp.drift.sampleCount).toBe(1);

			// 3. Trusted path call: SHOULD calibrate
			await globalThis.fetch('/api/internal/status');
			expect(Tempo.ntp.drift.sampleCount).toBe(2);

			Tempo.ntp.dispose();
		});

		it('supports regex and predicate matching in interceptFetch directly', async () => {
			Tempo.ntp.dispose();

			const mockEpoch = Date.now() + 1000;
			globalThis.fetch = vi.fn().mockImplementation(async () => {
				return {
					status: 200,
					headers: new Headers({
						'Server-Timing': `clock=${mockEpoch}`,
					}),
				} as any;
			});

			(NtpPlugin as any).install(Tempo, {
				interceptFetch: (url: string) => url.includes('safe-zone'),
			});

			// Disallowed
			await globalThis.fetch('https://api.other.com/metrics');
			expect(Tempo.ntp.isCalibrated).toBe(false);

			// Allowed via predicate
			await globalThis.fetch('https://api.other.com/safe-zone/time');
			expect(Tempo.ntp.isCalibrated).toBe(true);
			expect(Tempo.ntp.drift.sampleCount).toBe(1);

			Tempo.ntp.dispose();
		});

		it('automatically activates fetch interception when trustedOrigins is provided without interceptFetch', async () => {
			Tempo.ntp.dispose();

			const mockEpoch = Date.now() + 1500;
			globalThis.fetch = vi.fn().mockImplementation(async () => {
				return {
					status: 200,
					headers: new Headers({
						'Server-Timing': `clock=${mockEpoch}`,
					}),
				} as any;
			});

			(NtpPlugin as any).install(Tempo, {
				trustedOrigins: ['https://auto-active.example.com'],
			});

			// Untrusted origin: not calibrated
			await globalThis.fetch('https://other.com/api');
			expect(Tempo.ntp.isCalibrated).toBe(false);

			// Trusted origin: auto-intercepts and calibrates
			await globalThis.fetch('https://auto-active.example.com/api');
			expect(Tempo.ntp.isCalibrated).toBe(true);
			expect(Tempo.ntp.drift.sampleCount).toBe(1);

			Tempo.ntp.dispose();
		});

		it('respects interceptFetch: false even when trustedOrigins is provided', async () => {
			Tempo.ntp.dispose();

			const mockEpoch = Date.now() + 1500;
			globalThis.fetch = vi.fn().mockImplementation(async () => {
				return {
					status: 200,
					headers: new Headers({
						'Server-Timing': `clock=${mockEpoch}`,
					}),
				} as any;
			});

			(NtpPlugin as any).install(Tempo, {
				interceptFetch: false,
				trustedOrigins: ['https://auto-active.example.com'],
			});

			// With interceptFetch: false, fetch wrapper is not active and no calibration occurs
			await globalThis.fetch('https://auto-active.example.com/api');
			expect(Tempo.ntp.isCalibrated).toBe(false);

			Tempo.ntp.dispose();
		});
	});
});

