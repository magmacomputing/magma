import { isWeekend, type WeekendOptions } from '../calendar/calendar.js';
import {
	extractDateParts,
	coerceZonedDateTime,
	getTemporal,
	isDefined,
	isNumber,
	isUndefined,
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
		const parts = extractDateParts(h);
		if (isDefined(parts.year) && isDefined(parts.month) && isDefined(parts.day))
			set.add(toDateKey(parts.year, parts.month, parts.day));
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
	let iterations = 0;
	const maxIterations = 100_000;
	while (!isBusinessDay(current, options)) {
		if (++iterations > maxIterations)
			throw new RangeError('Search limit exceeded while searching for next business day');
		current = current.add({ days: 1 });
	}

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
	let iterations = 0;
	const maxIterations = 100_000;
	while (!isBusinessDay(current, options)) {
		if (++iterations > maxIterations)
			throw new RangeError('Search limit exceeded while searching for previous business day');
		current = current.subtract({ days: 1 });
	}

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
	if (!isNumber(amount) || !Number.isInteger(amount))
		throw new RangeError('Amount must be a finite integer');

	let current = coerceZonedDateTime(date);
	if (amount === 0) return current;

	const step = amount > 0 ? 1 : -1;
	let remaining = Math.abs(amount);
	let iterations = 0;
	const maxIterations = 100_000;

	while (remaining > 0) {
		if (++iterations > maxIterations)
			throw new RangeError('Search limit exceeded while computing business days');
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

	if (startZdt.epochNanoseconds > endZdt.epochNanoseconds)
		return -businessDaysBetween(end, start, options);

	let current = startZdt.add({ days: 1 });
	let count = 0;
	let iterations = 0;
	const maxIterations = 100_000;

	while (true) {
		if (++iterations > maxIterations)
			throw new RangeError('Search limit exceeded while computing business days between dates');
		const currIso = toDateKey(current.year, current.month, current.day);
		if (currIso > endIso) break;
		if (isBusinessDay(current, options)) count++;
		current = current.add({ days: 1 });
	}

	return count;
}
