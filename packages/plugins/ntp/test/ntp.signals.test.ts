import { Tempo } from '@magmacomputing/tempo';
import { Signify } from '@magmacomputing/tempo/library';
import { NtpPlugin, ClockDriftEngine } from '../src/index.js';
import { TickerPlugin } from '../../ticker/src/index.js';

Tempo.use(NtpPlugin);
Tempo.use(TickerPlugin);

describe('NTP Plugin Signify Reactivity', () => {
	let originalFetch: typeof globalThis.fetch;

	beforeEach(() => {
		originalFetch = globalThis.fetch;
		Tempo.init();
		if (Tempo.ntp) {
			Tempo.ntp.reset();
		}
	});

	afterEach(() => {
		globalThis.fetch = originalFetch;
		if (Tempo.ntp) {
			Tempo.ntp.reset();
		}
	});

	test('Tempo.ntp.signals exposes fine-grained TC39 signals', () => {
		const signals = Tempo.ntp.signals;
		expect(signals).toBeDefined();

		expect(typeof signals.offset).toBe('function');
		expect(signals.offset.value).toBe(0);
		expect(signals.offset.get()).toBe(0);

		expect(typeof signals.isCalibrated).toBe('function');
		expect(signals.isCalibrated.value).toBe(false);

		expect(typeof signals.drift).toBe('function');
		expect(signals.drift.value.sampleCount).toBe(0);
	});

	test('ingesting samples updates signals and triggers Signify.computed / Signify.effect', async () => {
		const engine = new ClockDriftEngine({ maxAcceptableRttMs: 1000 });
		const signals = engine.signals;

		const observedOffsets: number[] = [];
		const sub = Signify.effect(() => {
			observedOffsets.push(signals.offset.value);
		});

		expect(observedOffsets).toEqual([0]);

		// Ingest single sample: offset = 1550 - (1000 + 50) = +500
		engine.ingestSample(1550, 100, 1000);

		expect(signals.offset.value).toBe(500);
		expect(signals.isCalibrated.value).toBe(true);
		expect(signals.drift.value.sampleCount).toBe(1);

		// Allow effect microtask to flush
		await new Promise(r => queueMicrotask(r));

		// Signify effect re-evaluated
		expect(observedOffsets).toContain(500);

		// Test reset() restores reactive signals
		engine.reset();
		expect(signals.offset.value).toBe(0);
		expect(signals.isCalibrated.value).toBe(false);

		sub.dispose();
	});

	test('computed wall clock derives calibrated time from Tempo.ntp.signals.offset', () => {
		const engine = new ClockDriftEngine();
		const offsetSig = engine.signals.offset;

		const localTimeMs = 1_000_000;
		const calibratedTime = Signify.computed(() => localTimeMs + offsetSig.value);

		expect(calibratedTime.value).toBe(1_000_000);

		engine.ingestSample(1_000_250, 100, localTimeMs);
		// measuredOffset = 1_000_250 - (1_000_000 + 50) = 200
		expect(engine.offset).toBe(200);
		expect(calibratedTime.value).toBe(1_000_200);
	});

	test('Tempo.ntp.signal() returns ticking calibrated ReadonlySignal with auto-disposal', async () => {
		const ntpClock = Tempo.ntp.signal({ interval: 0.05 });

		expect(ntpClock.value).toBeInstanceOf(Tempo);
		const initialMs = ntpClock.value.epoch.ms;

		await new Promise(r => setTimeout(r, 120));
		expect(ntpClock.value.epoch.ms).toBeGreaterThan(initialMs);

		ntpClock[Symbol.dispose]();

		const stoppedMs = ntpClock.value.epoch.ms;
		await new Promise(r => setTimeout(r, 120));
		expect(ntpClock.value.epoch.ms).toBe(stoppedMs);
	});

	test('cross-plugin synergy: Tempo.ticker({ ntp: true }).signal reflects NTP calibrated state', () => {
		const ticker = Tempo.ticker({ seconds: 1, ntp: true });
		const sig = ticker.signal;

		expect(sig.value).toBeInstanceOf(Tempo);
		expect(sig.get()).toBeInstanceOf(Tempo);

		ticker.stop();
	});
});
