import type { Tempo } from '@magmacomputing/tempo/core';
import { Temporal } from '@js-temporal/polyfill';

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
export const workingHoursUntil = function (this: Tempo, deadline: Tempo | string, options?: SLAOptions): number {
	const startZdt = this.toDateTime();
	const endZdt = (typeof deadline === 'string' ? this.set(deadline) : deadline).toDateTime();

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
			if (iterDate.equals(current.toPlainDate()) && current.epochNanoseconds > dayWorkStart.epochNanoseconds) {
				actualStart = current;
			}

			let actualEnd = dayWorkEnd;
			if (iterDate.equals(target.toPlainDate()) && target.epochNanoseconds < dayWorkEnd.epochNanoseconds) {
				actualEnd = target;
			}

			if (actualStart.epochNanoseconds < dayWorkStart.epochNanoseconds) actualStart = dayWorkStart;
			if (actualEnd.epochNanoseconds > dayWorkEnd.epochNanoseconds) actualEnd = dayWorkEnd;

			if (actualStart.epochNanoseconds < actualEnd.epochNanoseconds) {
				totalNs += actualEnd.epochNanoseconds - actualStart.epochNanoseconds;
			}
		}

		iterDate = iterDate.add({ days: 1 });
	}

	return (Number(totalNs) / 3.6e12) * multiplier;
}

export const preloadHolidays = async (region: string, year: number): Promise<void> => {
	await new Promise(resolve => setTimeout(resolve, 50));
	const cacheKey = `${region}-${year}`;
	remoteHolidaysCache.set(cacheKey, [`${year}-01-01`, `${year}-12-25`]);
}

declare module '@magmacomputing/tempo/core' {
	interface Tempo {
		/** 
		 * Calculates the exact number of SLA-eligible working hours from this date until the deadline. 
		 */
		workingHoursUntil(deadline: Tempo | string, options?: SLAOptions): number;
	}
}
