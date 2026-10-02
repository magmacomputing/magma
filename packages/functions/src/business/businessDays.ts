import { isWeekend, type WeekendOptions } from '../calendar/calendar.js';
import {
	extractDateParts,
	coerceZonedDateTime,
	getTemporal,
	isNumber,
	isString,
	isObject,
	isDate,
	isUndefined,
	ISO_CALENDAR_DATE_REGEX,
	type DateInput,
	type Temporal,
} from '../support/index.js';

export type { DateInput, WeekendOptions };

/**
 * Configuration options for business day calculations.
 */
export interface BusinessDayOptions extends WeekendOptions {
	/**
	 * Explicit list of holiday dates to skip.
	 * Accepts ISO date strings ('YYYY-MM-DD'), Date objects, timestamps, or Temporal objects.
	 */
	holidays?: readonly (string | number | Date | Temporal.PlainDate)[];

	/**
	 * Dynamic predicate for custom holiday evaluation.
	 * @param date - The native Temporal.PlainDate being evaluated
	 * @returns `true` if the date is a holiday (non-working day), `false` otherwise
	 */
	isHoliday?: (date: Temporal.PlainDate) => boolean;
}

/**
 * Builds a normalized set of 'YYYY-MM-DD' holiday date strings for $O(1)$ fast lookup.
 */
function buildHolidaySet(holidays?: readonly (string | number | Date | Temporal.PlainDate)[]): Set<string> | undefined {
	if (!holidays || holidays.length === 0) return undefined;
	const set = new Set<string>();

	for (const h of holidays) {
		if (isString(h)) {
			const match = h.trim().match(ISO_CALENDAR_DATE_REGEX);
			if (match) {
				const y = (match[1] ?? match[2])!.padStart(4, '0');
				const m = match[3] ? match[3].padStart(2, '0') : '01';
				const d = match[4] ? match[4].padStart(2, '0') : '01';
				set.add(`${y}-${m}-${d}`);
			} else {
				const dt = new Date(h);
				if (isDate(dt)) {
					const y = dt.getFullYear().toString().padStart(4, '0');
					const m = (dt.getMonth() + 1).toString().padStart(2, '0');
					const d = dt.getDate().toString().padStart(2, '0');
					set.add(`${y}-${m}-${d}`);
				}
			}
		} else if (isNumber(h)) {
			const dt = new Date(h);
			if (isDate(dt)) {
				const y = dt.getFullYear().toString().padStart(4, '0');
				const m = (dt.getMonth() + 1).toString().padStart(2, '0');
				const d = dt.getDate().toString().padStart(2, '0');
				set.add(`${y}-${m}-${d}`);
			}
		} else if (isDate(h)) {
			const y = h.getFullYear().toString().padStart(4, '0');
			const m = (h.getMonth() + 1).toString().padStart(2, '0');
			const d = h.getDate().toString().padStart(2, '0');
			set.add(`${y}-${m}-${d}`);
		} else if (isObject(h) && 'year' in h && 'month' in h && 'day' in h) {
			const y = String((h as any).year).padStart(4, '0');
			const m = String((h as any).month).padStart(2, '0');
			const d = String((h as any).day).padStart(2, '0');
			set.add(`${y}-${m}-${d}`);
		}
	}

	return set;
}

/**
 * Formats date components into a canonical 'YYYY-MM-DD' ISO date key.
 */
