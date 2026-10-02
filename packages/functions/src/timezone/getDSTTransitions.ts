import { getTemporal, isNumber, isString, isDefined } from '../support/index.js';
import { isValidTimeZone } from './isValidTimeZone.js';

/**
 * Result structure returned by getDSTTransitions.
 */
export interface DSTTransitionsResult {
	/** Whether this timezone observes Daylight Saving Time in the given year */
	hasDST: boolean;
	/** Epoch millisecond timestamp of the Spring Forward transition (Standard -> DST), if applicable */
	springForwardMs?: number | undefined;
	/** Epoch millisecond timestamp of the Fall Back transition (DST -> Standard), if applicable */
	fallBackMs?: number | undefined;
	/** Difference in offset minutes between standard time and DST (typically 60) */
	dstShiftMinutes?: number | undefined;
}

/**
 * Resolves exact timestamps of Daylight Saving Time (DST) transitions for a given timezone and calendar year.
 * Returns spring forward and fall back epoch millisecond timestamps, or indicates when DST is not observed.
 *
 * @param timeZone - The IANA timezone identifier (e.g. 'America/New_York', 'Europe/London')
 * @param year - The calendar year to evaluate (e.g. 2026)
 * @returns DSTTransitionsResult with transition timestamps and shift magnitude
 *
 * @example
 * ```ts
 * const dst = getDSTTransitions('America/New_York', 2026);
 * // { hasDST: true, springForwardMs: 1772953200000, fallBackMs: 1793512800000, dstShiftMinutes: 60 }
 * ```
 */
export function getDSTTransitions(timeZone: string, year: number): DSTTransitionsResult {
	if (!isValidTimeZone(timeZone) || !isNumber(year))
		return { hasDST: false };

	const Temporal = getTemporal();
	const normalizedTz = timeZone.trim();

	const startOfYearMs = Date.UTC(year, 0, 1, 0, 0, 0, 0);
	const endOfYearMs = Date.UTC(year + 1, 0, 1, 0, 0, 0, 0);

	const getOffset = (ms: number): number =>
		Temporal.Instant.fromEpochMilliseconds(ms).toZonedDateTimeISO(normalizedTz).offsetNanoseconds;

	const stepMs = 7 * 86_400_000; // 7-day coarse search interval
	const transitions: Array<{ timestampMs: number; fromOffset: number; toOffset: number }> = [];

	let prevMs = startOfYearMs;
	let prevOffset = getOffset(prevMs);

	const searchWindow = (loMs: number, hiMs: number, initialOffset: number) => {
		let lo = loMs;
		let hi = hiMs;
		while (hi - lo > 1) {
			const mid = Math.floor((lo + hi) / 2);
			if (getOffset(mid) === initialOffset)
				lo = mid;
			else
				hi = mid;
		}
		const toOffset = getOffset(hi);
		transitions.push({ timestampMs: hi, fromOffset: initialOffset, toOffset });
		prevOffset = toOffset;
		prevMs = hi;
	};

	for (let t = startOfYearMs + stepMs; t <= endOfYearMs; t += stepMs) {
		const curOffset = getOffset(t);
		if (curOffset !== prevOffset)
			searchWindow(prevMs, t, prevOffset);
		else
			prevMs = t;
	}

	if (prevMs < endOfYearMs) {
		const curOffset = getOffset(endOfYearMs);
		if (curOffset !== prevOffset)
			searchWindow(prevMs, endOfYearMs, prevOffset);
	}

	if (transitions.length === 0)
		return { hasDST: false };

	let springForwardMs: number | undefined;
	let fallBackMs: number | undefined;
	let maxShiftNs = 0;

	for (const tr of transitions) {
		const shift = Math.abs(tr.toOffset - tr.fromOffset);
		if (shift > maxShiftNs)
			maxShiftNs = shift;
		if (tr.toOffset > tr.fromOffset)
			springForwardMs = tr.timestampMs;
		else
			fallBackMs = tr.timestampMs;
	}

	return {
		hasDST: true,
		...(isDefined(springForwardMs) ? { springForwardMs } : {}),
		...(isDefined(fallBackMs) ? { fallBackMs } : {}),
		dstShiftMinutes: Math.round(maxShiftNs / 60_000_000_000),
	};
}
