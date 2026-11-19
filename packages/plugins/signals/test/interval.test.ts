import { Interval, Tempo } from '@magmacomputing/tempo';
import { intervalSignal } from '../src/index.js';

describe('intervalSignal()', () => {
	it.each([
		[-1, true, false, false, 0],
		[0, false, true, false, 0],
		[500, false, true, false, 0.5],
		[999, false, true, false, 0.999],
		[1_000, false, false, true, 1],
		[1_001, false, false, true, 1],
	])('initializes half-open interval state at offset %i', (offset, future, current, past, progress) => {
		const baseMs = 1_800_000_000_000;
		const interval = new Interval(new Tempo(baseMs), new Tempo(baseMs + 1_000));
		using state = intervalSignal(interval, { now: () => baseMs + offset, progressInterval: false });
		expect(state.isFuture.get()).toBe(future);
		expect(state.isCurrent.get()).toBe(current);
		expect(state.isPast.get()).toBe(past);
		expect(state.progress.get()).toBeCloseTo(progress);
	});

	it.each([0, -100])('disables periodic ticks for progressInterval %i', progressInterval => {
		const baseMs = 1_800_000_000_000;
		vi.setSystemTime(baseMs);
		const interval = new Interval(new Tempo(baseMs), new Tempo(baseMs + 2_000));
		using state = intervalSignal(interval, { progressInterval });
		expect(vi.getTimerCount()).toBe(1);
		vi.advanceTimersByTime(1_000);
		expect(state.progress.get()).toBe(0);
		vi.advanceTimersByTime(1_000);
		expect(state.isPast.get()).toBe(true);
		expect(state.progress.get()).toBe(1);
		expect(vi.getTimerCount()).toBe(0);
	});

	it('reschedules distant boundaries without overflowing the platform timeout limit', () => {
		const baseMs = 1_800_000_000_000;
		const maxTimeout = 2_147_483_647;
		const startMs = baseMs + maxTimeout + 100;
		vi.setSystemTime(baseMs);
		const interval = new Interval(new Tempo(startMs), new Tempo(startMs + 1_000));
		using state = intervalSignal(interval, { progressInterval: false });
		expect(vi.getTimerCount()).toBe(1);
		vi.advanceTimersByTime(maxTimeout);
		expect(state.isFuture.get()).toBe(true);
		expect(vi.getTimerCount()).toBe(1);
		vi.advanceTimersByTime(100);
		expect(state.isCurrent.get()).toBe(true);
		vi.advanceTimersByTime(1_000);
		expect(state.isPast.get()).toBe(true);
		expect(vi.getTimerCount()).toBe(0);
	});

	it('cancels a future boundary when disposed before the interval starts', () => {
		const baseMs = 1_800_000_000_000;
		vi.setSystemTime(baseMs);
		const interval = new Interval(new Tempo(baseMs + 1_000), new Tempo(baseMs + 2_000));
		using state = intervalSignal(interval);
		expect(state.isFuture.get()).toBe(true);
		state[Symbol.dispose]();
		expect(vi.getTimerCount()).toBe(0);
		vi.advanceTimersByTime(3_000);
		expect(state.disposed).toBe(true);
		expect(state.isFuture.get()).toBe(true);
		expect(state.isCurrent.get()).toBe(false);
	});

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

	it.each([false, 0, -100] as const)('preserves boundaries with progress interval %s', progressInterval => {
		vi.setSystemTime(0);
		using state = intervalSignal(new Interval(Temporal.Instant.fromEpochMilliseconds(0), Temporal.Instant.fromEpochMilliseconds(2_000)), { progressInterval });
		expect(state.isCurrent.get()).toBe(true);
		expect(vi.getTimerCount()).toBe(1);
		vi.advanceTimersByTime(1_999);
		expect(state.progress.get()).toBe(0);
		vi.advanceTimersByTime(1);
		expect(state.isPast.get()).toBe(true);
		expect(state.progress.get()).toBe(1);
		expect(vi.getTimerCount()).toBe(0);
	});

	it('keeps an entirely unbounded interval current without timers', () => {
		using state = intervalSignal(new Interval(null, null), { now: () => 0 });
		expect(state.isCurrent.get()).toBe(true);
		expect(state.isFuture.get()).toBe(false);
		expect(state.isPast.get()).toBe(false);
		expect(state.progress.get()).toBe(0);
		expect(vi.getTimerCount()).toBe(0);
	});

	it('enters an interval with an unbounded end and stops scheduling', () => {
		vi.setSystemTime(0);
		using state = intervalSignal(new Interval(Temporal.Instant.fromEpochMilliseconds(1_000), null));
		expect(state.isFuture.get()).toBe(true);
		vi.advanceTimersByTime(1_000);
		expect(state.isCurrent.get()).toBe(true);
		expect(state.isPast.get()).toBe(false);
		expect(state.progress.get()).toBe(0);
		expect(vi.getTimerCount()).toBe(0);
	});

	it('reschedules distant start boundaries at the maximum timeout', () => {
		vi.setSystemTime(0);
		const start = 2_147_483_647 + 1_000;
		using state = intervalSignal(new Interval(new Tempo(start), new Tempo(start + 1_000)));
		vi.advanceTimersByTime(2_147_483_647);
		expect(state.isFuture.get()).toBe(true);
		expect(vi.getTimerCount()).toBe(1);
		vi.advanceTimersByTime(1_000);
		expect(state.isCurrent.get()).toBe(true);
		vi.advanceTimersByTime(1_000);
		expect(state.isPast.get()).toBe(true);
		expect(state.progress.get()).toBe(1);
		expect(vi.getTimerCount()).toBe(0);
	});

	it('cancels a future boundary when disposed before the start', () => {
		vi.setSystemTime(0);
		const state = intervalSignal(new Interval(Temporal.Instant.fromEpochMilliseconds(1_000), Temporal.Instant.fromEpochMilliseconds(2_000)));
		state.dispose();
		vi.advanceTimersByTime(3_000);
		expect(state.disposed).toBe(true);
		expect(state.isFuture.get()).toBe(true);
		expect(state.isPast.get()).toBe(false);
		expect(vi.getTimerCount()).toBe(0);
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
