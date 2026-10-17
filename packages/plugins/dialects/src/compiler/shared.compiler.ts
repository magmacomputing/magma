import { isLeapYear, toPlainDate, toZonedDateTime, getDaysInMonth } from '@magmacomputing/tempo/library';
import { enums, Enum } from '@magmacomputing/tempo/support';

export { isLeapYear, toPlainDate, toZonedDateTime, getDaysInMonth };

export type FormatterFn = (zdt: Temporal.ZonedDateTime) => string;

export interface ParseOptions {
	dialect?: any;
	timeZone?: any;
	calendar?: any;
	today?: Temporal.ZonedDateTime | undefined;
	[key: string]: any;
}

export interface ParseContext {
	tz: string;
	today: Temporal.ZonedDateTime;
	cal: string;
}

export interface ParsedTime {
	hour: number;
	minute: number;
	second: number;
}

export const REGEX_ESCAPE = /[.*+?^${}()|[\]\\]/g;
export const REGEX_DOT = /\./g;
const RE_OFFSET_WITH_SECONDS = /^[+-]\d{2}:\d{2}:\d{2}$/;
const RE_OFFSET_COMPACT_SECONDS = /^[+-]\d{6}$/;

/** Escapes special regex characters in a literal string. */
export function escapeRegex(str: string): string {
	return str.replace(REGEX_ESCAPE, '\\$&');
}

/** Resolves an English month name or abbreviation to its month number. */
export function resolveMonth(str: string): number | undefined {
	const cap = str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
	return Enum.get(enums.MONTH, cap)
		?? Enum.get(enums.MONTHS, cap)
		?? Enum.get(enums.MONTH, cap.slice(0, 3));
}

/** Creates a helper to extract named groups from a RegExpExecArray, including suffixed groups. */
export function createGroupExtractor(match: RegExpExecArray): (name: string) => string | undefined {
	const g = match.groups ?? {};
	return (name: string) => g[name] ?? Object.entries(g).find(([k, v]) => (k === name || k.startsWith(`${name}_`)) && v !== undefined)?.[1];
}

/**
 * Resolves parser defaults, preferring a parsed offset over a parsed zone name and `options.timeZone`.
 * Defaults to UTC and the iso8601 calendar. Uses `options.today` as-is, or reads the current date in the resolved zone.
 * Returns undefined if that current-date lookup fails or an offset includes nonzero seconds.
 * A supplied `today` bypasses time zone validation here; calendar validation is left to the caller.
 */
export function resolveParseContext(
	getGroup: (name: string) => string | undefined,
	options: ParseOptions = {}
): ParseContext | undefined {
	let tz = options.timeZone ?? 'UTC';
	const tz_offset = getGroup('tz_offset');
	const tz_name = getGroup('tz_name');
	if (tz_offset) {
		let norm = tz_offset.toUpperCase() === 'Z' ? 'UTC' : tz_offset;
		if (RE_OFFSET_WITH_SECONDS.test(norm)) {
			if (!norm.endsWith(':00')) return undefined;
			norm = norm.slice(0, 6);
		} else if (RE_OFFSET_COMPACT_SECONDS.test(norm)) {
			if (!norm.endsWith('00')) return undefined;
			norm = norm.slice(0, 5);
		}
		tz = norm;
	} else if (tz_name) {
		tz = tz_name;
	}

	let today: Temporal.ZonedDateTime;
	if (options.today) {
		today = options.today;
	} else {
		try {
			today = Temporal.Now.zonedDateTimeISO(tz);
		} catch {
			return undefined;
		}
	}

	const cal = options.calendar ?? 'iso8601';
	return { tz, today, cal };
}

/**
 * Parses and validates hour, minute, second, and meridiem markers from matched groups.
 * Missing fields default to zero. The `h24` range is 1-24; 24 becomes midnight without advancing the date.
 * Returns undefined if any component is out of valid range.
 */
export function resolveTimeComponents(getGroup: (name: string) => string | undefined): ParsedTime | undefined {
	let hour = 0;
	let minute = 0;
	let second = 0;

	const hh = getGroup('hh')?.trim();
	const h24 = getGroup('h24')?.trim();
	const h12 = getGroup('h12')?.trim();
	if (hh) {
		const val = parseInt(hh, 10);
		if (val < 0 || val > 23) return undefined;
		hour = val;
	} else if (h24) {
		const val = parseInt(h24, 10);
		if (val < 1 || val > 24) return undefined;
		hour = val === 24 ? 0 : val;
	} else if (h12) {
		const val = parseInt(h12, 10);
		if (val < 1 || val > 12) return undefined;
		hour = val;
	}

	const mer = getGroup('mer');
	if (mer) {
		const clean = mer.replace(REGEX_DOT, '').toLowerCase();
		const isPm = clean.startsWith('p');
		if (isPm && hour < 12) hour += 12;
		else if (!isPm && hour === 12) hour = 0;
	}

	const mi = getGroup('mi');
	if (mi) {
		const val = parseInt(mi, 10);
		if (val < 0 || val > 59) return undefined;
		minute = val;
	}

	const ss = getGroup('ss');
	if (ss) {
		const val = parseInt(ss, 10);
		if (val < 0 || val > 59) return undefined;
		second = val;
	}

	return { hour, minute, second };
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
 * from the Gregorian year, month, and day.
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
 * Resolves calendar year for IYYY-MM-DD format strings near ISO year boundaries.
 */
export function resolveIsoCalendarYear(targetIsoYear: number, month: number, day: number): number {
	if (month === 12 && day >= 29) {
		if (getIsoWeek({ year: targetIsoYear - 1, month, day }).yearOfWeek === targetIsoYear)
			return targetIsoYear - 1;
	} else if (month === 1 && day <= 3) {
		if (getIsoWeek({ year: targetIsoYear + 1, month, day }).yearOfWeek === targetIsoYear)
			return targetIsoYear + 1;
	}
	return targetIsoYear;
}
