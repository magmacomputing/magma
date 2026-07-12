import type { Tempo } from '@magmacomputing/tempo/core';
import { getPublicHolidays } from '../calendar/getPublicHolidays.js';
import { getLocale } from '../support/intl.js';

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
 * Calculates the exact number of SLA-eligible working hours from this date until the deadline.
 */
export const workingHoursUntil = function (this: Tempo, deadline: Tempo.DateTime, options?: SLAOptions): number {
	const startZdt = this.toDateTime();

	// If it has .toDateTime(), it's already a Tempo instance. Otherwise, let Tempo parse the string/Temporal object.
	const endTempo = typeof (deadline as any).toDateTime === 'function'
		? (deadline as Tempo)
		: this.set(deadline as any);
	const endZdt = endTempo.toDateTime();

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
		throw new Error('[Tempo-Fns] startHour must be strictly less than endHour');

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

	while (Temporal.PlainDate.compare(iterDate, targetDate) <= 0) {
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

/** Preloads and caches holiday data for a region and year. */
export const preloadHolidays = async (region?: string, year: number = Temporal.Now.plainDateISO().year): Promise<void> => {
	const resolvedRegion = region || getLocale().region || 'US';
	const cacheKey = `${resolvedRegion}-${year}`;

	if (remoteHolidaysCache.has(cacheKey)) return;

	try {
		const data = await getPublicHolidays(year, resolvedRegion);
		const holidays = data.map(h => h.date);

		remoteHolidaysCache.set(cacheKey, holidays);
	} catch (error) {
		console.warn(`[tempo-fns] Failed to fetch holidays for ${cacheKey}, falling back to none:`, error);
		remoteHolidaysCache.set(cacheKey, []);
	}
}

declare module '@magmacomputing/tempo/core' {
	interface Tempo {
		/** 
		 * Calculates the exact number of SLA-eligible working hours from this date until the deadline. 
		 */
		workingHoursUntil(deadline: Tempo.DateTime, options?: SLAOptions): number;
	}
}
