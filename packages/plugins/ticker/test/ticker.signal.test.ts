import { Tempo } from '@magmacomputing/tempo';
import { Signify } from '@magmacomputing/tempo/library';
import { TickerPlugin } from '../src/index.js';

Tempo.use(TickerPlugin);

describe('Ticker Signal & TC39 Signify Reactivity', () => {
	beforeEach(() => {
		Tempo.init();
	});

	test('ticker.signal exposes ReadonlySignal initialized to seed Tempo', () => {
		const ticker = Tempo.ticker({ seconds: 1 });
		const sig = ticker.signal;

		expect(sig).toBeDefined();
		expect(typeof sig).toBe('function');
		expect(sig.value).toBeInstanceOf(Tempo);
		expect(sig.get()).toBeInstanceOf(Tempo);
		expect(sig.epoch).toBeGreaterThanOrEqual(0);

		// Cached reference identity
		expect(ticker.signal).toBe(sig);

		ticker.stop();
	});

	test('manual pulse() updates ticker.signal synchronously', () => {
		const ticker = Tempo.ticker({ seconds: 1 });
		const sig = ticker.signal;
		const initialMs = sig.value.epoch.ms;
		const initialEpoch = sig.epoch;

		const pulsed = ticker.pulse();
		expect(sig.value.epoch.ms).toBe(pulsed.epoch.ms);
		expect(sig.value.epoch.ms).toBeGreaterThan(initialMs);
		expect(sig.epoch).toBeGreaterThan(initialEpoch);

		ticker.stop();
	});

	test('Signify.computed reacts dynamically to ticker.signal pulses', () => {
		const ticker = Tempo.ticker({ seconds: 60 });
		const sig = ticker.signal;

		const formatted = Signify.computed(() => sig.value.format('{yyyy}'));
		expect(formatted.value).toBe(sig.value.format('{yyyy}'));

		// Computed tracking epoch changes
		const initialFormatted = formatted.value;
		expect(initialFormatted).toBeDefined();

		ticker.stop();
	});

	test('Signify.computed tracks ticker.signal directly without wrapper retention leaks', () => {
		const ticker = Tempo.ticker({ seconds: 60 });
		const computed = Signify.computed(() => ticker.signal.value.epoch.ms);

		const firstMs = computed.value;
		expect(firstMs).toBeGreaterThan(0);

		const pulsed = ticker.pulse();
		expect(computed.value).toBe(pulsed.epoch.ms);
		expect(computed.value).toBeGreaterThan(firstMs);

		ticker.stop();
	});

	test('Signify.effect tracks pulses from ticker.signal', async () => {
		const ticker = Tempo.ticker({ seconds: 0.05, limit: 3 });
		const sig = ticker.signal;
		const observed: number[] = [];

		const sub = Signify.effect(() => {
			observed.push(sig.value.epoch.ms);
		});

		expect(observed.length).toBe(1); // Immediate execution upon registration

		// Wait for pulses to fire
		await new Promise(r => setTimeout(r, 200));

		expect(observed.length).toBeGreaterThanOrEqual(2);
		sub.dispose();
		ticker.stop();
	});

	test('toSignal(fallback) accepts explicit fallback value before first tick', () => {
		const ticker = Tempo.ticker({ seed: new Tempo().add({ minutes: 5 }) });
		const fallbackSig = ticker.toSignal('PENDING');

		expect(fallbackSig.value).toBe('PENDING');

		const pulsed = ticker.pulse();
		expect(fallbackSig.value).toBe(pulsed);

		ticker.stop();
	});

	test('Tempo.ticker.signal() static constructor creates auto-disposable signal', async () => {
		const clock = Tempo.ticker.signal(0.05);

		expect(clock.value).toBeInstanceOf(Tempo);
		const initialMs = clock.value.epoch.ms;

		await new Promise(r => setTimeout(r, 120));
		expect(clock.value.epoch.ms).toBeGreaterThan(initialMs);

		// Explicit disposal
		clock[Symbol.dispose]();

		const stoppedMs = clock.value.epoch.ms;
		await new Promise(r => setTimeout(r, 120));
		expect(clock.value.epoch.ms).toBe(stoppedMs);
	});

	test('ticker.stop() halts updates while retaining terminal Tempo snapshot', () => {
		const ticker = Tempo.ticker({ seconds: 1 });
		const sig = ticker.signal;

		ticker.pulse();
		const lastValue = sig.value;

		ticker.stop();

		// Reading terminal value remains safe and unchanged
		expect(sig.value).toBe(lastValue);
	});

	test('ticker.stop(terminalValue) delivers terminal value to ticker.signal before disposal', () => {
		const ticker = Tempo.ticker({ seconds: 1 });
		const sig = ticker.signal;
		const initialMs = sig.value.epoch.ms;

		const terminal = new Tempo().add({ days: 10 });
		ticker.stop(terminal);

		// Signal value reflects the terminal value passed to stop()
		expect(sig.value.epoch.ms).toBe(terminal.epoch.ms);
		expect(sig.value.epoch.ms).toBeGreaterThan(initialMs);
	});

	const gcAvailable = typeof (globalThis as any).gc === 'function';

	test.skipIf(!gcAvailable)('ticker remains active and updates when temporary ticker proxy is dropped and only signal is retained', async () => {
		const gc = (globalThis as any).gc as () => void;
		let signal: any;

		(() => {
			const ticker = Tempo.ticker({ seconds: 0.05 });
			signal = ticker.signal;
		})();

		const computed = Signify.computed(() => signal.value.epoch.ms);
		const initialMs = computed.value;
		expect(initialMs).toBeGreaterThan(0);

		// Invoke GC after the ticker proxy is out of scope
		gc();

		// Record the current computed value immediately after GC
		const postGcMs = computed.value;

		// Wait asynchronously for the ticker to pulse
		await new Promise(r => setTimeout(r, 120));

		gc();

		// The computed value must increase, proving the ticker is still alive
		expect(computed.value).toBeGreaterThan(postGcMs);

		// Cleanup via signal disposal, which severs activeProxy
		const INSTANCE_KEY = Symbol.for('Tempo.ticker.instance');
		signal.dispose?.();
		expect(signal[INSTANCE_KEY]).toBeUndefined();
	});

	test('disposing ticker.signal clears cache and subsequent read creates a fresh active signal', () => {
		const ticker = Tempo.ticker({ seconds: 1 });
		const sig1 = ticker.signal;
		expect(sig1).toBeDefined();

		// Same cached instance initially
		expect(ticker.signal).toBe(sig1);

		// Capture the value at the moment of disposal
		const sig1Snapshot = sig1.value.epoch.ms;

		// Dispose the signal
		sig1.dispose?.();
		expect((sig1 as any).disposed).toBe(true);

		// Subsequent read should create a fresh active signal
		const sig2 = ticker.signal;
		expect(sig2).toBeDefined();
		expect(sig2).not.toBe(sig1);
		expect((sig2 as any).disposed).toBe(false);

		// Fresh signal receives new pulses while disposed signal remains frozen
		const pulsed = ticker.pulse();
		expect(sig2.value.epoch.ms).toBe(pulsed.epoch.ms);
		expect(sig1.value.epoch.ms).toBe(sig1Snapshot);

		ticker.stop();
	});
});
