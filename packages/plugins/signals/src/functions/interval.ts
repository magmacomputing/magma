import {
	Finalizer,
	Interval,
	Signify,
	isBigInt,
	isFunction,
	isNumber,
} from '@magmacomputing/tempo/plugin/sdk';
import type { IntervalSignalOptions, IntervalSignalState } from '../types/index.js';

const DEFAULT_PROGRESS_INTERVAL_MS = 1_000;
const MAX_TIMEOUT_MS = 2_147_483_647;

/** Converts an `Interval` nanosecond boundary (`bigint | number`) to milliseconds. */
function nsToMs(ns: bigint | number): number {
	if (ns === -Infinity || ns === Infinity)
		return ns;
	return isBigInt(ns)
		? Number(ns / 1_000_000n) + Number(ns % 1_000_000n) / 1_000_000
		: Number(ns);
}

/** Computes normalized `[0, 1]` progress for an interval at `nowMs`. */
function computeProgress(nowMs: number, startMs: number, endMs: number): number {
	if (nowMs < startMs)
		return 0;
	if (nowMs >= endMs)
		return 1;
	if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs <= startMs)
		return 0;
	return Math.min(1, Math.max(0, (nowMs - startMs) / (endMs - startMs)));
}

interface IntervalTimers {
	boundaryTimer: ReturnType<typeof setTimeout> | null;
	progressTimer: ReturnType<typeof setInterval> | null;
	isDisposed: boolean;
}

function stopProgressTicker(timers: IntervalTimers): void {
	if (timers.progressTimer !== null) {
		clearInterval(timers.progressTimer);
		timers.progressTimer = null;
	}
}

function stopBoundaryTimer(timers: IntervalTimers): void {
	if (timers.boundaryTimer !== null) {
		clearTimeout(timers.boundaryTimer);
		timers.boundaryTimer = null;
	}
}

function createIntervalCleanup(timers: IntervalTimers): () => void {
	return () => {
		timers.isDisposed = true;
		stopBoundaryTimer(timers);
		stopProgressTicker(timers);
	};
}

/**
 * Creates a reactive `IntervalSignalState` (`isCurrent`, `isPast`, `isFuture`, `progress`)
 * for a temporal `Interval`.
 *
 * Uses exact one-shot boundary timeouts for `start` and `end` transitions (zero polling
 * while future or past), and optionally updates `progress` on `progressInterval` only
 * while `isCurrent` is `true`.
 */
export function intervalSignal(
	interval: Interval<any>,
	options: IntervalSignalOptions = {},
): IntervalSignalState {
	if (!Interval.isInterval(interval))
		throw new TypeError('intervalSignal requires an Interval instance');

	const startMs = nsToMs(interval.startNs);
	const endMs = nsToMs(interval.endNs);
	const nowFn = isFunction(options.now) ? options.now : Date.now;
	const progressInterval = options.progressInterval === false
		? 0
		: (isNumber(options.progressInterval) ? Math.max(0, options.progressInterval) : DEFAULT_PROGRESS_INTERVAL_MS);

	const initialNow = nowFn();
	const initialFuture = initialNow < startMs;
	const initialPast = initialNow >= endMs;
	const initialCurrent = !initialFuture && !initialPast;

	const isCurrentState = new Signify.State<boolean>(initialCurrent);
	const isPastState = new Signify.State<boolean>(initialPast);
	const isFutureState = new Signify.State<boolean>(initialFuture);
	const progressState = new Signify.State<number>(computeProgress(initialNow, startMs, endMs));

	const timers: IntervalTimers = {
		boundaryTimer: null,
		progressTimer: null,
		isDisposed: false,
	};

	const syncState = (): void => {
		if (timers.isDisposed)
			return;

		const nowMs = nowFn();
		const isFuture = nowMs < startMs;
		const isPast = nowMs >= endMs;
		const isCurrent = !isFuture && !isPast;

		isFutureState.set(isFuture);
		isCurrentState.set(isCurrent);
		isPastState.set(isPast);
		progressState.set(computeProgress(nowMs, startMs, endMs));

		if (isCurrent && progressInterval > 0 && Number.isFinite(startMs) && Number.isFinite(endMs)) {
			if (timers.progressTimer === null) {
				timers.progressTimer = setInterval(() => {
					if (timers.isDisposed)
						return;
					const tickNow = nowFn();
					if (tickNow >= endMs) {
						syncState();
						return;
					}
					progressState.set(computeProgress(tickNow, startMs, endMs));
				}, progressInterval);
			}
		} else {
			stopProgressTicker(timers);
		}

		stopBoundaryTimer(timers);
		const nextBoundary = isFuture
			? startMs
			: (isCurrent ? endMs : Infinity);

		if (Number.isFinite(nextBoundary)) {
			const delay = Math.min(Math.max(nextBoundary - nowMs, 1), MAX_TIMEOUT_MS);
			timers.boundaryTimer = setTimeout(() => {
				timers.boundaryTimer = null;
				syncState();
			}, delay);
		}
	};

	syncState();

	const teardown = createIntervalCleanup(timers);

	let unregisterFinalizer: (() => boolean) | null = null;
	let stateHandle: IntervalSignalState;

	// Retain stateHandle from each projected signal so destructuring a single signal
	// (e.g. `const { progress } = intervalSignal(...)`) does not trigger premature finalization.
	const isCurrent = Signify.computed(() => {
		void stateHandle;
		return isCurrentState.get();
	});
	const isPast = Signify.computed(() => {
		void stateHandle;
		return isPastState.get();
	});
	const isFuture = Signify.computed(() => {
		void stateHandle;
		return isFutureState.get();
	});
	const progress = Signify.computed(() => {
		void stateHandle;
		return progressState.get();
	});

	stateHandle = {
		isCurrent,
		isPast,
		isFuture,
		progress,
		get disposed(): boolean {
			return timers.isDisposed;
		},
		dispose(): void {
			if (timers.isDisposed)
				return;
			unregisterFinalizer?.();
			teardown();
		},
		[Symbol.dispose](): void {
			this.dispose();
		},
	};

	unregisterFinalizer = Finalizer.register(stateHandle, teardown);

	return Object.freeze(stateHandle);
}
