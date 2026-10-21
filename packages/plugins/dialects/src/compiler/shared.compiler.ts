import {
	Enum,
	isNumber,
	getIsoWeek,
} from '@magmacomputing/tempo/library';
import { enums } from '@magmacomputing/tempo/support';

export type FormatterFn = (zdt: Temporal.ZonedDateTime) => string;

export interface DialectOptions {
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
	pivot: number;
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
	return Enum.get(enums.MONTH, cap) ?? Enum.get(enums.MONTHS, cap);
}

/** Resolves an English weekday name or abbreviation to its ISO weekday number (1 = Monday, 7 = Sunday). */
export function resolveWeekday(str: string): number | undefined {
	const cap = str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
	const val = Enum.get(enums.WEEKDAY, cap) ?? Enum.get(enums.WEEKDAYS, cap);
	return typeof val === 'number' && val >= 1 && val <= 7 ? val : undefined;
}

/**
 * Calculates the Sunday-based week of the year (00-53), where week 1 begins on the first Sunday.
 * Days before the first Sunday of the year are considered week 0.
 */
export function getSundayBasedWeek(_year: number, dayOfYear: number, dayOfWeek: number): number {
	const yday = dayOfYear - 1;
	const wdaySun = dayOfWeek % 7; // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
	return Math.floor((yday + 7 - wdaySun) / 7);
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
	options: DialectOptions = {}
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
		const m = tz_name.match(/^GMT([+-])(\d{1,2})(?::?(\d{2}))?$/i);
		if (m) {
			const sign = m[1];
			const hours = m[2].padStart(2, '0');
			const mins = m[3] ? m[3] : '00';
			tz = `${sign}${hours}:${mins}`;
		} else {
			tz = tz_name;
		}
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
	const pivot = isNumber(options.pivot) ? options.pivot : 75;
	return { tz, today, cal, pivot };
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
		if (isNaN(val) || val < 0 || val > 23) return undefined;
		hour = val;
	} else if (h24) {
		const val = parseInt(h24, 10);
		if (isNaN(val) || val < 1 || val > 24) return undefined;
		hour = val === 24 ? 0 : val;
	} else if (h12) {
		const val = parseInt(h12, 10);
		if (isNaN(val) || val < 1 || val > 12) return undefined;
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
		if (isNaN(val) || val < 0 || val > 59) return undefined;
		minute = val;
	}

	const ss = getGroup('ss');
	if (ss) {
		const val = parseInt(ss, 10);
		if (isNaN(val) || val < 0 || val > 59) return undefined;
		second = val;
	}

	return { hour, minute, second };
}

export interface ParsedDateFields {
	year: number;
	month: number;
	day: number;
	hour?: number;
	minute?: number;
	second?: number;
	millisecond?: number;
	microsecond?: number;
	nanosecond?: number;
}

/**
 * Constructs a Temporal.ZonedDateTime with the parsed Gregorian fields using the ISO calendar,
 * then converts it to ctx.cal with withCalendar when needed.
 * Returns undefined if date construction fails or overflow occurs.
 */
export function buildParsedZonedDateTime(
	fields: ParsedDateFields,
	ctx: ParseContext,
): Temporal.ZonedDateTime | undefined {
	try {
		const isoZdt = Temporal.ZonedDateTime.from(
			{
				timeZone: ctx.tz,
				calendar: 'iso8601',
				year: fields.year,
				month: fields.month,
				day: fields.day,
				hour: fields.hour ?? 0,
				minute: fields.minute ?? 0,
				second: fields.second ?? 0,
				millisecond: fields.millisecond ?? 0,
				microsecond: fields.microsecond ?? 0,
				nanosecond: fields.nanosecond ?? 0,
			},
			{ overflow: 'reject' }
		);
		return ctx.cal === 'iso8601' ? isoZdt : isoZdt.withCalendar(ctx.cal);
	} catch {
		return undefined;
	}
}

export interface ExtractedDateMetadata {
	expectedDayOfWeek?: number | undefined;
	expectedDayOfYear?: number | undefined;
	expectedDaysInMonth?: number | undefined;
	expectedQuarter?: number | undefined;
	expectedIsoWeek?: number | undefined;
	expectedIsoYear?: number | undefined;
	expectedWeekU?: number | undefined;
	expectedWeekW?: number | undefined;
	expectedIsLeap?: number | undefined;
}

/**
 * Validates auxiliary or redundant date fields against a resolved calendar date.
 * Accepts either an existing Temporal.PlainDate or { year, month, day }.
 * Returns false if date construction rejects (e.g. invalid day of month) or
 * if any auxiliary field contradicts the resolved date.
 */
export function validateResolvedDateFields(
	date: Temporal.PlainDate | { year: number; month: number; day: number },
	meta: ExtractedDateMetadata,
): boolean {
	let plainDate: Temporal.PlainDate;
	try {
		plainDate = date instanceof Temporal.PlainDate
			? date
			: Temporal.PlainDate.from(date, { overflow: 'reject' });
	} catch {
		return false;
	}

	if (meta.expectedDayOfWeek !== undefined && plainDate.dayOfWeek !== meta.expectedDayOfWeek)
		return false;

	if (meta.expectedDayOfYear !== undefined && plainDate.dayOfYear !== meta.expectedDayOfYear)
		return false;

	if (meta.expectedDaysInMonth !== undefined && plainDate.daysInMonth !== meta.expectedDaysInMonth)
		return false;

	if (meta.expectedQuarter !== undefined) {
		const q = Math.ceil(plainDate.month / 3);
		if (q !== meta.expectedQuarter) return false;
	}
	if (meta.expectedIsoWeek !== undefined || meta.expectedIsoYear !== undefined) {
		const iso = getIsoWeek(plainDate);
		if (meta.expectedIsoWeek !== undefined && iso.weekOfYear !== meta.expectedIsoWeek)
			return false;
		if (meta.expectedIsoYear !== undefined && iso.yearOfWeek !== meta.expectedIsoYear)
			return false;
	}
	if (meta.expectedWeekU !== undefined) {
		const u = getSundayBasedWeek(plainDate.year, plainDate.dayOfYear, plainDate.dayOfWeek);
		if (u !== meta.expectedWeekU) return false;
	}
	if (meta.expectedWeekW !== undefined) {
		const wM = plainDate.dayOfWeek - 1;
		const w = Math.floor((plainDate.dayOfYear - 1 - wM + 7) / 7);
		if (w !== meta.expectedWeekW) return false;
	}
	if (meta.expectedIsLeap !== undefined) {
		const isLeap = plainDate.inLeapYear ? 1 : 0;
		if (isLeap !== meta.expectedIsLeap) return false;
	}
	return true;
}