function toDateKey(year: number, month: number, day: number): string {
	return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/**
 * Determines whether a given date is an active working business day (non-weekend and non-holiday).
 *
 * @param date - Date, Temporal object, Tempo instance, ISO string, or timestamp
 * @param options - Optional configuration for regional weekend rules and public holidays
 * @returns `true` if the date is a business day, `false` otherwise
 * @example
 * ```ts
 * isBusinessDay('2026-10-02'); // true (Friday)
 * isBusinessDay('2026-10-03'); // false (Saturday)
 * isBusinessDay('2026-12-25', { holidays: ['2026-12-25'] }); // false (Christmas Day)
 * ```
 */
export function isBusinessDay(date: DateInput, options?: BusinessDayOptions): boolean {
	if (isWeekend(date, options)) return false;

	const parts = extractDateParts(date);
	if (isUndefined(parts.year) || isUndefined(parts.month) || isUndefined(parts.day))
		return false;

	const isoDate = toDateKey(parts.year, parts.month, parts.day);

	if (options?.holidays && options.holidays.length > 0) {
		const holidaySet = buildHolidaySet(options.holidays);
		if (holidaySet?.has(isoDate)) return false;
	}

	if (options?.isHoliday) {
		const Temporal = getTemporal();
		const pd = Temporal.PlainDate.from({ year: parts.year, month: parts.month, day: parts.day });
		if (options.isHoliday(pd)) return false;
	}

	return true;
}

/**
 * Returns the next business day strictly following the provided date,
 * skipping weekends and recognized public holidays.
 *
 * @param date - Starting date representation
 * @param options - Optional configuration for regional weekends and public holidays
 * @returns A `Temporal.ZonedDateTime` instance representing the next business day
 * @example
 * ```ts
 * nextBusinessDay('2026-10-02'); // 2026-10-05 (Monday following Friday)
 * ```
 */
export function nextBusinessDay(date: DateInput, options?: BusinessDayOptions): Temporal.ZonedDateTime {
	let current = coerceZonedDateTime(date).add({ days: 1 });
	while (!isBusinessDay(current, options))
		current = current.add({ days: 1 });

	return current;
}

/**
 * Returns the previous business day strictly preceding the provided date,
 * stepping backward past weekends and recognized public holidays.
 *
 * @param date - Starting date representation
 * @param options - Optional configuration for regional weekends and public holidays
 * @returns A `Temporal.ZonedDateTime` instance representing the previous business day
 * @example
 * ```ts
 * prevBusinessDay('2026-10-05'); // 2026-10-02 (Friday preceding Monday)
 * ```
 */
export function prevBusinessDay(date: DateInput, options?: BusinessDayOptions): Temporal.ZonedDateTime {
	let current = coerceZonedDateTime(date).subtract({ days: 1 });
	while (!isBusinessDay(current, options))
		current = current.subtract({ days: 1 });

	return current;
}

/**
 * Adds or subtracts a signed number of business days, skipping weekends and recognized public holidays.
 * Ideal for calculating financial settlement periods (e.g. T+2 settlement).
 *
 * @param date - Starting date representation
 * @param amount - Number of business days to add (positive) or subtract (negative)
 * @param options - Optional configuration for regional weekends and public holidays
 * @returns A `Temporal.ZonedDateTime` instance advanced or rewound by the specified business days
 * @example
 * ```ts
 * addBusinessDays('2026-10-01', 2); // 2026-10-05 (Thursday + 2 business days -> Monday)
 * addBusinessDays('2026-10-05', -2); // 2026-10-01 (Monday - 2 business days -> Thursday)
 * ```
 */
export function addBusinessDays(date: DateInput, amount: number, options?: BusinessDayOptions): Temporal.ZonedDateTime {
	let current = coerceZonedDateTime(date);
	if (amount === 0) return current;

	const step = amount > 0 ? 1 : -1;
	let remaining = Math.abs(amount);

	while (remaining > 0) {
		current = current.add({ days: step });
		if (isBusinessDay(current, options))
			remaining--;
	}

	return current;
}

/**
 * Calculates the exact signed integer count of working business days between two dates.
 * Excludes weekends and recognized public holidays.
 *
 * @param start - Starting date
 * @param end - Ending date
 * @param options - Optional configuration for regional weekends and public holidays
 * @returns Integer count of business days (positive if start < end, negative if start > end, 0 if same day)
 * @example
 * ```ts
 * businessDaysBetween('2026-10-02', '2026-10-05'); // 1 (Monday is 1 business day after Friday)
 * businessDaysBetween('2026-10-05', '2026-10-02'); // -1
 * businessDaysBetween('2026-10-02', '2026-10-02'); // 0
 * ```
 */
export function businessDaysBetween(start: DateInput, end: DateInput, options?: BusinessDayOptions): number {
	const startZdt = coerceZonedDateTime(start);
	const endZdt = coerceZonedDateTime(end);

	const startIso = toDateKey(startZdt.year, startZdt.month, startZdt.day);
	const endIso = toDateKey(endZdt.year, endZdt.month, endZdt.day);

	if (startIso === endIso) return 0;

	let current = startZdt;
	let count = 0;

	if (startZdt.epochNanoseconds < endZdt.epochNanoseconds) {
		current = current.add({ days: 1 });
		while (true) {
			const currIso = toDateKey(current.year, current.month, current.day);
			if (currIso > endIso) break;
			if (isBusinessDay(current, options)) count++;
			current = current.add({ days: 1 });
		}
		return count;
	} else {
		current = current.subtract({ days: 1 });
		while (true) {
			const currIso = toDateKey(current.year, current.month, current.day);
			if (currIso < endIso) break;
			if (isBusinessDay(current, options)) count--;
			current = current.subtract({ days: 1 });
		}
		return count;
	}
}
