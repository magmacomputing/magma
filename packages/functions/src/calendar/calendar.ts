import { extractDateParts, isNumber, getLocale, type TemporalLikeDate, type DateInput } from '../support/index.js';

export type { TemporalLikeDate, DateInput };

export interface WeekendOptions {
	/** Cultural locale (e.g. 'en-US', 'ar-SA') to resolve regional weekend boundaries */
	locale?: string | undefined;
	/** Explicit array of 1-based ISO day-of-week numbers considered weekend (e.g. [5, 6] for Fri-Sat) */
	weekendDays?: readonly number[] | undefined;
}

const DAYS_PER_MONTH: readonly number[] = Object.freeze([0, 31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]);
const DEFAULT_WEEKEND: readonly number[] = Object.freeze([6, 7]);
const FRI_SAT_WEEKEND_REGIONS = new Set([
	'AE', 'AF', 'BH', 'DZ', 'EG', 'IL', 'IQ', 'JO', 'KW', 'LY', 'OM', 'QA', 'SA', 'SD', 'SY', 'YE'
]);

/**
 * Internal resolver for weekend days based on cultural locale rules.
 */
function resolveWeekendDays(localeStr?: string): readonly number[] {
	if (!localeStr) return DEFAULT_WEEKEND;
	try {
		const loc = getLocale(localeStr);
		const rawWeek = (loc as any).getWeekInfo?.() ?? (loc as any).weekInfo;
		if (Array.isArray(rawWeek?.weekend) && rawWeek.weekend.length > 0)
			return rawWeek.weekend;

		const region = loc.region ?? localeStr.split('-')[1]?.toUpperCase();
		if (region === 'IR') return [5]; // Friday only
		if (region === 'AF') return [4, 5]; // Thursday, Friday
		if (region && FRI_SAT_WEEKEND_REGIONS.has(region)) return [5, 6]; // Friday, Saturday
	} catch {
		// Fallback to ISO Saturday & Sunday
	}
	return DEFAULT_WEEKEND;
}

/**
 * Internal helper to safely extract 1-based ISO day-of-week (1 = Monday ... 7 = Sunday).
 */
function extractDayOfWeek(input: any): number {
	const parts = extractDateParts(input);
	if (isNumber(parts.dayOfWeek))
		return parts.dayOfWeek;

	throw new TypeError('[functions] isWeekend / isWeekday requires a valid date object, string, or timestamp.');
}

/**
 * Determines whether a given year or date falls in a Gregorian leap year.
 *
 * @param yearOrDate - 4-digit calendar year number, Date, ISO date string, or Tempo/Temporal instance
 * @returns `true` if the year is a leap year, `false` otherwise
 * @example
 * ```ts
 * isLeapYear(2024); // true
 * isLeapYear(2023); // false
 * isLeapYear(2000); // true
 * isLeapYear(1900); // false
 * ```
 */
