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

/**
 * Extracts all UTC calendar and clock components from a Date instance as a structured object.
 * Month and weekday are 1-indexed (1 for January, 1 for Monday through 7 for Sunday).
 * Defaults to current timestamp (`new Date()`) if no date is provided.
 *
 * @param date - Optional Date instance to inspect (defaults to `new Date()`)
 * @returns An object containing `{ year, month, day, weekday, hours, minutes, seconds, milliseconds }`
 */
export function getUtcParts(date: Date = new Date()): UtcParts {
	return {
		year: date.getUTCFullYear(),
		month: date.getUTCMonth() + 1,
		day: date.getUTCDate(),
		weekday: date.getUTCDay() || DAY_MAP.SUN,
		hours: date.getUTCHours(),
		minutes: date.getUTCMinutes(),
		seconds: date.getUTCSeconds(),
		milliseconds: date.getUTCMilliseconds(),
	}
}

/**
 * Returns the total number of days in the specified month of a given year (1-indexed month, 1..12).
 *
 * @param year - The full calendar year (e.g. 2026)
 * @param month - The 1-indexed month number (1 for January through 12 for December)
 * @returns Total number of days in that month (28..31)
 */
export function getDaysInMonth(year: number, month: number): number {
	return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/**
 * Determines whether a given calendar year is a leap year in the Gregorian calendar.
 *
 * @param year - The full calendar year to test (e.g. 2024)
 * @returns `true` if the year is a leap year, otherwise `false`
 */
export function isLeapYear(year: number): boolean {
	return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
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
 * Inverse of `getUtcParts`.
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
	const d = new Date(0);
	d.setUTCFullYear(year, month - 1, day);
	d.setUTCHours(hours, minutes, seconds, milliseconds);
	return d;
}

/**
 * Validates whether a given year, 1-indexed month, and day constitute a valid calendar date in the Gregorian calendar.
 *
 * @param year - The full calendar year (e.g. 2026)
 * @param month - The 1-indexed month number (1..12)
 * @param day - The 1-indexed day of the month (1..31)
 * @returns `true` if the year, month, and day represent a valid date, otherwise `false`
 */
export function isValidDate(year: number, month: number, day: number): boolean {
	if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) return false;
	if (month < 1 || month > 12 || day < 1) return false;
	const d = new Date(0);
	d.setUTCFullYear(year, month - 1, day);
	return d.getUTCFullYear() === year && d.getUTCMonth() === month - 1 && d.getUTCDate() === day;
}

/**
 * Adds an integer number of days to a Date in UTC, returning a new Date instance.
 *
 * @param date - The baseline Date instance
 * @param days - Number of days to add (can be negative)
 * @returns A new Date instance offset by the specified number of days
 */
export function addUtcDays(date: Date, days: number): Date {
	const result = new Date(date.getTime());
	result.setUTCDate(result.getUTCDate() + days);
	return result;
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
	const current = getUtcParts(date);
	return fromUtcParts({ ...current, ...parts });
}

const MONTH_DAYS_NORMAL = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
const MONTH_DAYS_LEAP = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

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
		if (rem <= days[m]) {
			return { month: m + 1, day: rem };
		}
		rem -= days[m];
	}
	return undefined;
}

/**
 * Returns numeric week and week-year fields when both are supplied; otherwise computes them
 * from the Gregorian year, month, and day using standard ISO 8601 rules.
 */
export function getIsoWeek(z: { year: number; month: number; day: number; weekOfYear?: number | undefined; yearOfWeek?: number | undefined }): { weekOfYear: number; yearOfWeek: number } {
	if (typeof z.weekOfYear === 'number' && typeof z.yearOfWeek === 'number') {
		return { weekOfYear: z.weekOfYear, yearOfWeek: z.yearOfWeek };
	}
	const d = new Date(Date.UTC(z.year, z.month - 1, z.day));
	d.setUTCFullYear(z.year);
	const dayNum = d.getUTCDay() || 7;
	d.setUTCDate(d.getUTCDate() + 4 - dayNum);
	const yearOfWeek = d.getUTCFullYear();
	const yearStart = new Date(Date.UTC(yearOfWeek, 0, 1));
	yearStart.setUTCFullYear(yearOfWeek);
	const weekOfYear = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
	return { weekOfYear, yearOfWeek };
}

/**
 * Resolves an ISO week date (isoYear, isoWeek, isoDay) into calendar year, month, and day
 * using lightweight UTC Date calculations. `isoDay` uses Monday=1 through Sunday=7 and defaults to Monday.
 * Out-of-range week and day values roll into adjacent dates rather than being rejected.
 */
export function fromIsoWeek(isoYear: number, isoWeek: number, isoDay: number = 1): { year: number; month: number; day: number } {
	const jan4 = new Date(Date.UTC(isoYear, 0, 4));
	jan4.setUTCFullYear(isoYear);
	const dayOfWeek = jan4.getUTCDay() || 7;
	const week1MondayTime = jan4.getTime() - (dayOfWeek - 1) * 86400000;
	const targetTime = week1MondayTime + ((isoWeek - 1) * 7 + (isoDay - 1)) * 86400000;
	const target = new Date(targetTime);
	return { year: target.getUTCFullYear(), month: target.getUTCMonth() + 1, day: target.getUTCDate() };
}

/**
 * Resolves the calendar year corresponding to an ISO week-numbering year
 * for a specified month and day, testing adjacent calendar-year candidates.
 * Uses expectedDayOfWeek (1=Monday..7=Sunday) to disambiguate when available,
 * and rejects ambiguous dates that match multiple candidate years without weekday disambiguation.
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
		try {
			if (typeof Temporal !== 'undefined' && Temporal.PlainDate) {
				const plainDate = Temporal.PlainDate.from({ year: y, month, day }, { overflow: 'reject' });
				if (getIsoWeek(plainDate).yearOfWeek !== targetIsoYear) continue;
				if (expectedDayOfWeek !== undefined && plainDate.dayOfWeek !== expectedDayOfWeek) continue;
				matching.push(y);
			} else {
				const d = new Date(0);
				d.setUTCFullYear(y, month - 1, day);
				if (d.getUTCFullYear() !== y || d.getUTCMonth() + 1 !== month || d.getUTCDate() !== day) continue;
				if (getIsoWeek({ year: y, month, day }).yearOfWeek !== targetIsoYear) continue;
				const dayOfWeek = d.getUTCDay() || 7;
				if (expectedDayOfWeek !== undefined && dayOfWeek !== expectedDayOfWeek) continue;
				matching.push(y);
			}
		} catch {
			continue;
		}
	}

	return (matching.length === 1)
		? matching[0]
		: undefined;
}

