import { Tempo } from '@magmacomputing/tempo';
import { disposeConfigSignals, toRelativeSignal } from '../src/index.js';

describe('toRelativeSignal()', () => {
	beforeEach(() => {
		vi.useFakeTimers();
		Tempo.init({ locale: 'en-US', timeZone: 'UTC' });
	});

	afterEach(() => {
		disposeConfigSignals();
		vi.useRealTimers();
		vi.restoreAllMocks();
		Tempo.init({ locale: 'en-US', timeZone: 'UTC' });
	});

	it('accepts Tempo, Temporal.Instant, Temporal.ZonedDateTime, epoch objects, ISO strings, numbers, and bigints', () => {
		const baseMs = Date.UTC(2026, 6, 1, 12, 0, 0);
		vi.setSystemTime(baseMs);
		const targetMs = baseMs + 5_000;

		const targets = [
			new Tempo(targetMs),
			Temporal.Instant.fromEpochMilliseconds(targetMs),
			Temporal.Instant.fromEpochMilliseconds(targetMs).toZonedDateTimeISO('UTC'),
			{ epoch: { ms: targetMs } },
			{ epochMilliseconds: targetMs },
			new Date(targetMs).toISOString(),
			targetMs,
			BigInt(targetMs) * 1_000_000n,
		];

		for (const target of targets) {
			using sig = toRelativeSignal(target, { locale: 'en-US', now: () => baseMs });
			expect(sig.get()).toBe('in 5s');
		}
	});

	it('throws for invalid temporal targets', () => {
		const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
		try {
			expect(() => toRelativeSignal('not-a-valid-date')).toThrow();
		} finally {
			errorSpy.mockRestore();
		}
	});

	it.each([
		[60_000, 'minute'],
		[3_600_000, 'hour'],
		[86_400_000, 'day'],
		[2_592_000_000, 'month'],
		[31_536_000_000, 'year'],
	] as const)('changes units exactly at the %i ms past boundary', (boundary, unit) => {
		vi.setSystemTime(0);
		using sig = toRelativeSignal(1 - boundary, {
			locale: 'en-US', style: 'long', numeric: 'always',
		});
		const before = sig.get();
		vi.advanceTimersByTime(1);
		expect(sig.get()).toBe(`1 ${unit} ago`);
		expect(sig.get()).not.toBe(before);
		expect(vi.getTimerCount()).toBe(1);
	});

	it.each([
		{ epoch: { ns: -1_500_000_000n } },
		{ epochNanoseconds: -1_500_000_000n },
		-1_500_000_000n,
	])('preserves negative subsecond precision for target %#', target => {
		vi.setSystemTime(0);
		using sig = toRelativeSignal(target, {
			locale: 'en-US', style: 'long', numeric: 'always',
		});
		expect(sig.get()).toBe('1 second ago');
		vi.advanceTimersByTime(499);
		expect(sig.get()).toBe('1 second ago');
		vi.advanceTimersByTime(1);
		expect(sig.get()).toBe('2 seconds ago');
	});

	it('caps long delays and reschedules without a timeout overflow', () => {
		vi.setSystemTime(0);
		using sig = toRelativeSignal(-31_536_000_000, {
			locale: 'en-US', style: 'long', numeric: 'always',
		});
		expect(sig.get()).toBe('1 year ago');
		vi.advanceTimersByTime(2_147_483_647);
		expect(sig.get()).toBe('1 year ago');
		expect(vi.getTimerCount()).toBe(1);
		sig.dispose();
		expect(vi.getTimerCount()).toBe(0);
	});

	it('exposes frozen callable DisposableSignal interface', () => {
		const baseMs = Date.UTC(2026, 6, 1, 12, 0, 0);
		using sig = toRelativeSignal(baseMs + 5_000, {
			locale: 'en-US',
			style: 'long',
			numeric: 'always',
			now: () => baseMs,
		});

		expect(Object.isFrozen(sig)).toBe(true);
		expect(sig()).toBe('in 5 seconds');
		expect(sig.get()).toBe('in 5 seconds');
		expect(sig.value).toBe('in 5 seconds');
		expect(typeof sig.epoch).toBe('number');
		expect(sig[Symbol.toStringTag]).toBe('Signify.Computed');
		expect(sig.disposed).toBe(false);
	});

	it('updates at exact unit-bucket boundaries when timers advance', () => {
		const baseMs = Date.UTC(2026, 6, 1, 12, 0, 0);
		let nowMs = baseMs;
		vi.setSystemTime(nowMs);

		// Target is 2 seconds in the future
		using sig = toRelativeSignal(baseMs + 2_000, {
			locale: 'en-US',
			style: 'long',
			now: () => nowMs,
		});

		expect(sig.get()).toBe('in 2 seconds');

		nowMs += 1;
		vi.advanceTimersByTime(1);
		expect(sig.get()).toBe('in 1 second');

		nowMs += 999;
		vi.advanceTimersByTime(999);
		expect(sig.get()).toBe('in 1 second');

		nowMs += 1_000;
		vi.advanceTimersByTime(1_000);
		expect(sig.get()).toBe('now');

		nowMs += 1_000;
		vi.advanceTimersByTime(1_000);
		expect(sig.get()).toBe('1 second ago');
	});

	it('updates at the 365-day month-to-year threshold for past targets', () => {
		const DAY = 86_400_000;
		const baseMs = Date.UTC(2026, 6, 1, 12, 0, 0);
		let nowMs = baseMs;
		vi.setSystemTime(nowMs);

		// Target is 360 days ago (month/-12), 5 days shy of 365-day year threshold
		using sig = toRelativeSignal(baseMs - 360 * DAY, {
			locale: 'en-US',
			style: 'long',
			now: () => nowMs,
		});

		expect(sig.get()).toBe('12 months ago');

		nowMs += 5 * DAY;
		vi.advanceTimersByTime(5 * DAY);
		expect(sig.get()).toBe('last year');
	});

	it('reacts to Tempo.init({ locale }) when no explicit locale option is set, and ignores it when explicit', () => {
		const baseMs = Date.UTC(2026, 6, 1, 12, 0, 0);
		using reactive = toRelativeSignal(baseMs + 5_000, {
			style: 'long',
			now: () => baseMs,
		});
		using fixed = toRelativeSignal(baseMs + 5_000, {
			locale: 'en-US',
			style: 'long',
			now: () => baseMs,
		});

		expect(reactive.get()).toBe('in 5 seconds');
		expect(fixed.get()).toBe('in 5 seconds');

		Tempo.init({ locale: 'fr-FR' });
		expect(reactive.get()).toBe('dans 5 secondes');
		expect(fixed.get()).toBe('in 5 seconds');
	});

	it('stops updating and clears timers on dispose() and Symbol.dispose()', () => {
		const baseMs = Date.UTC(2026, 6, 1, 12, 0, 0);
		let nowMs = baseMs;

		const sig = toRelativeSignal(baseMs + 5_000, {
			locale: 'en-US',
			style: 'long',
			now: () => nowMs,
		});

		expect(sig.get()).toBe('in 5 seconds');
		sig.dispose();
		expect(sig.disposed).toBe(true);
		// Calling dispose again is a no-op
		sig[Symbol.dispose]();
		expect(sig.disposed).toBe(true);

		nowMs += 3_000;
		vi.advanceTimersByTime(3_000);
		expect(sig.get()).toBe('in 5 seconds');
	});
});
