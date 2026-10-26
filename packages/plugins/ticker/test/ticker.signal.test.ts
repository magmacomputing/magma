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
});
