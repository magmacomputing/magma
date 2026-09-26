import type { Tempo } from '@magmacomputing/tempo';
import { isString } from '@magmacomputing/tempo/library';
import { getCalendarHolidays, normalizeCountryCode } from './registry.js';
import type { HolidayItem, HolidayOptions, WorkingHoursOptions } from './types.js';

function extractRegionFromLocale(locale?: string): string | undefined {
	if (!isString(locale) || !locale) return undefined;
	try {
		const loc = new Intl.Locale(locale);
		if (loc.region) return loc.region;
	} catch {
		// ignore
	}
	if (locale.includes('-')) {
		const parts = locale.split('-');
		for (let i = 1; i < parts.length; i++) {
			const part = parts[i]!;
			if (part.length === 2 && /^[a-zA-Z]{2}$/.test(part))
				return part.toUpperCase();
		}
	}
	return undefined;
}

/**
 * Resolves effective holiday options using Tempo instance metadata when fields are omitted.
 * Fallback Cascade:
 * 1. options.country (explicit override)
 * 2. tempo.geo.country (geographic location)
 * 3. tempo.intl.region (internationalization settings)
 * 4. tempo.locale region (e.g. 'en-AU' -> 'AU')
 * 5. Default fallback to 'US'
 *
 * @param tempo - Target Tempo instance
 * @param options - Explicit options overrides
 * @returns Fully resolved HolidayOptions
 */
export function resolveHolidayOptions(tempo?: Tempo, options: HolidayOptions = {}): HolidayOptions {
	const localeRegion = tempo && isString(tempo.locale) ? extractRegionFromLocale(tempo.locale) : undefined;

	const resolvedCountry = options.country
		?? tempo?.geo?.country
		?? (tempo as any)?.intl?.region
		?? localeRegion
		?? 'US';

	const resolvedRegion = options.region
		?? (tempo?.geo as any)?.region
		?? (tempo?.geo as any)?.state;

	return {
		country: normalizeCountryCode(resolvedCountry),
		region: resolvedRegion ? String(resolvedRegion).toUpperCase().replace(/^[A-Z]{2}-/, '') : undefined,
		customHolidays: options.customHolidays,
		includeObserved: options.includeObserved ?? true,
	};
}

/** Formats a Tempo instance into an ISO date string (YYYY-MM-DD). */
export function toIsoDate(tempo: Tempo): string {
	const mm = String(tempo.mm).padStart(2, '0');
	const dd = String(tempo.dd).padStart(2, '0');
	return `${tempo.yy}-${mm}-${dd}`;
}

/**
 * Retrieves the holiday items matching the given date.
 *
 * @param tempo - The Tempo instance to evaluate
 * @param options - Configuration options
 * @returns Array of matching holiday items, or empty array if none
 */
export function getMatchingHolidays(tempo: Tempo, options?: HolidayOptions): HolidayItem[] {
	const opts = resolveHolidayOptions(tempo, options);
	const iso = toIsoDate(tempo);
	const yearHolidays = getCalendarHolidays(tempo.yy, opts);
	return yearHolidays.filter(h => h.date === iso);
}

/**
 * Determines whether a Tempo instance falls on a recognized public holiday.
 *
 * @param tempo - The Tempo instance to evaluate
 * @param options - Configuration options
 * @returns True if the date is a public holiday
 */
export function isPublicHoliday(tempo: Tempo, options?: HolidayOptions): boolean {
	return getMatchingHolidays(tempo, options).length > 0;
}

/**
 * Returns the name of the public holiday for the given date, or null if not a holiday.
 *
 * @param tempo - The Tempo instance to evaluate
 * @param options - Configuration options
 * @returns Holiday name string or null
 */
export function getHolidayName(tempo: Tempo, options?: HolidayOptions): string | null {
	const matches = getMatchingHolidays(tempo, options);
	if (matches.length === 0) return null;
	return matches[0]!.name;
}

/**
 * Determines whether a Tempo instance is a standard working business day (Mon-Fri and not a holiday).
 * Respects cultural weekend definitions from `tempo.intl.weekend` (e.g. [5, 6] in Middle Eastern locales).
 *
 * @param tempo - The Tempo instance to evaluate
 * @param options - Configuration options
 * @returns True if the date is a business day
 */
export function isBusinessDay(tempo: Tempo, options?: HolidayOptions): boolean {
	const dow = tempo.toDateTime().dayOfWeek;
	const weekendDays: readonly number[] = (tempo as any).intl?.weekend ?? [6, 7];
	if (weekendDays.includes(dow)) return false;
	return !isPublicHoliday(tempo, options);
}

/**
 * Retrieves all public holidays occurring in a calendar year for a country.
 *
 * @param year - 4-digit calendar year
 * @param options - Configuration options
 * @returns Array of HolidayItem objects
 */