export function isLeapYear(yearOrDate: DateInput): boolean {
	const parts = extractDateParts(yearOrDate);
	const year = parts.year;

	if (!isNumber(year) || isNaN(year))
		throw new TypeError('[functions] isLeapYear requires a year number, date string, or date object.');

	return (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
}

/**
 * Returns the exact number of days (28, 29, 30, or 31) for a specified calendar year and month.
 *
 * @param yearOrDate - Calendar year number, Date, ISO date string, or Tempo/Temporal instance
 * @param month - Month number (1..12), required when yearOrDate is a year number
 * @returns Number of days in the month
 * @example
 * ```ts
 * daysInMonth(2024, 2); // 29 (leap year)
 * daysInMonth(2023, 2); // 28
 * daysInMonth('2024-04-15'); // 30
 * ```
 */
export function daysInMonth(
	yearOrDate: DateInput,
	month?: number,
): number {
	const parts = extractDateParts(yearOrDate);
	let year = parts.year;
	let m = isNumber(month) ? month : parts.month;

	if (parts.type === 'number') {
		if (!isNumber(month))
			throw new TypeError('[functions] daysInMonth requires a month argument (1-12) when the first argument is a year number.');
		year = yearOrDate as number;
		m = month;
	} else if (parts.type === 'object' || parts.type === 'Temporal' || parts.type === 'Tempo') {
		if (isNumber(parts.daysInMonth) && (!isNumber(month) || parts.month === month))
			return parts.daysInMonth;
	}

	if (!isNumber(year) || !isNumber(m) || isNaN(year) || isNaN(m))
		throw new TypeError('[functions] daysInMonth requires valid year and month inputs.');

	if (m < 1 || m > 12)
		throw new RangeError(`[functions] daysInMonth month must be between 1 and 12, received ${m}`);

	if (m === 2)
		return isLeapYear(year) ? 29 : 28;

	return DAYS_PER_MONTH[m]!;
}

/**
 * Determines if the given date falls on the first day of its calendar month.
 *
 * @param input - The date object or string to check
 * @returns `true` if the date is the first day of the month, `false` otherwise
 * @example
 * ```ts
 * isFirstDayOfMonth(new Tempo('2026-07-01')); // true
 * isFirstDayOfMonth('2026-07-15'); // false
 * ```
 */
export function isFirstDayOfMonth(input: DateInput): boolean {
	const parts = extractDateParts(input);
	if (isNumber(parts.day))
		return parts.day === 1;

	throw new TypeError('[functions] isFirstDayOfMonth requires a valid date object, string, or timestamp.');
}

/**
 * Determines if the given date falls on the last day of its calendar month.
 *
 * @param input - The date object or string to check
 * @returns `true` if the date is the last day of the month, `false` otherwise
 * @example
 * ```ts
 * isLastDayOfMonth('2024-02-29'); // true (leap year)
 * isLastDayOfMonth('2024-02-28'); // false
 * isLastDayOfMonth('2023-02-28'); // true (non-leap year)
 * isLastDayOfMonth(new Tempo('2026-07-31')); // true
 * ```
 */
export function isLastDayOfMonth(input: DateInput): boolean {
	const parts = extractDateParts(input);
	if (isNumber(parts.day)) {
		if (isNumber(parts.daysInMonth))
			return parts.day === parts.daysInMonth;

		if (isNumber(parts.year) && isNumber(parts.month))
			return parts.day === daysInMonth(parts.year, parts.month);

		return parts.day === (parts.daysInMonth ?? 31);
	}

	throw new TypeError('[functions] isLastDayOfMonth requires a valid date object, string, or timestamp.');
}

/**
 * Determines whether a given date falls on a weekend.
 * Defaults to standard ISO 8601 Saturday & Sunday (`[6, 7]`), with optional cultural adaptation via `options.locale` or explicit `options.weekendDays`.
 *
 * @param date - Date object, Tempo instance, native Temporal date, ISO string, or timestamp
 * @param options - Configuration for cultural locale or explicit weekend days
 * @returns `true` if the date falls on a weekend, `false` otherwise
 * @example
 * ```ts
 * isWeekend('2026-10-03'); // true (Saturday)
 * isWeekend('2026-10-05'); // false (Monday)
 * isWeekend('2026-10-02', { locale: 'ar-SA' }); // true (Friday in Saudi Arabia)
 * ```
 */
export function isWeekend(
	date: DateInput,
	options?: WeekendOptions,
): boolean {
	const dow = extractDayOfWeek(date);
	const weekendDays = options?.weekendDays ?? resolveWeekendDays(options?.locale);
	return weekendDays.includes(dow);
}

/**
 * Determines whether a given date falls on a weekday (non-weekend).
 *
 * @param date - Date object, Tempo instance, native Temporal date, ISO string, or timestamp
 * @param options - Configuration for cultural locale or explicit weekend days
 * @returns `true` if the date falls on a weekday, `false` otherwise
 * @example
 * ```ts
 * isWeekday('2026-10-05'); // true (Monday)
 * isWeekday('2026-10-03'); // false (Saturday)
 * ```
 */
export function isWeekday(
	date: DateInput,
	options?: WeekendOptions,
): boolean {
	return !isWeekend(date, options);
}
