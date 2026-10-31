import { isNumber, isDate } from '#library/assertion.library.js';

/**
 * Number of days in a standard week.
 */
export const DAYS_IN_WEEK = 7;

/**
 * Mapping of 2-letter and 3-letter ISO day abbreviations to 1-indexed weekday numbers (1..7, Monday=1, Sunday=7).
 */
export const DAY_MAP = Object.freeze({
	MO: 1, TU: 2, WE: 3, TH: 4, FR: 5, SA: 6, SU: 7,
	MON: 1, TUE: 2, WED: 3, THU: 4, FRI: 5, SAT: 6, SUN: 7,
} as const);

/** Type representing the DAY_MAP mapping structure. */
export type DayMap = typeof DAY_MAP;

/** Union type of all valid 2-letter and 3-letter day abbreviation keys ('MO' | 'TU' | ... | 'SUN'). */
export type DayKey = keyof DayMap;

/** Union type of all valid ISO weekday numeric values (1..7). */
export type DayValue = DayMap[DayKey];

/**
 * Mapping of 3-letter month abbreviations (JAN..DEC) to 1-indexed month numbers (1..12).
 */
export const MONTH_MAP = Object.freeze({
	JAN: 1, FEB: 2, MAR: 3, APR: 4, MAY: 5, JUN: 6,
	JUL: 7, AUG: 8, SEP: 9, OCT: 10, NOV: 11, DEC: 12,
} as const);

/** Type representing the MONTH_MAP mapping structure. */
export type MonthMap = typeof MONTH_MAP;

/** Union type of all valid 3-letter month abbreviation keys ('JAN' | 'FEB' | ... | 'DEC'). */
export type MonthKey = keyof MonthMap;

/** Union type of all valid 1-indexed month numeric values (1..12). */
export type MonthValue = MonthMap[MonthKey];

/**
 * Mapping of 1-indexed ISO weekday numbers (1..7, Monday=1, Sunday=7) to full English weekday names.
 */
export const ISO_WEEKDAY_NAMES = Object.freeze({
	1: 'Monday',
	2: 'Tuesday',
	3: 'Wednesday',
	4: 'Thursday',
	5: 'Friday',
	6: 'Saturday',
	7: 'Sunday',
} as const);

/** Type representing the ISO_WEEKDAY_NAMES mapping structure. */
export type IsoWeekdayNames = typeof ISO_WEEKDAY_NAMES;

/** Union type of all valid ISO weekday numbers (1 | 2 | 3 | 4 | 5 | 6 | 7). */
export type IsoWeekdayNumber = keyof IsoWeekdayNames;

/** Union type of all full English weekday names ('Monday' | 'Tuesday' | ... | 'Sunday'). */
export type IsoWeekdayName = IsoWeekdayNames[IsoWeekdayNumber];

/**
 * Structured UTC calendar and clock components.
 */
export interface UtcParts {
	year: number;
	month: number;				// 1-indexed (1..12)
	day: number;					// 1-indexed (1..31)
	weekday: number;			// 1-indexed ISO weekday (1..7, Monday=1, Sunday=7)
	hours: number;				// 0..23
	minutes: number;			// 0..59
	seconds: number;			// 0..59
	milliseconds: number;	// 0..999
}

const DAYS_PER_MONTH = [0, 31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31] as const;
const MONTH_DAYS_NORMAL = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31] as const;
const MONTH_DAYS_LEAP = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31] as const;
export const MS_PER_DAY = 86_400_000;
export const MS_PER_HOUR = 3_600_000;
export const MS_PER_MINUTE = 60_000;
export const MS_PER_SECOND = 1_000;

/**
 * Determines whether a given calendar year is a leap year in the Gregorian calendar.
 *
 * @param year - The full calendar year to test (e.g. 2024)
 * @returns `true` if the year is a leap year, otherwise `false`
 */
