import { getTemporal } from '../support/index.js';

/**
 * Returns the January and July UTC offsets (in nanoseconds) for a given timezone and year.
 * Uses a fixed reference year for stability in DST calculations.
 *
 * @param timeZone - The IANA timezone identifier
 * @param year - The reference year for offset calculation (default: 2024)
 * @returns An object containing `jan` and `jul` offset values in nanoseconds
 * @example
 * ```ts
 * const offsets = getOffsets('America/New_York', 2024);
 * ```
 */
export function getOffsets(timeZone: string, year = 2024) {
	const Temporal = getTemporal();
	const jan = Temporal.PlainDate.from({ year, month: 1, day: 1 }).toZonedDateTime(timeZone).offsetNanoseconds;
	const jul = Temporal.PlainDate.from({ year, month: 7, day: 1 }).toZonedDateTime(timeZone).offsetNanoseconds;

	return { jan, jul };
}