export function getYearHolidays(year: number, options: HolidayOptions = {}): HolidayItem[] {
	return getCalendarHolidays(year, options);
}

/**
 * Returns the next valid business day, advancing past weekends and holidays.
 *
 * @param tempo - Starting Tempo instance
 * @param options - Configuration options
 * @returns A new Tempo instance on the next business day
 */
export function nextBusinessDay(tempo: Tempo, options?: HolidayOptions): Tempo {
	let current = tempo.add({ days: 1 });
	while (!isBusinessDay(current, options)) {
		current = current.add({ days: 1 });
	}
	return current;
}

/**
 * Returns the previous valid business day, stepping backward past weekends and holidays.
 *
 * @param tempo - Starting Tempo instance
 * @param options - Configuration options
 * @returns A new Tempo instance on the previous business day
 */
export function prevBusinessDay(tempo: Tempo, options?: HolidayOptions): Tempo {
	let current = tempo.subtract({ days: 1 });
	while (!isBusinessDay(current, options)) {
		current = current.subtract({ days: 1 });
	}
	return current;
}

/**
 * Adds or subtracts N business days from a Tempo instance, skipping weekends and public holidays.
 *
 * @param tempo - Starting Tempo instance
 * @param amount - Number of business days to add (positive) or subtract (negative)
 * @param options - Configuration options
 * @returns A new Tempo instance advanced or rewound by N business days
 */
export function addBusinessDays(tempo: Tempo, amount: number, options?: HolidayOptions): Tempo {
	if (amount === 0) return tempo;

	const step = amount > 0 ? 1 : -1;
	let remaining = Math.abs(amount);
	let current = tempo;

	while (remaining > 0) {
		current = current.add({ days: step });
		if (isBusinessDay(current, options)) {
			remaining--;
		}
	}

	return current;
}

/**
 * Calculates the exact number of full business days between two Tempo instances.
 *
 * @param start - Starting date
 * @param end - Ending date
 * @param options - Configuration options
 * @returns Integer count of business days (positive if start < end, negative if start > end)
 */
export function businessDaysBetween(start: Tempo, end: Tempo, options?: HolidayOptions): number {
	const startIso = toIsoDate(start);
	const endIso = toIsoDate(end);

	if (startIso === endIso) return 0;

	let current = start;
	let count = 0;

	if (start.epoch.ms < end.epoch.ms) {
		current = current.add({ days: 1 });
		while (toIsoDate(current) <= endIso) {
			if (isBusinessDay(current, options))
				count++;
			current = current.add({ days: 1 });
		}
		return count;
	} else {
		current = current.subtract({ days: 1 });
		while (toIsoDate(current) >= endIso) {
			if (isBusinessDay(current, options))
				count--;
			current = current.subtract({ days: 1 });
		}
		return count;
	}
}

/**
 * Calculates the exact number of SLA-eligible working hours between two Tempo instances.
 * Automatically excludes weekends and public holidays according to the instance/options locale and country.
 *
 * @param start - Starting date/time
 * @param end - Ending date/time (deadline)
 * @param options - Working hours boundaries and holiday configuration
 * @returns Total business working hours (negative if start is after end)
 */
export function workingHoursBetween(
	start: Tempo,
	end: Tempo,
	options?: WorkingHoursOptions
): number {
	const startWorkHour = options?.startHour ?? 9;
	const endWorkHour = options?.endHour ?? 17;

	if (startWorkHour >= endWorkHour) {
		throw new Error('[holidays] startHour must be strictly less than endHour');
	}

	const startMs = start.epoch.ms;
	const endMs = end.epoch.ms;

	if (startMs === endMs) return 0;

	const isForward = startMs < endMs;
	const currentStart = isForward ? start : end;
	const currentEnd = isForward ? end : start;

	let totalMs = 0;
	let iter = currentStart.set({ hour: 0, minute: 0, second: 0, millisecond: 0 });
	const endIso = toIsoDate(currentEnd);

	while (toIsoDate(iter) <= endIso) {
		if (isBusinessDay(iter, options)) {
			// Workday window for this day: startWorkHour:00 to endWorkHour:00
			const dayWorkStart = iter.set({ hour: startWorkHour, minute: 0, second: 0, millisecond: 0 });
			const dayWorkEnd = iter.set({ hour: endWorkHour, minute: 0, second: 0, millisecond: 0 });

			const windowStartMs = Math.max(currentStart.epoch.ms, dayWorkStart.epoch.ms);
			const windowEndMs = Math.min(currentEnd.epoch.ms, dayWorkEnd.epoch.ms);

			if (windowStartMs < windowEndMs) {
				totalMs += (windowEndMs - windowStartMs);
			}
		}
		iter = iter.add({ days: 1 });
	}

	const hours = totalMs / (1000 * 60 * 60);
	return isForward ? hours : -hours;
}
