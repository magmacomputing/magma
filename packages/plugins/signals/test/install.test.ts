import { Interval, Tempo } from 'tempo-kit';
import {
	SignalsPlugin,
	default as defaultExport,
	signalsPlugin,
} from '../src/install.js';

describe('Side-Effect Installation (../src/install.js)', () => {
	afterEach(() => {
		Tempo.signals?.dispose();
	});

	it('auto-registers SignalsPlugin onto Tempo upon importing ../src/install.js', () => {
		expect(SignalsPlugin).toBe(signalsPlugin);
		expect(SignalsPlugin).toBe(defaultExport);
		expect(Tempo.signals).toBeDefined();
		expect(Object.isFrozen(Tempo.signals)).toBe(true);
	});

	it('mounts frozen Tempo.signals namespace with expected members', () => {
		expect(Tempo.signals.locale).toBeDefined();
		expect(Tempo.signals.timeZone).toBeDefined();
		expect(typeof Tempo.signals.relative).toBe('function');
		expect(typeof Tempo.signals.interval).toBe('function');
		expect(typeof Tempo.signals.dispose).toBe('function');
		expect(typeof Tempo.signals[Symbol.dispose]).toBe('function');

		expect(() => {
			(Tempo.signals as any).relative = () => {};
		}).toThrow();
	});

	it('mounts Tempo.prototype.toRelativeSignal and Interval.prototype.toSignal', () => {
		const nowMs = Date.now();
		const target = new Tempo(nowMs + 5_000);
		expect(typeof target.toRelativeSignal).toBe('function');

		using rel = target.toRelativeSignal({
			locale: 'en-US',
			now: () => nowMs,
		});
		expect(typeof rel.get()).toBe('string');

		const interval = new Interval(new Tempo(nowMs - 5_000), new Tempo(nowMs + 5_000));
		expect(typeof interval.toSignal).toBe('function');

		using iv = interval.toSignal({
			now: () => nowMs,
			progressInterval: false,
		});
		expect(iv.isCurrent.get()).toBe(true);
		expect(iv.progress.get()).toBeCloseTo(0.5, 5);
	});
});
