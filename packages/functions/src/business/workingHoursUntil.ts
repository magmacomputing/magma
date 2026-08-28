import { getPublicHolidays } from '../calendar/getPublicHolidays.js';
import { getLocale, isTempo, getTemporal } from '../support/index.js';
import type { Temporal } from '../support/index.js';
import type { Tempo } from '@magmacomputing/tempo/core';

/** Configuration options for the workingHoursUntil SLA calculation. */
export type SLAOptions = {
	/** Explicit array of holiday dates to skip (YYYY-MM-DD) */
	holidays?: string[];
	/** Expected region for the loaded remote holidays (e.g. 'AU-NSW') */
	region?: string;
	/** Start hour for the working day (0-23, default: 9) */
	startHour?: number;
	/** End hour for the working day (0-23, default: 17) */
	endHour?: number;
}

// Internal cache for holidays loaded via the async `preloadHolidays` method
const remoteHolidaysCache: Map<string, string[]> = new Map();

/**
 * Calculates the exact number of SLA-eligible working hours from the start date until the deadline.
 * Excludes weekends and holidays, and accounts for working hour boundaries.
 *
 * @param start - The starting date/time
 * @param deadline - The ending date/time
 * @param options - Optional configuration for working hours and holidays
 * @returns The total working hours (negative if start is after deadline)
 * @throws {Error} If startHour is greater than or equal to endHour
 * @example
 * ```ts
 * const hours = workingHoursUntil(startDate, endDate, { startHour: 9, endHour: 17 });
 * ```
 */
export const workingHoursUntil = function (start: Tempo | Temporal.ZonedDateTime, deadline: Tempo | Temporal.ZonedDateTime, options?: SLAOptions): number {
	const startZdt = isTempo(start) ? start.toDateTime() : start;
	const endZdt = isTempo(deadline) ? deadline.toDateTime() : deadline;

	let current = startZdt;
	let target = endZdt;
	let multiplier = 1;

	if (current.epochNanoseconds > target.epochNanoseconds) {
		current = endZdt;
		target = startZdt;
		multiplier = -1;
	}

	const startWorkHour = options?.startHour ?? 9;
	const endWorkHour = options?.endHour ?? 17;

	if (startWorkHour >= endWorkHour)
		throw new Error('[functions] startHour must be strictly less than endHour');

	const holidaysList = [...(options?.holidays ?? [])];
	if (options?.region) {
		const cachedStart = remoteHolidaysCache.get(`${options.region}-${current.year}`);
		if (cachedStart) holidaysList.push(...cachedStart);
		if (current.year !== target.year) {
			const cachedEnd = remoteHolidaysCache.get(`${options.region}-${target.year}`);
			if (cachedEnd) holidaysList.push(...cachedEnd);
		}
	}
	const holidaySet = new Set(holidaysList);

	let iterDate = current.toPlainDate();
	const targetDate = target.toPlainDate();

	let totalNs = 0n;

	const TemporalAPI = getTemporal();

	while (TemporalAPI.PlainDate.compare(iterDate, targetDate) <= 0) {
		const isWeekend = iterDate.dayOfWeek === 6 || iterDate.dayOfWeek === 7;
		const yyyy = iterDate.year.toString().padStart(4, '0');
		const mm = iterDate.month.toString().padStart(2, '0');
		const dd = iterDate.day.toString().padStart(2, '0');
		const isHoliday = holidaySet.has(`${yyyy}-${mm}-${dd}`);

		if (!isWeekend && !isHoliday) {
			const dayWorkStart = iterDate.toZonedDateTime({ plainTime: { hour: startWorkHour }, timeZone: current.timeZoneId });
			const dayWorkEnd = iterDate.toZonedDateTime({ plainTime: { hour: endWorkHour }, timeZone: current.timeZoneId });

			let actualStart = dayWorkStart;
			if (iterDate.equals(current.toPlainDate()) && current.epochNanoseconds > dayWorkStart.epochNanoseconds)
				actualStart = current;

			let actualEnd = dayWorkEnd;
			if (iterDate.equals(target.toPlainDate()) && target.epochNanoseconds < dayWorkEnd.epochNanoseconds)
				actualEnd = target;

			if (actualStart.epochNanoseconds < actualEnd.epochNanoseconds)
				totalNs += actualEnd.epochNanoseconds - actualStart.epochNanoseconds;
		}

		iterDate = iterDate.add({ days: 1 });
	}

	return (Number(totalNs) / 3.6e12) * multiplier;
}

/**
 * Preloads and caches holiday data for a region and year.
 * Should be called before `workingHoursUntil` to ensure holidays are available synchronously.
 *
 * @param region - The ISO 3166-1 alpha-2 country code (defaults to system locale region or 'US')
 * @param year - The year to fetch holidays for (defaults to current year)
 * @returns A promise that resolves when holidays are cached
 * @example
 * ```ts
 * await preloadHolidays('AU-NSW', 2024);
 * ```
 */
export const preloadHolidays = async (region?: string, year: number = getTemporal().Now.plainDateISO().year): Promise<void> => {
	const resolvedRegion = region || getLocale().region || 'US';
	const cacheKey = `${resolvedRegion}-${year}`;

	if (remoteHolidaysCache.has(cacheKey)) return;

	try {
		const data = await getPublicHolidays(year, resolvedRegion);
		const holidays = data.map(h => h.date);

		remoteHolidaysCache.set(cacheKey, holidays);
	} catch (error) {
		console.warn(`[functions] Failed to fetch holidays for ${cacheKey}, falling back to none:`, error);
		remoteHolidaysCache.set(cacheKey, []);
	}
}