export function isLeapYear(year: number, isJulian: boolean = false): boolean {
	return (isJulian)
		// Julian calendar: leap year every 4 years
		? ((year % 4) + 4) % 4 === 0
		// Gregorian calendar rules
		: (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

/**
 * Returns the total number of days in the specified month of a given year (1-indexed month, 1..12).
 * Operates purely on integer arithmetic with zero Date allocations.
 *
 * @param year - The full calendar year (e.g. 2026)
 * @param month - The 1-indexed month number (1 for January through 12 for December)
 * @returns Total number of days in that month (28..31)
 */
export function getDaysInMonth(year: number, month: number, isJulian: boolean = false): number {
	if (month >= 1 && month <= 12) {
		if (month === 2) return isLeapYear(year, isJulian) ? 29 : 28;
		return DAYS_PER_MONTH[month];
	}
	const y = year + Math.floor((month - 1) / 12);
	const m = ((month - 1) % 12 + 12) % 12 + 1;

	if (m === 2) return isLeapYear(y, isJulian) ? 29 : 28;
	return DAYS_PER_MONTH[m];
}

/**
 * Shifts a Date by an exact number of 24-hour days (86,400,000 ms per day).
 *
 * @remarks
 * This function performs fixed-duration timestamp arithmetic in UTC.
 * It is non-mutating and allocation-light.
 *
 * **DST / Wall-Clock Warning:**
 * Because this applies a fixed 86,400,000 ms offset, it does NOT adjust for
 * Daylight Saving Time (DST) wall-clock shifts in local timezones (e.g. 23-hour
 * or 25-hour days). If wall-clock preservation across DST transitions in a
 * specific timezone is required, use timezone-aware calendar arithmetic
 * (such as Temporal or `tempo-fns`).
 *
 * @param date - The baseline Date instance
 * @param days - Number of 24-hour days to add (can be negative)
 * @returns A new Date instance offset by the specified number of 24-hour periods
 */
export function shiftDateByDays(date: Date, days: number): Date {
	return new Date(date.getTime() + days * MS_PER_DAY);
}

/**
 * Computes Unix epoch days (days since 1970-01-01) from proleptic Gregorian calendar components.
 * Pure integer arithmetic based on Howard Hinnant's Euclidean affine algorithms — zero heap allocations.
 *
 * @param year - Gregorian calendar year (e.g. 2026)
 * @param month - 1-indexed month (1..12)
 * @param day - 1-indexed day of month (1..31)
 * @returns Unix epoch days count
 */
export function civilToDays(year: number, month: number, day: number): number {
	if (month < 1 || month > 12) {
		const m = month - 1;
		year += Math.floor(m / 12);
		month = ((m % 12) + 12) % 12 + 1;
	}
	const y = year - (month <= 2 ? 1 : 0);
	const era = Math.floor(y / 400);
	const yoe = y - era * 400;
	const doy = Math.floor((153 * (month > 2 ? month - 3 : month + 9) + 2) / 5) + day - 1;
	const doe = yoe * 365 + Math.floor(yoe / 4) - Math.floor(yoe / 100) + doy;
	return era * 146097 + doe - 719468;
}

/**
 * Computes proleptic Gregorian calendar components from Unix epoch days.
 * Pure integer arithmetic based on Howard Hinnant's Euclidean affine algorithms — zero heap allocations.
 *
 * @param days - Unix epoch days count (days since 1970-01-01)
 * @returns Object containing `{ year, month, day }`
 */
export function daysToCivil(days: number): { year: number; month: number; day: number } {
	const z = days + 719468;
	const era = Math.floor(z / 146097);
	const doe = z - era * 146097;
	const yoe = Math.floor((doe - Math.floor(doe / 1460) + Math.floor(doe / 36524) - Math.floor(doe / 146096)) / 365);
	const y = yoe + era * 400;
	const doy = doe - (365 * yoe + Math.floor(yoe / 4) - Math.floor(yoe / 100));
	const mp = Math.floor((5 * doy + 2) / 153);
	const day = doy - Math.floor((153 * mp + 2) / 5) + 1;
	const month = mp < 10 ? mp + 3 : mp - 9;
	return { year: y + (month <= 2 ? 1 : 0), month, day };
}

/**
 * Computes 1-indexed ISO weekday (1=Monday, ..., 7=Sunday) from Unix epoch days.
 *
 * @param days - Unix epoch days count
 * @returns 1-indexed ISO weekday (1=Monday .. 7=Sunday)
 */
export function isoWeekdayFromDays(days: number): number {
	return ((days % 7) + 10) % 7 + 1;
}

/**
 * Computes Unix epoch milliseconds from structured 1-indexed calendar components and optional clock values.
 * Pure integer arithmetic with zero Date allocations.
 */
export function epochMsFromParts(
	year: number,
	month: number,
	day: number,
	hours = 0,
	minutes = 0,
	seconds = 0,
	milliseconds = 0
): number {
	const days = civilToDays(year, month, day);
	return (
		days * MS_PER_DAY +
		hours * MS_PER_HOUR +
		minutes * MS_PER_MINUTE +
		seconds * MS_PER_SECOND +
		milliseconds
	);
}

/**
 * Extracts structured UTC calendar and clock components from Unix epoch milliseconds.
 * Pure integer arithmetic with zero Date allocations.
 */
export function partsFromEpochMs(epochMs: number): UtcParts {
	const days = Math.floor(epochMs / MS_PER_DAY);
	let rem = epochMs - days * MS_PER_DAY;
	if (rem < 0) rem += MS_PER_DAY;

	const { year, month, day } = daysToCivil(days);
	const weekday = isoWeekdayFromDays(days);

	const hours = Math.floor(rem / MS_PER_HOUR);
	rem %= MS_PER_HOUR;
	const minutes = Math.floor(rem / MS_PER_MINUTE);
	rem %= MS_PER_MINUTE;
	const seconds = Math.floor(rem / MS_PER_SECOND);
	const milliseconds = rem % MS_PER_SECOND;

	return { year, month, day, weekday, hours, minutes, seconds, milliseconds };
}

/**
 * Structured calendar and clock options for creating a UTC Date instance.
 */
export interface UtcPartsOptions {
	year: number;
	month: number;					// 1-indexed (1..12)
	day: number;						// 1-indexed (1..31)
	hours?: number;					// 0..23 (default: 0)
	minutes?: number;				// 0..59 (default: 0)
	seconds?: number;				// 0..59 (default: 0)
	milliseconds?: number;	// 0..999 (default: 0)
}

/** Type alias for UtcPartsOptions. */
export type UtcDateOptions = UtcPartsOptions;

/**
 * Creates a UTC Date instance from structured 1-indexed calendar components and optional clock values.
 * Inverse of `partsFromEpochMs`.
 *
 * @param parts - Structured calendar components containing year, month, day, and optional clock components
 * @returns A new UTC Date instance
 */
export function fromUtcParts(parts: UtcPartsOptions): Date {
	const {
		year,
		month,
		day,
		hours = 0,
		minutes = 0,
		seconds = 0,
		milliseconds = 0,
	} = parts;
	return new Date(epochMsFromParts(year, month, day, hours, minutes, seconds, milliseconds));
}

/**
 * Validates whether a given year, 1-indexed month, and day constitute a valid calendar date in the Gregorian calendar.
 * Pure integer arithmetic with zero Date allocations.
 *
 * @param year - The full calendar year (e.g. 2026)
 * @param month - The 1-indexed month number (1..12)
 * @param day - The 1-indexed day of the month (1..31)
 * @returns `true` if the year, month, and day represent a valid date, otherwise `false`
 */
export function isValidDate(year: number, month: number, day: number): boolean {
	if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) return false;
	if (month < 1 || month > 12 || day < 1) return false;
	return day <= getDaysInMonth(year, month);
}

/**
 * Returns a new Date instance with updated UTC calendar or clock fields applied to the given date.
 * Non-mutating (pure copy-on-write).
 *
 * @param date - The source Date instance
 * @param parts - Partial UTC parts to overwrite on the source date
 * @returns A new UTC Date instance with the specified parts updated
 */
export function withUtcParts(date: Date, parts: Partial<UtcPartsOptions>): Date {
	const current = partsFromEpochMs(date.getTime());
	return fromUtcParts({ ...current, ...parts });
}

/**
 * Resolves 1-indexed day-of-year (1..366) to month (1..12) and day (1..31) using pure integer arithmetic.
 * Returns undefined for a day outside the given year, including day 366 in a non-leap year.
 */
export function resolveDayOfYear(year: number, dayOfYear: number): { month: number; day: number } | undefined {
	const leap = isLeapYear(year);
	const maxDays = leap ? 366 : 365;
	if (dayOfYear < 1 || dayOfYear > maxDays) return undefined;
	const days = leap ? MONTH_DAYS_LEAP : MONTH_DAYS_NORMAL;
	let rem = dayOfYear;
	for (let m = 0; m < 12; m++) {
		if (rem <= days[m])
			return { month: m + 1, day: rem };

		rem -= days[m];
	}
	return undefined;
}

/**
 * Returns numeric week and week-year fields when both are supplied; otherwise computes them
 * from the Gregorian year, month, and day using standard ISO 8601 rules.
 * Pure integer arithmetic — zero Date allocations.
 */
export function getIsoWeek(z: { year: number; month: number; day: number; weekOfYear?: number | undefined; yearOfWeek?: number | undefined }): { weekOfYear: number; yearOfWeek: number } {
	if (typeof z.weekOfYear === 'number' && typeof z.yearOfWeek === 'number') {
		return { weekOfYear: z.weekOfYear, yearOfWeek: z.yearOfWeek };
	}
	const targetDays = civilToDays(z.year, z.month, z.day);
	const weekday = isoWeekdayFromDays(targetDays);
	const thurDays = targetDays + 4 - weekday;
	const thurCivil = daysToCivil(thurDays);
	const yearOfWeek = thurCivil.year;
	const yearStartDays = civilToDays(yearOfWeek, 1, 1);
	const weekOfYear = Math.floor((thurDays - yearStartDays) / 7) + 1;
	return { weekOfYear, yearOfWeek };
}

/**
 * Resolves an ISO week date (isoYear, isoWeek, isoDay) into calendar year, month, and day.
 * `isoDay` uses Monday=1 through Sunday=7 and defaults to Monday.
 * Out-of-range week and day values roll into adjacent dates rather than being rejected.
 * Pure integer arithmetic — zero Date allocations.
 */
export function fromIsoWeek(isoYear: number, isoWeek: number, isoDay: number = 1): { year: number; month: number; day: number } {
	const jan4Days = civilToDays(isoYear, 1, 4);
	const jan4DayOfWeek = isoWeekdayFromDays(jan4Days);
	const week1MondayDays = jan4Days - (jan4DayOfWeek - 1);
	const targetDays = week1MondayDays + (isoWeek - 1) * 7 + (isoDay - 1);
	return daysToCivil(targetDays);
}

/**
 * Resolves the calendar year corresponding to an ISO week-numbering year
 * for a specified month and day, testing adjacent calendar-year candidates.
 * Uses expectedDayOfWeek (1=Monday..7=Sunday) to disambiguate when available,
 * and rejects ambiguous dates that match multiple candidate years without weekday disambiguation.
 * Pure integer arithmetic — zero Date allocations.
 *
 * @param targetIsoYear - The ISO week-numbering year
 * @param month - The 1-indexed calendar month (1..12)
 * @param day - The 1-indexed calendar day (1..31)
 * @param expectedDayOfWeek - Optional 1-indexed ISO weekday (1=Monday..7=Sunday)
 * @returns The resolved calendar year, or undefined if invalid or ambiguous
 */
export function resolveIsoCalendarYear(
	targetIsoYear: number,
	month: number,
	day: number,
	expectedDayOfWeek?: number,
): number | undefined {
	const candidates =
		month === 12 && day >= 29
			? [targetIsoYear, targetIsoYear - 1]
			: month === 1 && day <= 3
				? [targetIsoYear, targetIsoYear + 1]
				: [targetIsoYear];

	const matching: number[] = [];

	for (const y of candidates) {
		if (!isValidDate(y, month, day)) continue;
		if (getIsoWeek({ year: y, month, day }).yearOfWeek !== targetIsoYear) continue;
		const targetDays = civilToDays(y, month, day);
		const dayOfWeek = isoWeekdayFromDays(targetDays);
		if (expectedDayOfWeek !== undefined && dayOfWeek !== expectedDayOfWeek) continue;
		matching.push(y);
	}

	return (matching.length === 1)
		? matching[0]
		: undefined;
}

/**
 * Julian Day Number at Unix Epoch (1970-01-01T00:00:00Z).
 */
export const EPOCH_JULIAN_DAY = 2_440_588;

/**
 * Computes the integer Julian Day Number for a Gregorian calendar date.
 * Accepts discrete year, month, and day integers (1-indexed month, 1..12).
 *
 * @param year - Gregorian calendar year (e.g. 2026)
 * @param month - 1-indexed month (1..12)
 * @param day - 1-indexed day of month (1..31)
 * @returns Integer Julian Day Number (e.g. 2440588 for 1970-01-01)
 */
export function toJulianDay(year: number, month: number, day: number): number;

/**
 * Computes the integer Julian Day Number for a date.
 * Accepts a native JavaScript Date (UTC), a Temporal date-time object,
 * or any object containing `{ year, month, day }` components.
 *
 * @param date - Date instance or Temporal-compatible date object with `{ year, month, day }`
 * @returns Integer Julian Day Number (e.g. 2440588 for 1970-01-01)
 */
export function toJulianDay(date: Date | { year: number; month: number; day: number }): number;

export function toJulianDay(
	arg1: number | Date | { year: number; month: number; day: number },
	arg2?: number,
	arg3?: number,
): number {
	let year: number, month: number, day: number;

	if (isNumber(arg1)) {
		year = arg1;
		month = arg2!;
		day = arg3!;
	} else if (isDate(arg1)) {
		year = arg1.getUTCFullYear();
		month = arg1.getUTCMonth() + 1;
		day = arg1.getUTCDate();
	} else {
		year = arg1.year;
		month = arg1.month;
		day = arg1.day;
	}

	return civilToDays(year, month, day) + EPOCH_JULIAN_DAY;
}


