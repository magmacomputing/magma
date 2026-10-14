import { enums, Enum } from '@magmacomputing/tempo/support';

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
	return (name: string) => g[name] ?? Object.entries(g).find(([k]) => k === name || k.startsWith(`${name}_`))?.[1];
}

/**
 * Resolves timezone, calendar, and today ZonedDateTime safely from options and parsed timezone tokens.
 * Returns undefined if an invalid timezone is encountered.
 */
export function resolveParseContext(
	getGroup: (name: string) => string | undefined,
	options: ParseOptions = {}
): ParseContext | undefined {
	let tz = options.timeZone ?? 'UTC';
	const tz_offset = getGroup('tz_offset');
	const tz_name = getGroup('tz_name');
	if (tz_offset) {
		tz = tz_offset.toUpperCase() === 'Z' ? 'UTC' : tz_offset;
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
 * Returns undefined if any component is out of valid range.
 */
export function resolveTimeComponents(getGroup: (name: string) => string | undefined): ParsedTime | undefined {
	let hour = 0;
	let minute = 0;
	let second = 0;

	const hh = getGroup('hh');
	const h24 = getGroup('h24');
	const h12 = getGroup('h12');
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
