import { Interval, Tempo } from '@magmacomputing/tempo';
import { intervalSignal } from '../src/index.js';

describe('intervalSignal()', () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
		vi.restoreAllMocks();
	});

	it('throws TypeError when passed a non-Interval value', () => {
		expect(() => intervalSignal({} as any)).toThrow(TypeError);
		expect(() => intervalSignal(null as any)).toThrow(TypeError);
	});

	it('transitions cleanly from future -> current (with progress) -> past across boundary timers', () => {
		const baseMs = Date.UTC(2026, 6, 1, 12, 0, 0);
		let nowMs = baseMs;
		vi.setSystemTime(nowMs);

		const start = new Tempo(baseMs + 2_000);
		const end = new Tempo(baseMs + 6_000); // 4s duration
		const interval = new Interval(start, end);

		using state = intervalSignal(interval, {
			now: () => nowMs,
			progressInterval: 1_000,
		});

		expect(Object.isFrozen(state)).toBe(true);
		expect(state.disposed).toBe(false);

		// Future
		expect(state.isFuture.get()).toBe(true);
		expect(state.isCurrent.get()).toBe(false);
		expect(state.isPast.get()).toBe(false);
		expect(state.progress.get()).toBe(0);

		// Advance to start boundary (baseMs + 2_000)
		nowMs += 2_000;
		vi.advanceTimersByTime(2_000);
		expect(state.isFuture.get()).toBe(false);
		expect(state.isCurrent.get()).toBe(true);
		expect(state.isPast.get()).toBe(false);
		expect(state.progress.get()).toBe(0);

		// Advance 1s into interval -> progress = 0.25
		nowMs += 1_000;
		vi.advanceTimersByTime(1_000);
		expect(state.isCurrent.get()).toBe(true);
		expect(state.progress.get()).toBeCloseTo(0.25, 5);

		// Advance another 1s -> progress = 0.5
		nowMs += 1_000;
		vi.advanceTimersByTime(1_000);
		expect(state.progress.get()).toBeCloseTo(0.5, 5);

		// Advance to end boundary (baseMs + 6_000) -> past, progress = 1
		nowMs += 2_000;
		vi.advanceTimersByTime(2_000);
		expect(state.isFuture.get()).toBe(false);
		expect(state.isCurrent.get()).toBe(false);
		expect(state.isPast.get()).toBe(true);
		expect(state.progress.get()).toBe(1);
	});

	it('disables periodic progress ticks when progressInterval is false while preserving boundary transitions', () => {
		const baseMs = Date.UTC(2026, 6, 1, 12, 0, 0);
		let nowMs = baseMs;

		const interval = new Interval(new Tempo(baseMs), new Tempo(baseMs + 4_000));
		using state = intervalSignal(interval, {
			now: () => nowMs,
			progressInterval: false,
		});

		expect(state.isCurrent.get()).toBe(true);
		expect(state.progress.get()).toBe(0);

		nowMs += 2_000;
		vi.advanceTimersByTime(2_000);
		// Progress should not have ticked without progressInterval
		expect(state.progress.get()).toBe(0);
		expect(state.isCurrent.get()).toBe(true);

		// End boundary still fires
		nowMs += 2_000;
		vi.advanceTimersByTime(2_000);
		expect(state.isCurrent.get()).toBe(false);
		expect(state.isPast.get()).toBe(true);
		expect(state.progress.get()).toBe(1);
	});

	it('handles already-past intervals without scheduling timers', () => {
		const baseMs = Date.UTC(2026, 6, 1, 12, 0, 0);
		const interval = new Interval(new Tempo(baseMs - 10_000), new Tempo(baseMs - 5_000));

		using state = intervalSignal(interval, { now: () => baseMs });
		expect(state.isFuture.get()).toBe(false);
		expect(state.isCurrent.get()).toBe(false);
		expect(state.isPast.get()).toBe(true);
		expect(state.progress.get()).toBe(1);
		expect(vi.getTimerCount()).toBe(0);
	});

	it('clears all timers and stops updating on dispose() / Symbol.dispose()', () => {
		const baseMs = Date.UTC(2026, 6, 1, 12, 0, 0);
		let nowMs = baseMs;

		const interval = new Interval(new Tempo(baseMs), new Tempo(baseMs + 4_000));
		const state = intervalSignal(interval, {
			now: () => nowMs,
			progressInterval: 500,
		});

		expect(state.isCurrent.get()).toBe(true);
		expect(vi.getTimerCount()).toBeGreaterThan(0);

		state.dispose();
		expect(state.disposed).toBe(true);
		expect(vi.getTimerCount()).toBe(0);

		// Idempotent Symbol.dispose
		state[Symbol.dispose]();
		expect(state.disposed).toBe(true);

		nowMs += 5_000;
		vi.advanceTimersByTime(5_000);
		expect(state.isCurrent.get()).toBe(true);
		expect(state.isPast.get()).toBe(false);
		expect(state.progress.get()).toBe(0);
	});
});
