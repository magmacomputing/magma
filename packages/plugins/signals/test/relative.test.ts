import { Tempo } from 'tempo-kit';
import { disposeConfigSignals, toRelativeSignal } from '../src/index.js';

describe('toRelativeSignal()', () => {
	it.each([
		[59_999, 'in 59 seconds'],
		[60_000, 'in 1 minute'],
		[3_599_999, 'in 59 minutes'],
		[3_600_000, 'in 1 hour'],
		[86_399_999, 'in 23 hours'],
		[86_400_000, 'in 1 day'],
		[2_592_000_000, 'in 1 month'],
		[31_536_000_000, 'in 1 year'],
		[-59_999, '59 seconds ago'],
		[-60_000, '1 minute ago'],
		[-3_600_000, '1 hour ago'],
		[-86_400_000, '1 day ago'],
		[-2_592_000_000, '1 month ago'],
		[-31_536_000_000, '1 year ago'],
	])('selects the correct unit for an offset of %i ms', (offset, expected) => {
		using signal = toRelativeSignal(offset, { locale: 'en-US', style: 'long', numeric: 'always', now: () => 0 });
		expect(signal.get()).toBe(expected);
	});

	it.each([
		{ epoch: { ns: -1_500_000_000n } },
		{ epochNanoseconds: -1_500_000_000n },
		-1_500_000_000n,
	])('preserves negative nanosecond targets: %s', target => {
		using signal = toRelativeSignal(target, { locale: 'en-US', style: 'long', numeric: 'always', now: () => 0 });
		expect(signal.get()).toBe('1 second ago');
	});

	it('crosses a past minute boundary at the scheduled millisecond using the default clock', () => {
		vi.setSystemTime(0);
		using signal = toRelativeSignal(-59_999, { locale: 'en-US', style: 'long', numeric: 'always' });
		expect(signal.get()).toBe('59 seconds ago');
		expect(vi.getTimerCount()).toBe(1);
		vi.advanceTimersByTime(1);
		expect(signal.get()).toBe('1 minute ago');
		expect(vi.getTimerCount()).toBe(1);
		signal.dispose();
		expect(vi.getTimerCount()).toBe(0);
	});

	it('disposing one relative signal leaves other consumers updating', () => {
		vi.setSystemTime(0);
		using first = toRelativeSignal(-1_000, { locale: 'en-US', style: 'long' });
		using second = toRelativeSignal(-1_000, { locale: 'en-US', style: 'long' });
		expect(first.get()).toBe('1 second ago');
		expect(second.get()).toBe('1 second ago');
		first.dispose();
		expect(vi.getTimerCount()).toBe(1);
		vi.advanceTimersByTime(1_000);
		expect(first.get()).toBe('1 second ago');
		expect(second.get()).toBe('2 seconds ago');
	});

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
			style: 'long',
			now: () => nowMs,
		});
		using activeSig = toRelativeSignal(baseMs + 5_000, {
			style: 'long',
			now: () => nowMs,
		});

		expect(sig.get()).toBe('in 5 seconds');
		expect(activeSig.get()).toBe('in 5 seconds');
		sig.dispose();
		expect(sig.disposed).toBe(true);
		// Calling dispose again is a no-op
		sig[Symbol.dispose]();
		expect(sig.disposed).toBe(true);

		nowMs += 3_000;
		vi.advanceTimersByTime(3_000);
		expect(sig.get()).toBe('in 5 seconds');

		Tempo.init({ locale: 'fr-FR' });
		expect(activeSig.get()).toBe('dans 2 secondes');
		expect(sig.get()).toBe('in 5 seconds');
	});

	it('truncates future targets toward zero when now has advanced by a few milliseconds', () => {
		const baseMs = Date.UTC(2026, 6, 1, 12, 0, 0);
		const target = new Tempo(baseMs).add({ minutes: 5 });

		using sig = toRelativeSignal(target, {
			locale: 'en-US',
			style: 'long',
			now: () => baseMs + 2,
		});

		expect(sig.get()).toBe('in 4 minutes');
	});

	it('throws TypeError for non-finite bigint targets', () => {
		expect(() => toRelativeSignal(10n ** 400n)).toThrow(TypeError);
	});
});
